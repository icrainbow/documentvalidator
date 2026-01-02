/**
 * Flow2: File-based Checkpoint Store
 * 
 * Persists graph execution checkpoints to local file system.
 */

import fs from 'fs/promises';
import path from 'path';
import type { Flow2Checkpoint, CheckpointMetadata } from './checkpointTypes';

const CHECKPOINT_DIR = path.join(process.cwd(), '.local', 'flow2-checkpoints');
const TOKEN_INDEX_PATH = path.join(CHECKPOINT_DIR, '_token_index.json');

// ========== Token Index Management (Phase 1.5) ==========

interface TokenIndex {
  // Backward compatible: accepts string (legacy) or object (new)
  [token: string]: string | { run_id: string; type: 'stage1' | 'edd' };
}

/**
 * Load token index from file
 */
async function loadTokenIndex(): Promise<TokenIndex> {
  try {
    const content = await fs.readFile(TOKEN_INDEX_PATH, 'utf-8');
    return JSON.parse(content) as TokenIndex;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {}; // Index doesn't exist yet
    }
    console.error('[CheckpointStore] Failed to load token index:', error);
    return {};
  }
}

/**
 * Save token index to file (atomic write)
 */
async function saveTokenIndex(index: TokenIndex): Promise<void> {
  await ensureCheckpointDir();
  const tempPath = `${TOKEN_INDEX_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(index, null, 2), 'utf-8');
  await fs.rename(tempPath, TOKEN_INDEX_PATH);
}

/**
 * Get run_id by approval token
 */
export async function getRunIdByToken(token: string): Promise<string | null> {
  if (!token || typeof token !== 'string' || token.length !== 32) {
    return null;
  }
  
  const index = await loadTokenIndex();
  const entry = index[token];
  
  // Backward compatible: handle legacy string or new object format
  if (typeof entry === 'string') {
    return entry; // Legacy format
  } else if (entry && typeof entry === 'object' && entry.run_id) {
    return entry.run_id; // New format
  }
  
  return null;
}

/**
 * Get token metadata (type) if available
 */
export async function getTokenMetadata(token: string): Promise<{ run_id: string; type: 'stage1' | 'edd' } | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }
  
  const index = await loadTokenIndex();
  const entry = index[token];
  
  if (typeof entry === 'string') {
    // Legacy format: assume stage1
    return { run_id: entry, type: 'stage1' };
  } else if (entry && typeof entry === 'object' && entry.run_id) {
    return entry;
  }
  
  return null;
}

/**
 * Load checkpoint by approval token (convenience helper)
 */
export async function loadCheckpointByToken(token: string): Promise<Flow2Checkpoint | null> {
  const run_id = await getRunIdByToken(token);
  if (!run_id) {
    return null;
  }
  
  return await loadCheckpoint(run_id);
}


/**
 * Ensure checkpoint directory exists
 */
async function ensureCheckpointDir(): Promise<void> {
  try {
    await fs.mkdir(CHECKPOINT_DIR, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Get checkpoint file path
 */
function getCheckpointPath(run_id: string): string {
  // Basic UUID v4 validation to prevent path traversal
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(run_id)) {
    throw new Error(`Invalid run_id format: ${run_id}`);
  }
  return path.join(CHECKPOINT_DIR, `${run_id}.json`);
}

/**
 * Save checkpoint to file system
 */
export async function saveCheckpoint(checkpoint: Flow2Checkpoint): Promise<void> {
  await ensureCheckpointDir();
  
  const filePath = getCheckpointPath(checkpoint.run_id);
  const tempPath = `${filePath}.tmp`;
  
  // Atomic write: write to temp file, then rename
  await fs.writeFile(tempPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
  
  // Phase 1.5: Update token index if approval_token exists (stage 1)
  if (checkpoint.approval_token) {
    try {
      const index = await loadTokenIndex();
      index[checkpoint.approval_token] = { run_id: checkpoint.run_id, type: 'stage1' };
      await saveTokenIndex(index);
    } catch (error) {
      console.error('[CheckpointStore] Failed to update token index (stage1):', error);
      // Non-critical: checkpoint is saved, index update failed
    }
  }
  
  // NEW: Index EDD token if present (stage 2)
  if (checkpoint.edd_stage?.approval_token) {
    try {
      const index = await loadTokenIndex();
      index[checkpoint.edd_stage.approval_token] = { run_id: checkpoint.run_id, type: 'edd' };
      await saveTokenIndex(index);
    } catch (error) {
      console.error('[CheckpointStore] Failed to update token index (edd):', error);
      // Non-critical
    }
  }
}

/**
 * Load checkpoint from file system
 */
export async function loadCheckpoint(run_id: string): Promise<Flow2Checkpoint | null> {
  try {
    const filePath = getCheckpointPath(run_id);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Flow2Checkpoint;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null; // Checkpoint doesn't exist
    }
    throw error;
  }
}

/**
 * Update checkpoint status and optional fields
 */
export async function updateCheckpointStatus(
  run_id: string,
  status: Flow2Checkpoint['status'],
  updates?: Partial<Flow2Checkpoint>
): Promise<void> {
  const checkpoint = await loadCheckpoint(run_id);
  if (!checkpoint) {
    throw new Error(`Checkpoint not found: ${run_id}`);
  }
  
  const updatedCheckpoint: Flow2Checkpoint = {
    ...checkpoint,
    ...updates,
    status
  };
  
  await saveCheckpoint(updatedCheckpoint);
}

/**
 * List all checkpoints (metadata only)
 */
export async function listCheckpoints(): Promise<CheckpointMetadata[]> {
  try {
    await ensureCheckpointDir();
    const files = await fs.readdir(CHECKPOINT_DIR);
    const checkpointFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.tmp'));
    
    const metadataList: CheckpointMetadata[] = [];
    
    for (const file of checkpointFiles) {
      try {
        const content = await fs.readFile(path.join(CHECKPOINT_DIR, file), 'utf-8');
        const checkpoint = JSON.parse(content) as Flow2Checkpoint;
        
        metadataList.push({
          run_id: checkpoint.run_id,
          status: checkpoint.status,
          paused_at_node_id: checkpoint.paused_at_node_id,
          paused_reason: 'Awaiting human decision', // Default
          document_count: checkpoint.documents.length,
          created_at: checkpoint.created_at,
          paused_at: checkpoint.paused_at
        });
      } catch (error) {
        // Skip invalid files
        console.error(`Failed to parse checkpoint file ${file}:`, error);
      }
    }
    
    return metadataList;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // Directory doesn't exist yet
    }
    throw error;
  }
}

/**
 * Delete checkpoint
 */
export async function deleteCheckpoint(run_id: string): Promise<void> {
  try {
    const filePath = getCheckpointPath(run_id);
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Already deleted, no-op
      return;
    }
    throw error;
  }
}


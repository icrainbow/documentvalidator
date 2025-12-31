/**
 * Phase 4: Draft Store - File System Operations
 * 
 * Stores graph drafts under .local/graph-drafts (NOT in app/lib)
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { GraphDefinition } from './types';

export interface DraftMetadata {
  draftId: string;
  createdAt: string;
  createdBy: string;
  baseVersion: string;
  baseChecksum: string;
}

export interface DraftFile {
  draft: GraphDefinition;
  metadata: DraftMetadata;
}

/**
 * Get draft directory path (.local/graph-drafts)
 */
function getDraftDir(): string {
  return path.join(process.cwd(), '.local/graph-drafts');
}

/**
 * Ensure draft directory exists
 */
export function ensureDraftDir(): void {
  const dir = getDraftDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate safe file path for draft (no path traversal)
 * Validates draftId is UUID v4 format
 */
function getDraftPath(draftId: string): string {
  // UUID v4 regex validation (security: prevent path traversal)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(draftId)) {
    throw new Error('Invalid draftId format (must be UUID v4)');
  }
  
  const dir = getDraftDir();
  return path.join(dir, `flow2GraphDraft.${draftId}.json`);
}

/**
 * Save draft to file system (atomic write: temp + rename)
 * 
 * @returns Relative file path from project root
 */
export function saveDraft(
  draftId: string,
  draft: GraphDefinition,
  base: { version: string; checksum: string }
): string {
  ensureDraftDir();
  
  const draftFile: DraftFile = {
    draft,
    metadata: {
      draftId,
      createdAt: new Date().toISOString(),
      createdBy: 'local-dev',
      baseVersion: base.version,
      baseChecksum: base.checksum
    }
  };
  
  const filePath = getDraftPath(draftId);
  const tempPath = path.join(getDraftDir(), `.tmp-${randomUUID()}.json`);
  
  // Atomic write: temp file + rename
  fs.writeFileSync(tempPath, JSON.stringify(draftFile, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
  
  // Return relative path
  const relativePath = path.relative(process.cwd(), filePath);
  return relativePath;
}


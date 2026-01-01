/**
 * Flow2: Checkpoint Validation
 * 
 * Validates checkpoint data structure and freshness.
 */

import type { Flow2Checkpoint, CheckpointStatus } from './checkpointTypes';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_STATUSES: CheckpointStatus[] = ['paused', 'resumed', 'completed', 'failed'];

export interface ValidationResult {
  ok: boolean;
  errors?: string[];
  checkpoint?: Flow2Checkpoint;
}

/**
 * Validate checkpoint structure
 */
export function validateCheckpoint(data: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { ok: false, errors: ['Checkpoint data must be an object'] };
  }
  
  const checkpoint = data as any;
  
  // Validate run_id
  if (!checkpoint.run_id || typeof checkpoint.run_id !== 'string') {
    errors.push('run_id is required and must be a string');
  } else if (!UUID_V4_REGEX.test(checkpoint.run_id)) {
    errors.push('run_id must be a valid UUID v4');
  }
  
  // Validate flow
  if (checkpoint.flow !== 'flow2') {
    errors.push('flow must be "flow2"');
  }
  
  // Validate status
  if (!checkpoint.status || !VALID_STATUSES.includes(checkpoint.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  
  // Validate node IDs
  if (!checkpoint.current_node_id || typeof checkpoint.current_node_id !== 'string') {
    errors.push('current_node_id is required and must be a string');
  }
  
  if (!checkpoint.paused_at_node_id || typeof checkpoint.paused_at_node_id !== 'string') {
    errors.push('paused_at_node_id is required and must be a string');
  }
  
  // Validate timestamps
  if (!checkpoint.created_at || !isValidISOTimestamp(checkpoint.created_at)) {
    errors.push('created_at must be a valid ISO timestamp');
  }
  
  if (!checkpoint.paused_at || !isValidISOTimestamp(checkpoint.paused_at)) {
    errors.push('paused_at must be a valid ISO timestamp');
  }
  
  // Validate graph_state
  if (!checkpoint.graph_state || typeof checkpoint.graph_state !== 'object') {
    errors.push('graph_state is required and must be an object');
  }
  
  // Validate documents array
  if (!Array.isArray(checkpoint.documents)) {
    errors.push('documents must be an array');
  }
  
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  
  return { ok: true, checkpoint: checkpoint as Flow2Checkpoint };
}

/**
 * Check if checkpoint is expired
 */
export function isCheckpointExpired(checkpoint: Flow2Checkpoint, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  const pausedAt = new Date(checkpoint.paused_at).getTime();
  const now = Date.now();
  return (now - pausedAt) > maxAgeMs;
}

/**
 * Validate ISO 8601 timestamp
 */
function isValidISOTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && date.toISOString() === timestamp;
}


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
  
  // === PHASE 1: Validate optional HITL email approval fields ===
  
  // approval_token: must be 32 hex chars if present
  if (checkpoint.approval_token !== undefined) {
    if (typeof checkpoint.approval_token !== 'string' || !/^[0-9a-f]{32}$/i.test(checkpoint.approval_token)) {
      errors.push('approval_token must be a 32-character hexadecimal string');
    }
  }
  
  // approval_email_to: must be valid email if present
  if (checkpoint.approval_email_to !== undefined) {
    if (typeof checkpoint.approval_email_to !== 'string' || !isValidEmail(checkpoint.approval_email_to)) {
      errors.push('approval_email_to must be a valid email address');
    }
  }
  
  // Optional timestamp fields
  const optionalTimestamps = ['approval_sent_at', 'reminder_sent_at', 'reminder_due_at', 'decided_at'];
  for (const field of optionalTimestamps) {
    if (checkpoint[field] !== undefined && !isValidISOTimestamp(checkpoint[field])) {
      errors.push(`${field} must be a valid ISO timestamp if present`);
    }
  }
  
  // decision: must be 'approve' or 'reject' if present
  if (checkpoint.decision !== undefined) {
    if (checkpoint.decision !== 'approve' && checkpoint.decision !== 'reject') {
      errors.push('decision must be either "approve" or "reject"');
    }
  }
  
  // Custom rule: if decision is 'reject', decision_comment is required and >=10 chars
  if (checkpoint.decision === 'reject') {
    if (!checkpoint.decision_comment || typeof checkpoint.decision_comment !== 'string') {
      errors.push('decision_comment is required when decision is "reject"');
    } else if (checkpoint.decision_comment.trim().length < 10) {
      errors.push('decision_comment must be at least 10 characters when decision is "reject"');
    }
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

/**
 * Validate email address (basic check)
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


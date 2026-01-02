/**
 * Flow2: Submit Decision Logic
 * 
 * Handles finalization of human decisions with:
 * - Idempotency (same decision -> already_finalized)
 * - Conflict detection (different decision -> conflict)
 * - Read-after-write verification (concurrent modification detection)
 * - Comprehensive validation before write
 */

import { loadCheckpoint, updateCheckpointStatus, getRunIdByToken } from './checkpointStore';
import { validateCheckpoint } from './checkpointValidation';
import type { Flow2Checkpoint } from './checkpointTypes';
import { isAmbiguousReject, isRouteEddTrigger, getMatchSummary } from './ambiguousRejectDetector';
import { generateDemoEddBundle } from './demoEddGenerator';
import { startEddSubReview } from './eddSubReview';

export type FinalizeDecisionStatus = 
  | 'finalized'              // Successfully wrote decision
  | 'already_finalized'      // Same decision already exists (idempotent)
  | 'conflict'               // Different decision already exists
  | 'concurrent_modification' // Same decision but written by someone else (race condition)
  | 'not_found'              // Checkpoint not found
  | 'validation_failed'      // Validation failed before write
  | 'write_failed';          // Write operation failed

export interface DecisionMetadata {
  decided_by: string;        // Email or identifier
  finalized_via: 'email_link' | 'web_form';
  token_hint: string;        // Last 8 chars of token
}

export interface FinalizeDecisionResult {
  ok: boolean;
  status: FinalizeDecisionStatus;
  run_id?: string;
  decision?: 'approve' | 'reject';
  current_decision?: 'approve' | 'reject'; // For conflict cases
  requested_decision?: 'approve' | 'reject'; // For conflict cases
  message: string;
  errors?: string[];
  concurrent?: boolean; // True if same decision but concurrent write
}

/**
 * Validate token format (relaxed, per v3.1 spec)
 * - Length after trim: 16-256
 * - Optional: ASCII printable check
 */
function validateTokenFormat(token: string): { ok: boolean; error?: string } {
  const trimmed = token.trim();
  
  if (trimmed.length < 16 || trimmed.length > 256) {
    return { ok: false, error: 'Token must be 16-256 characters after trimming' };
  }
  
  // Optional: ASCII printable check (relaxed from [a-zA-Z0-9-] to support base64url tokens)
  const asciiPrintableRegex = /^[\x21-\x7E]+$/;
  if (!asciiPrintableRegex.test(trimmed)) {
    return { ok: false, error: 'Token contains invalid characters (only ASCII printable allowed)' };
  }
  
  return { ok: true };
}

/**
 * Finalize a human decision with comprehensive validation
 */
export async function finalizeDecision(
  token: string,
  decision: 'approve' | 'reject',
  reason: string | undefined,
  metadata: DecisionMetadata
): Promise<FinalizeDecisionResult> {
  // Step 1: Validate token format
  const tokenValidation = validateTokenFormat(token);
  if (!tokenValidation.ok) {
    return {
      ok: false,
      status: 'validation_failed',
      message: tokenValidation.error || 'Invalid token format',
      errors: [tokenValidation.error || 'Invalid token format'],
    };
  }
  
  // Step 2: Resolve token to run_id
  const trimmedToken = token.trim();
  const run_id = await getRunIdByToken(trimmedToken);
  
  if (!run_id) {
    return {
      ok: false,
      status: 'not_found',
      message: 'Invalid or expired approval token',
    };
  }
  
  // Step 3: Load checkpoint
  const checkpoint = await loadCheckpoint(run_id);
  
  if (!checkpoint) {
    return {
      ok: false,
      status: 'not_found',
      run_id,
      message: 'Checkpoint not found',
    };
  }
  
  // Step 4: Check for existing decision
  if (checkpoint.decision) {
    // Idempotency check: same decision
    if (checkpoint.decision === decision) {
      return {
        ok: true,
        status: 'already_finalized',
        run_id,
        decision,
        message: 'Decision already recorded (idempotent)',
      };
    }
    
    // Conflict: different decision
    return {
      ok: false,
      status: 'conflict',
      run_id,
      current_decision: checkpoint.decision,
      requested_decision: decision,
      message: `Conflict: decision already set to "${checkpoint.decision}", cannot change to "${decision}"`,
    };
  }
  
  // Step 5: Validate reason for reject
  if (decision === 'reject') {
    if (!reason || typeof reason !== 'string') {
      return {
        ok: false,
        status: 'validation_failed',
        run_id,
        message: 'Rejection reason is required',
        errors: ['reason is required for reject decision'],
      };
    }
    
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10) {
      return {
        ok: false,
        status: 'validation_failed',
        run_id,
        message: 'Rejection reason must be at least 10 characters',
        errors: ['reason must be at least 10 characters after trimming'],
      };
    }
  }
  
  // Step 6: Prepare updates
  const now = new Date().toISOString();
  const updates: Partial<Flow2Checkpoint> = {
    decision,
    decided_at: now,
    decided_by: metadata.decided_by,
    finalized_via: metadata.finalized_via,
    token_hint: metadata.token_hint,
  };
  
  if (decision === 'reject' && reason) {
    updates.decision_comment = reason.trim();
    
    // DEMO ONLY: Check for Route: EDD trigger (PRIMARY) or complex ambiguous pattern (FALLBACK)
    const isRouteEdd = isRouteEddTrigger(reason);
    const isAmbiguous = !isRouteEdd && isAmbiguousReject(reason); // Only check complex pattern if simple trigger not found
    
    if (isRouteEdd || isAmbiguous) {
      console.log('[SubmitDecision/Demo] ✅ EDD trigger detected!');
      if (isRouteEdd) {
        console.log('[SubmitDecision/Demo] Trigger: Route: EDD or [DEMO_EDD] token');
      } else {
        console.log('[SubmitDecision/Demo] Trigger: Ambiguous reject pattern');
        console.log('[SubmitDecision/Demo] Matched patterns:', getMatchSummary(reason));
      }
      
      const demoBundle = generateDemoEddBundle(reason.trim());
      
      // Inject demo metadata into checkpoint
      (updates as any).demo_mode = demoBundle.demo_mode;
      (updates as any).demo_reject_comment = demoBundle.demo_reject_comment;
      (updates as any).demo_injected_node = demoBundle.demo_injected_node;
      (updates as any).demo_evidence = demoBundle.demo_evidence;
      (updates as any).demo_trace = demoBundle.demo_trace;
      
      console.log('[SubmitDecision/Demo] Injected EDD demo bundle into checkpoint');
      
      // NEW: Kick off EDD sub-review immediately (Stage 2)
      console.log('[SubmitDecision/Demo] Initiating EDD sub-review...');
      
      // Prepare checkpoint with stage 1 updates applied
      const checkpointWithStage1 = { ...checkpoint, ...updates };
      
      // Start EDD sub-review (MUST be idempotent)
      const eddResult = await startEddSubReview(checkpointWithStage1, reason.trim());
      
      if (eddResult.ok) {
        if (eddResult.already_started) {
          console.log('[SubmitDecision/Demo] ⚠️ EDD sub-review already started (idempotent)');
        } else {
          console.log('[SubmitDecision/Demo] ✅ EDD sub-review started, Email #2 sent');
          // Merge EDD updates into existing updates
          Object.assign(updates, eddResult.updates);
        }
      } else {
        console.error('[SubmitDecision/Demo] ❌ EDD sub-review failed:', eddResult.errors);
        // Non-critical: stage 1 rejection still proceeds
      }
    }
  }
  
  // Step 7: Pre-write validation (validateCheckpoint expects full checkpoint)
  const checkpointWithUpdates = { ...checkpoint, ...updates };
  const validation = validateCheckpoint(checkpointWithUpdates);
  
  if (!validation.ok) {
    return {
      ok: false,
      status: 'validation_failed',
      run_id,
      message: 'Validation failed before write',
      errors: validation.errors,
    };
  }
  
  // Step 8: Write to checkpoint
  try {
    await updateCheckpointStatus(run_id, checkpoint.status, updates);
  } catch (error: any) {
    console.error('[SubmitDecision] Write failed:', error);
    return {
      ok: false,
      status: 'write_failed',
      run_id,
      message: 'Failed to write decision to checkpoint',
      errors: [error.message || 'Unknown write error'],
    };
  }
  
  // Step 9: Read-after-write verification
  const reloadedCheckpoint = await loadCheckpoint(run_id);
  
  if (!reloadedCheckpoint) {
    // Checkpoint disappeared after write (extremely rare)
    return {
      ok: false,
      status: 'write_failed',
      run_id,
      message: 'Checkpoint not found after write (concurrent deletion?)',
    };
  }
  
  // Check if decision was changed by concurrent write
  if (reloadedCheckpoint.decision !== decision) {
    // Someone else wrote a different decision
    return {
      ok: false,
      status: 'concurrent_modification',
      run_id,
      current_decision: reloadedCheckpoint.decision,
      requested_decision: decision,
      message: `Concurrent modification detected: decision changed to "${reloadedCheckpoint.decision}"`,
    };
  }
  
  // Check if decision was written by someone else (same decision, but race condition)
  if (
    reloadedCheckpoint.decided_at !== now ||
    reloadedCheckpoint.decided_by !== metadata.decided_by
  ) {
    // Same decision, but written by someone else or at a different time
    return {
      ok: true,
      status: 'already_finalized',
      run_id,
      decision,
      message: 'Decision recorded, but may have been written concurrently by another process',
      concurrent: true,
    };
  }
  
  // Step 10: Success
  return {
    ok: true,
    status: 'finalized',
    run_id,
    decision,
    message: `Decision "${decision}" successfully recorded`,
  };
}


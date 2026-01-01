/**
 * Flow2: Human Review Node
 * 
 * Pauses graph execution to await human decision (approve/reject).
 * This is a TRUE graph node, not UI simulation.
 */

import type { GraphState, NodeExecutionResult } from '../types';
import type { HumanDecision as CheckpointHumanDecision } from '../../flow2/checkpointTypes';

export interface HumanReviewNodeInput {
  state: GraphState;
}

/**
 * Human Review Node
 * 
 * Behavior:
 * - NEW Phase 7-9: Check if human review is REQUIRED (gating logic)
 * - If not required → SKIP node (continue execution)
 * - If required and no decision → PAUSE
 * - If decision === 'approve' → continue with approval flag
 * - If decision === 'reject' → continue with rejection flag
 */
export function executeHumanReviewNode(input: HumanReviewNodeInput): NodeExecutionResult {
  const { state } = input;
  
  // NEW Phase 7-9: Gate logic - determine if human review is REQUIRED
  const shouldPause = 
    state.requires_human_review === true ||
    (state.issues || []).some((i: any) => 
      (i.category === 'kyc_risk' || i.category === 'pep' || i.category === 'sanctions') && 
      i.severity === 'FAIL'
    ) ||
    (state.riskScore || 0) > 80 ||
    state.routePath === 'human_gate';
  
  if (!shouldPause) {
    // SKIP node: no human review needed
    console.log('[Flow2/HITL] Human review NOT required - skipping node');
    console.log('[Flow2/HITL] Gating check: requires_human_review=false, no HIGH kyc_risk issues, riskScore<=80');
    
    return {
      pauseExecution: false,
      state: {
        ...state,
        human_review_skipped: true,
        human_review_skip_reason: 'No high-risk KYC issues detected'
      } as GraphState
    };
  }
  
  console.log('[Flow2/HITL] Human review IS required - checking for decision');
  
  // Check if human decision is present (using checkpoint format)
  const humanDecision = (state as any).checkpoint_human_decision as CheckpointHumanDecision | undefined;
  
  if (!humanDecision) {
    // PAUSE: No human decision provided yet
    return {
      pauseExecution: true,
      reason: 'Awaiting human approval',
      paused_at_node: 'human_review',
      partial_state: {
        // Preserve current state
        ...state
      }
    };
  }
  
  // Human decision provided - continue execution
  if (humanDecision.decision === 'approve') {
    // Approved: annotate state and continue
    return {
      pauseExecution: false,
      state: {
        ...state,
        human_approved: true,
        human_decision_ts: new Date().toISOString(),
        human_decision_comment: humanDecision.comment
      } as GraphState
    };
  }
  
  if (humanDecision.decision === 'reject') {
    // Rejected: annotate state with rejection
    return {
      pauseExecution: false,
      state: {
        ...state,
        human_rejected: true,
        human_rejection_reason: humanDecision.comment || 'Rejected by human reviewer',
        human_decision_ts: new Date().toISOString(),
        execution_terminated: true
      } as GraphState
    };
  }
  
  // Invalid decision - treat as pause
  return {
    pauseExecution: true,
    reason: `Invalid human decision: ${humanDecision.decision}`,
    paused_at_node: 'human_review'
  };
}


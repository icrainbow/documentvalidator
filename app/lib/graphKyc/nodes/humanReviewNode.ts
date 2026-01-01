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
 * - If no human_decision in state → PAUSE
 * - If decision === 'approve' → continue with approval flag
 * - If decision === 'reject' → continue with rejection flag
 */
export function executeHumanReviewNode(input: HumanReviewNodeInput): NodeExecutionResult {
  const { state } = input;
  
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


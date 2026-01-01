/**
 * Flow2: Checkpoint Types for Human-in-the-Loop
 * 
 * Enables graph pause/resume with persistent state.
 */

import type { GraphState } from '../graphKyc/types';
import type { Flow2Document } from '../graphKyc/demoData';

export type CheckpointStatus = 'paused' | 'resumed' | 'completed' | 'failed';

export interface Flow2Checkpoint {
  run_id: string; // UUID v4
  graph_id: string; // e.g., "flow2_kyc_v1"
  flow: 'flow2'; // Validation
  current_node_id: string; // Last completed node
  paused_at_node_id: string; // Node waiting for human input
  graph_state: GraphState; // Serialized graph state
  documents: Flow2Document[]; // For UI display
  created_at: string; // ISO timestamp
  paused_at: string; // ISO timestamp
  resumed_at?: string; // ISO timestamp (optional)
  status: CheckpointStatus;
  
  // ========== HITL Email Approval Fields (Phase 1) ==========
  approval_token?: string; // 32-char hex token for approval links
  approval_email_to?: string; // Approver email address
  approval_email_sent?: boolean; // Whether initial email was sent
  approval_sent_at?: string; // ISO timestamp of initial email send
  approval_message_id?: string; // SMTP Message-ID for threading
  approval_email_subject?: string; // Email subject (for debugging)
  
  // Reminder tracking (3-minute, exactly once)
  reminder_email_sent?: boolean; // Whether reminder was sent
  reminder_sent_at?: string; // ISO timestamp of reminder send
  reminder_due_at?: string; // ISO timestamp = approval_sent_at + 180s
  
  // Human decision tracking
  decision?: 'approve' | 'reject'; // Human decision
  decision_comment?: string; // Rejection reason or approval note
  decided_at?: string; // ISO timestamp of decision
  decided_by?: string; // Email or identifier of decision maker
}

export interface CheckpointMetadata {
  run_id: string;
  status: CheckpointStatus;
  paused_at_node_id: string;
  paused_reason: string; // Human-readable explanation
  document_count: number;
  created_at: string;
  paused_at: string;
}

export interface HumanDecision {
  node_id: string;
  decision: 'approve' | 'reject';
  comment?: string;
}


/**
 * Flow2: Checkpoint Types for Human-in-the-Loop
 * 
 * Enables graph pause/resume with persistent state.
 */

import type { GraphState } from '../graphKyc/types';
import type { Flow2Document } from '../graphKyc/demoData';

export type CheckpointStatus = 'paused' | 'resumed' | 'completed' | 'failed';

export type EddStageStatus = 
  | 'idle'                    // Not started
  | 'running'                 // EDD sub-review initiated
  | 'waiting_edd_approval'    // Email #2 sent, awaiting decision
  | 'approved'                // EDD approved
  | 'rejected';               // EDD rejected

export interface EddStage {
  status: EddStageStatus;
  started_at?: string;              // ISO timestamp when EDD sub-review started
  approval_token?: string;          // 32-char hex token for Email #2
  approval_email_to?: string;       // Same as stage 1 approver
  approval_email_sent?: boolean;    // Whether Email #2 was sent
  approval_sent_at?: string;        // ISO timestamp of Email #2 send
  decision?: 'approve' | 'reject';  // EDD decision
  decision_comment?: string;        // EDD rejection reason (if reject)
  decided_at?: string;              // ISO timestamp of EDD decision
  decided_by?: string;              // Email/identifier of EDD decision maker
  // Demo-only deterministic outputs
  demo_edd_outputs?: {
    findings: Array<{ severity: string; title: string; detail: string }>;
    evidence_summary: string;
    graph_patch: { add_nodes: any[]; add_edges: any[] };
  };
}

export type FinalDecision = 
  | 'approved'              // Stage 1 approved (no EDD)
  | 'rejected'              // Stage 1 rejected (no EDD) OR EDD rejected
  | 'approved_with_edd';    // Stage 1 rejected → EDD approved

export interface EventLogEntry {
  timestamp: string;  // ISO timestamp
  event: string;      // e.g., 'stage1_reject', 'edd_started', 'edd_approved'
  details?: any;      // Optional structured data
}

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
  
  // ========== Topic Summaries (for email and persistence) ==========
  topic_summaries?: Array<{
    topic_id: string;
    title: string;
    coverage: string;
    bullets: string[];
    evidence?: Array<{ quote: string; doc_id?: string }>;
    linked_risks?: Array<{ risk_id: string; severity: string; title: string }>;
  }>;
  
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
  
  // Phase 6: Decision audit trail
  finalized_via?: 'email_link' | 'web_form'; // How decision was submitted
  token_hint?: string; // Last 8 chars of token (audit trail)
  
  // ========== STAGE 2: EDD SUB-REVIEW FIELDS ==========
  edd_stage?: EddStage;           // EDD stage state (optional, only if triggered)
  final_decision?: FinalDecision; // Overall outcome after all stages
  event_log?: EventLogEntry[];    // Audit trail (append-only)
  
  // ========== DEMO FIELDS ==========
  demo_evidence?: {
    animation_played?: boolean;
    [key: string]: any;
  };
}

export interface CheckpointMetadata {
  run_id: string;
  status: CheckpointStatus;
  paused_at_node_id: string;
  paused_reason: string; // Human-readable explanation
  document_count: number;
  created_at: string;
  paused_at: string;
  
  // Phase 8 Animation Control
  animation_played?: boolean; // True after Phase 8 animation plays once (prevent replay)
  
  // Demo Mode Detection
  demo_mode?: boolean;
  demo_evidence?: {
    [key: string]: any;
  };
  
  // Decision Tracking (for historical status policy)
  decision?: 'approve' | 'reject'; // Stage 1 human decision
  edd_stage?: EddStage; // EDD sub-review state (presence indicates rejection occurred)
  
  // Graph State (for historical status policy)
  graph_state?: GraphState; // For node status policy
}

export interface HumanDecision {
  node_id: string;
  decision: 'approve' | 'reject';
  comment?: string;
}


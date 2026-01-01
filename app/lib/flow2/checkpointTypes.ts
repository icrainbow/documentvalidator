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


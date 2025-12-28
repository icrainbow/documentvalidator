/**
 * Orchestrator Type Definitions
 * Type system for multi-agent orchestration with observability
 */

import { AgentId, AgentMode } from '../agents/types';
import {
  Fact,
  PolicyMapping,
  RedTeamIssue,
  EvidenceRequest,
  ClientCommunication,
  AuditEvent,
} from '../agents/domain';

// ============================================================================
// Request/Response Types
// ============================================================================

export interface OrchestrateRequest {
  flow_id: string; // e.g., "compliance-review-v1"
  document_id: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  options?: {
    language?: 'english' | 'chinese' | 'german' | 'french' | 'japanese';
    tone?: 'formal' | 'friendly' | 'urgent';
    client_name?: string;
    reviewer?: string;
    mode?: AgentMode;
    skip_steps?: string[]; // For testing/debugging
  };
}

export interface OrchestrateResponse {
  ok: boolean;
  error?: string;
  parent_trace_id: string;
  mode: AgentMode;
  
  plan: {
    flow_id: string;
    flow_name: string;
    flow_version: string;
    steps: Array<{
      step_id: string;
      step_name: string;
      agent_id: AgentId;
      status: 'pending' | 'completed' | 'failed' | 'skipped';
    }>;
    branching_points: Array<{
      after_step: string;
      condition: string;
      branch_taken: boolean;
    }>;
  };
  
  execution: {
    steps: StepExecutionResult[];
    total_latency_ms: number;
    total_tokens: number;
    errors: string[];
  };
  
  artifacts: {
    facts?: { facts: Fact[]; summary: string; total_confidence: number };
    policy_mappings?: { mappings: PolicyMapping[]; flagged_count: number; highest_risk_level: string };
    review_issues?: { issues: RedTeamIssue[]; overall_status: string; critical_count: number; high_count: number };
    evidence_requests?: { requests: EvidenceRequest[]; total_requests: number; immediate_count: number };
    client_communication?: ClientCommunication;
    audit_log?: AuditEvent;
  };
  
  decision: {
    next_action: 'request_more_info' | 'ready_to_send' | 'rejected' | 'approved';
    reason: string;
    confidence: number; // 0.0 - 1.0
    recommended_actions: string[];
    blocking_issues: string[];
  };
  
  signals: {
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    flagged_policy_count: number;
    evidence_requests_count: number;
    branch_triggers: string[];
  };
  
  metadata: {
    orchestrator_version: string;
    timestamp: string;
    document_id: string;
    sections_processed: number;
  };
}

// ============================================================================
// Internal Orchestration Types
// ============================================================================

export interface StepExecutionResult {
  step_id: string;
  agent_id: AgentId;
  trace_id: string;
  status: 'success' | 'error' | 'blocked';
  latency_ms: number;
  tokens: number;
  started_at: string;
  completed_at: string;
  input_summary: string;
  output_summary: string;
  output?: any;
  ok: boolean;
  error?: string;
}

export interface OrchestrationContext {
  parent_trace_id: string;
  document_id: string;
  sections: OrchestrateRequest['sections'];
  options: Required<OrchestrateRequest['options']>;
  artifacts: OrchestrateResponse['artifacts'];
  execution: {
    steps: StepExecutionResult[];
    errors: string[];
  };
  decision?: OrchestrateResponse['decision'];
  signals: OrchestrateResponse['signals'];
}

export interface PlanStep {
  id: string;
  name: string;
  agent_id: AgentId;
  artifact_key: keyof OrchestrateResponse['artifacts'];
  critical: boolean;
  condition?: (context: OrchestrationContext) => boolean;
  prepareInput: (context: OrchestrationContext) => any;
}

export interface FlowDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  mainSequence: PlanStep[];
  conditionalSteps: PlanStep[];
  finalizationSteps: PlanStep[];
}


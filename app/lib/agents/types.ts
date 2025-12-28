// Core agent system types

export type AgentId = 
  | 'validate-agent'
  | 'synthesize-agent'
  | 'optimize-agent'
  | 'merge-agent'
  | 'evaluate-agent'
  | 'compliance-agent'
  | 'extract-facts-agent'
  | 'map-policy-agent'
  | 'redteam-review-agent'
  | 'request-evidence-agent'
  | 'draft-client-comms-agent'
  | 'write-audit-agent';

export type AgentMode = 'fake' | 'real';

export interface AgentConfig {
  id: AgentId;
  name: string;
  description: string;
  capabilities: string[];
}

export interface AgentContext {
  traceId: string;
  mode: AgentMode;
  timestamp: Date;
  input: any;
}

export interface AgentMetadata {
  latency_ms: number;
  tokens: number;
  status: 'success' | 'error' | 'blocked';
  retries?: number;
}

export interface AgentResponse<T = any> {
  ok: boolean;
  agent_id: AgentId;
  trace_id: string;
  mode: AgentMode;
  output: T;
  metadata: AgentMetadata;
  error?: string;
}

export interface AgentHandler<TInput = any, TOutput = any> {
  (input: TInput, context: AgentContext): Promise<TOutput>;
}

export interface AgentDefinition {
  config: AgentConfig;
  handler: AgentHandler;
}


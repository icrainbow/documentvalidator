/**
 * Phase 0: Flow2 Explicit State + Standardized Trace
 * 
 * Adds feature flags and reflection state without breaking existing fields.
 */

export type TraceEventType =
  | 'info'
  | 'decision'
  | 'warning'
  | 'error'
  | 'batch_review'
  | 'section_review'
  | 'human_ack'
  | 'fallback'
  | 'reflection';

export interface TraceEvent {
  type: TraceEventType;
  node: string;
  message: string;
  data?: Record<string, any>;
  ts?: string;
}

export interface FeatureFlags {
  reflection: boolean;
  negotiation: boolean;
  memory: boolean;
}

export interface ReflectionState {
  enabled: boolean;
  replanCount: number;
  lastShouldReplan: boolean | null;
  lastConfidence: number | null;
  lastNewPlan: string[];
}

/**
 * Extended Flow2 state with feature flags and standardized trace.
 * Backward compatible: all new fields are optional or have defaults.
 */
export interface Flow2State {
  // Core fields (existing, DO NOT REMOVE)
  documentId?: string;
  documents: { name: string; content: string }[];
  topicSections?: any[];
  issues?: any[];
  conflicts?: any[];
  coverageGaps?: any[];
  
  // Dirty queue (new, for reflection)
  dirtyQueue?: string[];
  dirtyTopics?: string[];
  
  // Routing / control
  nextAction?: string;
  stopReason?: string;
  
  // Human gate
  humanDecision?: any;
  
  // Risk / triage
  riskScore?: number;
  triageReasons?: string[];
  routePath?: string;
  
  // Feature flags + sub-states (Phase 0)
  features: FeatureFlags;
  reflection: ReflectionState;
  
  // Standardized trace (Phase 0)
  trace: TraceEvent[];
}

/**
 * Helper to create default Flow2 state
 */
export function createDefaultFlow2State(documents: { name: string; content: string }[]): Flow2State {
  return {
    documents,
    issues: [],
    conflicts: [],
    coverageGaps: [],
    dirtyQueue: [],
    features: {
      reflection: false,
      negotiation: false,
      memory: false,
    },
    reflection: {
      enabled: false,
      replanCount: 0,
      lastShouldReplan: null,
      lastConfidence: null,
      lastNewPlan: [],
    },
    trace: [],
  };
}

/**
 * Add trace event to state
 */
export function addTrace(
  state: Flow2State,
  type: TraceEventType,
  node: string,
  message: string,
  data?: Record<string, any>
): void {
  state.trace.push({
    type,
    node,
    message,
    data: data || {},
    ts: new Date().toISOString(),
  });
}

/**
 * Summarize state for reflection
 */
export function summarizeForReflection(state: Flow2State): Record<string, any> {
  const recentTrace = state.trace.slice(-12).map(t => ({
    type: t.type,
    node: t.node,
    message: t.message,
    data: t.data,
  }));
  
  return {
    documentId: state.documentId,
    dirtyQueueCount: (state.dirtyQueue || []).length,
    dirtyQueueSample: (state.dirtyQueue || []).slice(0, 8),
    issuesCount: (state.issues || []).length,
    issuesSample: (state.issues || []).slice(0, 6),
    recentTrace,
    currentNextAction: state.nextAction,
    replanCount: state.reflection.replanCount,
  };
}



/**
 * Flow2: LangGraph KYC Review Types
 * 
 * Isolated from Flow1 (batch review) types.
 * No dependencies on scopePlanning.ts or review.ts.
 */

// Topic-based document structure (not section-based like Flow1)
export type TopicId = 
  | 'client_identity'
  | 'source_of_wealth'
  | 'business_relationship'
  | 'beneficial_ownership'
  | 'risk_profile'
  | 'sanctions_pep'
  | 'transaction_patterns'
  | 'other';

export interface EvidenceRef {
  docName: string;
  pageOrSection?: string;
  snippet: string;
}

export interface TopicSection {
  topicId: TopicId;
  content: string;
  evidenceRefs: EvidenceRef[];
  coverage: 'complete' | 'partial' | 'missing';
}

export interface Coverage {
  topicId: TopicId;
  status: 'complete' | 'partial' | 'missing';
  reason?: string;
}

export interface Conflict {
  topicIds: TopicId[];
  description: string;
  severity: 'high' | 'medium' | 'low';
  evidenceRefs: EvidenceRef[];
}

// Graph execution path
export type GraphPath = 'fast' | 'crosscheck' | 'escalate' | 'human_gate';

// Risk score breakdown (for transparency)
export interface RiskBreakdown {
  coveragePoints: number;
  keywordPoints: number;
  totalPoints: number;
}

export interface GraphState {
  // Input
  documents: { name: string; content: string }[];
  dirtyTopics?: TopicId[];
  humanDecision?: HumanDecision;
  
  // Assembled
  topicSections?: TopicSection[];
  
  // Risk triage
  riskScore?: number; // 0-100
  triageReasons?: string[];
  routePath?: GraphPath;
  
  // Execution results
  conflicts?: Conflict[];
  coverageGaps?: Coverage[];
  policyFlags?: string[];
  
  // Issues (compatible with Flow1 format for UI reuse)
  issues?: any[];
  
  // Human gate
  humanGate?: {
    required: boolean;
    prompt: string;
    options: string[];
  };
  
  // Trace
  trace?: GraphTraceEvent[];
}

export interface GraphTraceEvent {
  node: string;
  status: 'executed' | 'skipped' | 'waiting' | 'failed';
  decision?: string;
  reason?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  inputsSummary?: string;
  outputsSummary?: string;
}

export interface HumanDecision {
  gate: string;
  decision: 'approve_edd' | 'request_docs' | 'reject';
  signer?: string;
  notes?: string;
}

export interface GraphReviewResponse {
  issues: any[];
  topicSections?: TopicSection[];
  conflicts?: Conflict[]; // NEW: Explicit top-level field
  coverageGaps?: Coverage[]; // NEW: Explicit top-level field
  graphReviewTrace: {
    events: GraphTraceEvent[];
    summary: {
      path: GraphPath;
      riskScore: number;
      riskBreakdown?: RiskBreakdown; // NEW: Show breakdown
      coverageMissingCount: number;
      conflictCount: number;
    };
    degraded?: boolean;
  };
  humanGate?: {
    required: boolean;
    prompt: string;
    options: string[];
    context?: string; // NEW: Optional context for gate
  };
  resumeToken?: string; // NEW: Token for resuming after human gate
}


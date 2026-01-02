/**
 * Generic Topic Summaries Engine - Core Types
 * 
 * Configurable multi-mode topic summary system.
 * Supports any review type by providing a config (topic list + titles + prompt).
 */

export interface TopicSummaryConfig {
  template_id: string;  // Unique identifier: "kyc_flow2" | "it_bulletin"
  panel_title: string;  // UI display title
  panel_subtitle: string;  // UI display subtitle
  topic_ids: readonly string[];  // Fixed array of topic IDs (SSOT)
  topic_titles: Record<string, string>;  // topic_id -> human-readable title
  prompt_role: string;  // "KYC analyst" | "IT change analyst"
  prompt_instructions: string;  // Mode-specific LLM guidance
  max_bullets: number;  // Max bullet points per topic
  max_evidence: number;  // Max evidence snippets per topic
}

export interface GenericTopicSummary {
  topic_id: string;
  title: string;  // Server-injected from config.topic_titles
  coverage: 'PRESENT' | 'WEAK' | 'MISSING';
  bullets: string[];
  evidence?: {
    quote: string;
    doc_id?: string;
  }[];
  linked_risks?: {
    risk_id: string;
    severity: 'high' | 'medium' | 'low';  // Canonical only
    title: string;
  }[];
}

export interface EngineInput {
  config: TopicSummaryConfig;
  documents: {
    doc_id: string;
    filename: string;
    text: string;
  }[];
  risks?: any[];  // Optional: for risk linking (KYC uses this, IT doesn't)
}

export interface EngineOutput {
  topic_summaries: GenericTopicSummary[];
  model_used: string;
  duration_ms: number;
}


/**
 * Type definitions for LLM-driven Document Structuring Agent
 */

/**
 * Quality signals extracted from parse result
 */
export interface QualitySignals {
  titleQuality: 'good' | 'poor' | 'mixed' | 'n/a';
  contentDistribution: 'balanced' | 'skewed' | 'unknown';
  sectionCount: 'appropriate' | 'too_few' | 'too_many';
}

/**
 * Valid parsing strategies (fixed enum)
 */
export type ParsingStrategy = 
  | 'heading_2_split'
  | 'heading_1_split'
  | 'text_pattern_analysis'
  | 'aggressive_split';

/**
 * LLM evaluation decision
 */
export type EvaluationDecision = 'ACCEPT' | 'REJECT';

/**
 * Input to LLM structure evaluator
 */
export interface StructureEvaluationRequest {
  documentMetadata: {
    totalCharacters: number;
    h1Count: number;
    h2Count: number;
    h3Count: number;
  };
  strategyUsed: ParsingStrategy;
  attemptNumber: number;
  parseResult: {
    sectionsDetected: number;
    sections: Array<{
      title: string;
      paragraphCount: number;
      contentLength: number;
      sampleContent: string; // First 200 chars
    }>;
  };
  previousAttempts?: Array<{
    strategy: ParsingStrategy;
    sectionsDetected: number;
  }>;
}

/**
 * LLM evaluation output (validated via Zod)
 */
export interface StructureEvaluationResponse {
  evaluation: EvaluationDecision;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  qualitySignals: QualitySignals;
  recommendedNextStrategy?: ParsingStrategy;
}

/**
 * Enhanced strategy attempt with LLM evaluation
 */
export interface EnhancedStrategyAttempt {
  attemptNumber: number;
  strategy: string;
  
  // Deterministic parsing phase
  parseResult: {
    sectionsDetected: number;
    headingLevel?: number;
    sampleTitles: string[]; // First 3 titles
  };
  parseDurationMs: number;
  
  // LLM evaluation phase (optional - may be skipped)
  evaluation?: {
    llmDecision: EvaluationDecision;
    llmConfidence: number;
    llmReasoning: string;
    qualitySignals: QualitySignals;
    recommendedNextStrategy?: string;
    evaluationDurationMs: number;
  };
  
  // Agent decision phase
  agentDecision: 'accept' | 'retry' | 'fallback';
  agentReasoning: string;
  
  // Fallback info (if LLM failed or was skipped)
  fallbackTriggered?: boolean;
  fallbackReason?: string;
}

/**
 * Enhanced structuring trace with LLM influence
 */
export interface EnhancedStructuringTrace {
  agentName: string;
  agentId: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  attempts: EnhancedStrategyAttempt[];
  finalDecision: {
    strategy: string;
    totalSections: number;
    acceptanceCriteria: string;
    llmInfluence?: string; // How LLM affected the decision
  };
}

/**
 * Fallback evaluation (when LLM is unavailable)
 */
export interface DeterministicEvaluation {
  evaluation: EvaluationDecision;
  confidence: number;
  reasoning: string;
  qualitySignals: QualitySignals;
  recommendedNextStrategy?: ParsingStrategy;
  isDeterministic: true;
}


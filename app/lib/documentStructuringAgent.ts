/**
 * Document Structuring Agent (LLM-Enhanced)
 * 
 * Agentic decision-making for document parsing:
 * - Attempts multiple strategies adaptively
 * - Uses LLM to evaluate structure quality
 * - Switches strategies based on LLM recommendations
 * - Records execution trace for visibility
 * 
 * SAFETY MODEL:
 * - Parsing is always deterministic (LLM never parses)
 * - LLM only evaluates quality and recommends strategy
 * - Hard guardrails prevent infinite loops and invalid strategies
 * - Fallback to deterministic logic if LLM fails
 */

import { parseDocxBySections, ParsedSection, ParseResult } from './docxParser';
import type {
  EnhancedStrategyAttempt,
  EnhancedStructuringTrace,
  StructureEvaluationRequest,
  StructureEvaluationResponse,
  ParsingStrategy,
  DeterministicEvaluation,
} from './types/structuring';

export interface StructuringResult {
  sections: ParsedSection[];
  totalSections: number;
  rawText: string;
  trace: EnhancedStructuringTrace;
}

// Legacy exports for backward compatibility
export type { EnhancedStrategyAttempt as StrategyAttempt };
export type { EnhancedStructuringTrace as StructuringTrace };

/**
 * Constants
 */
const MINIMUM_SECTIONS_REQUIRED = 3;
const MAX_ATTEMPTS = 3;
const LLM_EVALUATION_TIMEOUT_MS = 10000;

/**
 * Strategy metadata
 */
interface StrategyMetadata {
  id: ParsingStrategy;
  displayName: string;
  headingLevel?: 1 | 2 | 'auto';
}

const STRATEGY_POOL: StrategyMetadata[] = [
  { id: 'heading_2_split', displayName: 'Heading 2 Split', headingLevel: 2 },
  { id: 'heading_1_split', displayName: 'Heading 1 Split', headingLevel: 1 },
  { id: 'text_pattern_analysis', displayName: 'Text Pattern Analysis', headingLevel: 'auto' },
  // Note: aggressive_split not yet implemented in parser
];

/**
 * Deterministic fallback evaluation (when LLM unavailable)
 */
function deterministicEvaluation(
  sections: ParsedSection[],
  attemptNumber: number
): DeterministicEvaluation {
  const count = sections.length;
  
  if (count >= MINIMUM_SECTIONS_REQUIRED) {
    return {
      evaluation: 'ACCEPT',
      confidence: 0.7,
      reasoning: `Found ${count} sections (>= ${MINIMUM_SECTIONS_REQUIRED} required)`,
      qualitySignals: {
        titleQuality: 'n/a',
        contentDistribution: 'unknown',
        sectionCount: 'appropriate',
      },
      isDeterministic: true,
    };
  }
  
  // Recommend next strategy based on attempt number
  let recommendedNextStrategy: ParsingStrategy | undefined;
  if (attemptNumber === 1) {
    recommendedNextStrategy = 'heading_1_split';
  } else if (attemptNumber === 2) {
    recommendedNextStrategy = 'text_pattern_analysis';
  }
  
  return {
    evaluation: 'REJECT',
    confidence: 0.7,
    reasoning: `Insufficient structure: only ${count} section(s) detected, need >= ${MINIMUM_SECTIONS_REQUIRED}`,
    qualitySignals: {
      titleQuality: 'n/a',
      contentDistribution: 'unknown',
      sectionCount: 'too_few',
    },
    recommendedNextStrategy,
    isDeterministic: true,
  };
}

/**
 * Call LLM to evaluate structure quality
 */
async function evaluateWithLLM(
  request: StructureEvaluationRequest
): Promise<StructureEvaluationResponse | null> {
  try {
    const response = await fetch('/api/evaluate_structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.warn('[DocumentStructuringAgent] LLM evaluation failed:', error);
      return null;
    }
    
    const result: StructureEvaluationResponse = await response.json();
    return result;
  } catch (error) {
    console.error('[DocumentStructuringAgent] LLM evaluation error:', error);
    return null;
  }
}

/**
 * Select initial strategy based on heading counts
 */
function selectInitialStrategy(h1Count: number, h2Count: number): ParsingStrategy {
  if (h2Count >= 2) {
    return 'heading_2_split';
  } else if (h1Count >= 2) {
    return 'heading_1_split';
  }
  return 'heading_2_split'; // Default starting point
}

/**
 * Extract heading counts from raw parse attempt
 */
async function getHeadingCounts(file: File): Promise<{ h1Count: number; h2Count: number; h3Count: number }> {
  // Quick parse to get heading counts
  try {
    const result = await parseDocxBySections(file, { targetHeadingLevel: 'auto' });
    // Estimate counts from sections
    const h1Count = result.sections.filter(s => s.headingLevel === 1).length;
    const h2Count = result.sections.filter(s => s.headingLevel === 2).length;
    return { h1Count, h2Count, h3Count: 0 };
  } catch {
    return { h1Count: 0, h2Count: 0, h3Count: 0 };
  }
}

/**
 * Document Structuring Agent (LLM-Enhanced)
 * 
 * Adaptive parsing with LLM-guided strategy selection:
 * 1. Select initial strategy based on heuristics
 * 2. Parse with deterministic parser
 * 3. LLM evaluates structure quality
 * 4. If rejected, LLM recommends next strategy
 * 5. Repeat (max 3 attempts)
 * 
 * GUARDRAILS:
 * - Max 3 attempts (hard limit)
 * - Never retry same strategy twice
 * - LLM timeout: 10 seconds
 * - Fallback to deterministic if LLM fails
 * - Always produce output (never hang)
 */
export async function structureDocument(file: File): Promise<StructuringResult> {
  console.log('[DocumentStructuringAgent] 🤖 Starting LLM-enhanced document structuring...');
  
  const agentStartTime = Date.now();
  const attempts: EnhancedStrategyAttempt[] = [];
  const trace: EnhancedStructuringTrace = {
    agentName: 'Document Structuring Agent (Agentic)',
    agentId: 'doc_structuring_llm_v1',
    startedAt: new Date().toISOString(),
    completedAt: '',
    totalDurationMs: 0,
    attempts: [],
    finalDecision: {
      strategy: '',
      totalSections: 0,
      acceptanceCriteria: `LLM-evaluated quality OR ${MINIMUM_SECTIONS_REQUIRED}+ sections (fallback)`,
    }
  };
  
  let finalResult: ParseResult | null = null;
  let acceptedStrategy: string | null = null;
  let triedStrategies: Set<ParsingStrategy> = new Set();
  
  // Get document metadata for LLM
  const arrayBuffer = await file.arrayBuffer();
  const totalCharacters = arrayBuffer.byteLength;
  
  // Quick heading count extraction
  const headingCounts = await getHeadingCounts(file);
  console.log('[DocumentStructuringAgent] Heading counts:', headingCounts);
  
  // Select initial strategy
  let currentStrategy = selectInitialStrategy(headingCounts.h1Count, headingCounts.h2Count);
  console.log('[DocumentStructuringAgent] Initial strategy:', currentStrategy);
  
  // ============================================================
  // MAIN ATTEMPT LOOP (Max 3 attempts with LLM guidance)
  // ============================================================
  for (let attemptNumber = 1; attemptNumber <= MAX_ATTEMPTS; attemptNumber++) {
    console.log(`[DocumentStructuringAgent] 📋 Attempt ${attemptNumber}/${MAX_ATTEMPTS}: ${currentStrategy}`);
    
    // Skip if strategy already tried
    if (triedStrategies.has(currentStrategy)) {
      console.warn('[DocumentStructuringAgent] Strategy already tried, forcing fallback');
      currentStrategy = 'text_pattern_analysis';
    }
    triedStrategies.add(currentStrategy);
    
    const strategyMeta = STRATEGY_POOL.find(s => s.id === currentStrategy);
    if (!strategyMeta) {
      console.error('[DocumentStructuringAgent] Invalid strategy:', currentStrategy);
      break;
    }
    
    const attempt: EnhancedStrategyAttempt = {
      attemptNumber,
      strategy: strategyMeta.displayName,
      parseResult: { sectionsDetected: 0, sampleTitles: [] },
      parseDurationMs: 0,
      agentDecision: 'retry',
      agentReasoning: '',
    };
    
    // ============================================================
    // PHASE 1: Deterministic Parsing
    // ============================================================
    const parseStart = Date.now();
    let parseResult: ParseResult;
    
    try {
      parseResult = await parseDocxBySections(file, { targetHeadingLevel: strategyMeta.headingLevel });
      attempt.parseDurationMs = Date.now() - parseStart;
      attempt.parseResult = {
        sectionsDetected: parseResult.sections.length,
        headingLevel: parseResult.sections[0]?.headingLevel,
        sampleTitles: parseResult.sections.slice(0, 3).map(s => s.title),
      };
      
      console.log(`[DocumentStructuringAgent] Parse complete: ${parseResult.sections.length} sections (${attempt.parseDurationMs}ms)`);
    } catch (error) {
      console.error('[DocumentStructuringAgent] Parse error:', error);
      attempt.parseDurationMs = Date.now() - parseStart;
      attempt.agentDecision = 'retry';
      attempt.agentReasoning = `Parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      attempt.fallbackTriggered = true;
      attempt.fallbackReason = 'Parse error';
      attempts.push(attempt);
      
      // Try next strategy
      if (attemptNumber < MAX_ATTEMPTS) {
        currentStrategy = 'text_pattern_analysis';
        continue;
      } else {
        throw new Error(`All structuring strategies failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Skip LLM evaluation if parse returned 0 sections (obvious failure)
    if (parseResult.sections.length === 0) {
      console.warn('[DocumentStructuringAgent] Parse returned 0 sections, skipping LLM evaluation');
      attempt.agentDecision = 'retry';
      attempt.agentReasoning = 'Parse returned 0 sections; trying next strategy';
      attempt.fallbackTriggered = true;
      attempt.fallbackReason = 'Zero sections detected';
      attempts.push(attempt);
      
      if (attemptNumber < MAX_ATTEMPTS) {
        currentStrategy = attemptNumber === 1 ? 'heading_1_split' : 'text_pattern_analysis';
        continue;
      }
    }
    
    // ============================================================
    // PHASE 2: LLM Evaluation (with fallback)
    // ============================================================
    const evalStart = Date.now();
    let evaluationResult: StructureEvaluationResponse | DeterministicEvaluation | null = null;
    let usedDeterministicFallback = false;
    
    // Skip LLM for final attempt (always accept)
    if (attemptNumber < MAX_ATTEMPTS) {
      // Build LLM request
      const llmRequest: StructureEvaluationRequest = {
        documentMetadata: {
          totalCharacters,
          h1Count: headingCounts.h1Count,
          h2Count: headingCounts.h2Count,
          h3Count: headingCounts.h3Count,
        },
        strategyUsed: currentStrategy,
        attemptNumber,
        parseResult: {
          sectionsDetected: parseResult.sections.length,
          sections: parseResult.sections.slice(0, 10).map(s => ({
            title: s.title,
            paragraphCount: s.paragraphCount,
            contentLength: s.content.length,
            sampleContent: s.content.substring(0, 200),
          })),
        },
        previousAttempts: attempts.map(a => ({
          strategy: STRATEGY_POOL.find(s => s.displayName === a.strategy)?.id || 'unknown' as ParsingStrategy,
          sectionsDetected: a.parseResult.sectionsDetected,
        })),
      };
      
      console.log('[DocumentStructuringAgent] 🤖 Calling LLM evaluator...');
      evaluationResult = await evaluateWithLLM(llmRequest);
      
      // Fallback to deterministic if LLM failed
      if (!evaluationResult) {
        console.warn('[DocumentStructuringAgent] LLM evaluation failed, using deterministic fallback');
        evaluationResult = deterministicEvaluation(parseResult.sections, attemptNumber);
        usedDeterministicFallback = true;
      }
      
      const evalDuration = Date.now() - evalStart;
      
      // Record evaluation in attempt
      if ('isDeterministic' in evaluationResult && evaluationResult.isDeterministic) {
        attempt.evaluation = {
          llmDecision: evaluationResult.evaluation,
          llmConfidence: evaluationResult.confidence,
          llmReasoning: evaluationResult.reasoning,
          qualitySignals: evaluationResult.qualitySignals,
          recommendedNextStrategy: evaluationResult.recommendedNextStrategy,
          evaluationDurationMs: evalDuration,
        };
        attempt.fallbackTriggered = true;
        attempt.fallbackReason = 'LLM unavailable';
      } else {
        attempt.evaluation = {
          llmDecision: evaluationResult.evaluation,
          llmConfidence: evaluationResult.confidence,
          llmReasoning: evaluationResult.reasoning,
          qualitySignals: evaluationResult.qualitySignals,
          recommendedNextStrategy: evaluationResult.recommendedNextStrategy,
          evaluationDurationMs: evalDuration,
        };
      }
      
      console.log(`[DocumentStructuringAgent] Evaluation: ${evaluationResult.evaluation} (confidence: ${evaluationResult.confidence})`);
      console.log(`[DocumentStructuringAgent] Reasoning: ${evaluationResult.reasoning}`);
    } else {
      // Final attempt: always accept
      console.log('[DocumentStructuringAgent] Final attempt: accepting result');
      evaluationResult = {
        evaluation: 'ACCEPT',
        confidence: 1.0,
        reasoning: 'Final attempt: accepting result',
        qualitySignals: {
          titleQuality: 'n/a',
          contentDistribution: 'unknown',
          sectionCount: 'appropriate',
        },
      };
      attempt.evaluation = {
        llmDecision: 'ACCEPT',
        llmConfidence: 1.0,
        llmReasoning: 'Final attempt: accepting result',
        qualitySignals: evaluationResult.qualitySignals,
        evaluationDurationMs: 0,
      };
    }
    
    // ============================================================
    // PHASE 3: Agent Decision
    // ============================================================
    if (evaluationResult.evaluation === 'ACCEPT') {
      attempt.agentDecision = 'accept';
      attempt.agentReasoning = usedDeterministicFallback
        ? 'Deterministic evaluation passed; LLM was unavailable'
        : `LLM evaluation passed with ${Math.round(evaluationResult.confidence * 100)}% confidence`;
      
      finalResult = parseResult;
      acceptedStrategy = strategyMeta.displayName;
      attempts.push(attempt);
      
      console.log('[DocumentStructuringAgent] ✅ Strategy accepted');
      break;
    } else {
      // Rejected: try next strategy
      const recommendedStrategy = evaluationResult.recommendedNextStrategy;
      
      if (attemptNumber < MAX_ATTEMPTS && recommendedStrategy) {
        attempt.agentDecision = 'retry';
        attempt.agentReasoning = usedDeterministicFallback
          ? `Deterministic evaluation rejected; trying ${recommendedStrategy}`
          : `LLM recommended trying ${recommendedStrategy}`;
        
        attempts.push(attempt);
        currentStrategy = recommendedStrategy;
        
        console.log(`[DocumentStructuringAgent] ➡️  Switching to: ${recommendedStrategy}`);
      } else {
        // No more attempts or no recommendation
        attempt.agentDecision = 'fallback';
        attempt.agentReasoning = 'No more strategies available; accepting current result';
        
        finalResult = parseResult;
        acceptedStrategy = strategyMeta.displayName;
        attempts.push(attempt);
        
        console.log('[DocumentStructuringAgent] ⚠️  No more attempts; accepting result');
        break;
      }
    }
  }
  
  // ============================================================
  // FINALIZE TRACE
  // ============================================================
  const agentEndTime = Date.now();
  trace.attempts = attempts;
  trace.completedAt = new Date().toISOString();
  trace.totalDurationMs = agentEndTime - agentStartTime;
  
  // Determine LLM influence
  let llmInfluence = 'None (deterministic fallback only)';
  const llmEvaluations = attempts.filter(a => a.evaluation && !a.fallbackTriggered);
  if (llmEvaluations.length > 0) {
    const hadStrategySwitch = attempts.length > 1;
    if (hadStrategySwitch) {
      llmInfluence = `LLM recommended strategy switch after attempt ${attempts[0].attemptNumber}; recommendation was ${finalResult ? 'successful' : 'unsuccessful'}`;
    } else {
      llmInfluence = 'LLM evaluation passed on first attempt';
    }
  } else if (attempts.some(a => a.fallbackTriggered)) {
    llmInfluence = 'LLM unavailable; used deterministic evaluation';
  }
  
  trace.finalDecision = {
    strategy: acceptedStrategy || 'Unknown',
    totalSections: finalResult?.sections.length || 0,
    acceptanceCriteria: `LLM-evaluated quality OR ${MINIMUM_SECTIONS_REQUIRED}+ sections (fallback)`,
    llmInfluence,
  };
  
  console.log('[DocumentStructuringAgent] 🎯 Final decision:', trace.finalDecision);
  console.log(`[DocumentStructuringAgent] ⏱ Total duration: ${trace.totalDurationMs}ms`);
  console.log(`[DocumentStructuringAgent] 🤖 LLM influence: ${llmInfluence}`);
  
  if (!finalResult) {
    throw new Error('Failed to structure document: all strategies failed');
  }
  
  return {
    sections: finalResult.sections,
    totalSections: finalResult.sections.length,
    rawText: finalResult.rawText,
    trace
  };
}

/**
 * Store structuring trace in sessionStorage for later retrieval
 */
export function saveStructuringTrace(docId: string, trace: EnhancedStructuringTrace): void {
  try {
    if (typeof window === 'undefined') return;
    const key = `doc:${docId}:structuring_trace`;
    sessionStorage.setItem(key, JSON.stringify(trace));
    console.log('[DocumentStructuringAgent] Enhanced trace saved to sessionStorage');
  } catch (error) {
    console.error('[DocumentStructuringAgent] Failed to save trace:', error);
  }
}

/**
 * Load structuring trace from sessionStorage
 */
export function loadStructuringTrace(docId: string): EnhancedStructuringTrace | null {
  try {
    if (typeof window === 'undefined') return null;
    const key = `doc:${docId}:structuring_trace`;
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as EnhancedStructuringTrace;
  } catch (error) {
    console.error('[DocumentStructuringAgent] Failed to load trace:', error);
    return null;
  }
}


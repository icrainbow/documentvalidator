/**
 * Flow2: KYC Risk Assessment Module
 * 
 * LLM-first + Guaranteed Fallback Approach:
 * - Primary: LLM-based risk analysis (Anthropic Claude)
 * - Fallback: Pattern-based classifier (demo guardrail)
 * 
 * Guarantees HITL triggering for high-risk documents in demo environment.
 */

import type { TopicSection } from './types';

export interface RiskSignal {
  category: 'kyc_risk' | 'sanctions' | 'pep' | 'aml' | 'ubo' | 'tax_evasion';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  evidence: string[]; // Snippets from document
  source: 'llm' | 'guardrail_classifier' | 'keyword';
}

export interface RiskAssessmentResult {
  signals: RiskSignal[];
  requires_human_review: boolean;
  source: 'llm' | 'fallback' | 'degraded';
  execution_path: string; // For debugging
}

interface AssessmentOptions {
  enableFallback?: boolean;
  llmProvider?: 'anthropic' | 'mock';
}

/**
 * Main entry point: Assess KYC risks using LLM-first + fallback strategy
 */
export async function assessKYCRisks(
  documents: { name: string; content: string }[],
  topicSections: TopicSection[],
  options: AssessmentOptions = {}
): Promise<RiskAssessmentResult> {
  const enableFallback = options.enableFallback ?? shouldEnableGuardrail();
  
  console.log(`[Flow2/Risk] Starting risk assessment for ${documents.length} document(s)`);
  console.log(`[Flow2/Risk] Fallback guardrail: ${enableFallback ? 'ENABLED' : 'DISABLED'}`);
  
  // Step 1: Try LLM-based analysis (primary path)
  let llmSignals: RiskSignal[] | null = null;
  let llmError: string | null = null;
  
  try {
    llmSignals = await runLLMRiskAnalysis(documents, topicSections);
    
    if (llmSignals && llmSignals.length > 0) {
      console.log(`[Flow2/Risk] LLM analysis successful: ${llmSignals.length} signal(s) found`);
      const requiresReview = llmSignals.some(s => s.severity === 'HIGH');
      
      return {
        signals: llmSignals,
        requires_human_review: requiresReview,
        source: 'llm',
        execution_path: 'llm_success'
      };
    }
    
    // LLM returned empty array (no risks found)
    console.log('[Flow2/Risk] LLM analysis returned empty (no risks detected)');
    llmError = 'LLM returned empty result';
    
  } catch (error: any) {
    console.error('[Flow2/Risk] LLM analysis failed:', error.message);
    llmError = error.message;
  }
  
  // Step 2: Fallback classifier (if enabled and LLM failed/empty)
  if (enableFallback) {
    console.log(`[Flow2/Risk] LLM path unsuccessful (${llmError}), triggering fallback classifier`);
    
    const fallbackSignals = runFallbackClassifier(documents);
    
    if (fallbackSignals.length > 0) {
      console.log(`[Flow2/Risk] Fallback classifier: ${fallbackSignals.length} HIGH-risk signal(s) injected`);
      
      return {
        signals: fallbackSignals,
        requires_human_review: true, // Fallback signals are always HIGH severity
        source: 'fallback',
        execution_path: `llm_failed_or_empty -> fallback_triggered (${fallbackSignals.length} signals)`
      };
    }
    
    console.log('[Flow2/Risk] Fallback classifier: No high-risk patterns matched');
  }
  
  // Step 3: No risks found (graceful degradation)
  console.log('[Flow2/Risk] No risks identified via LLM or fallback');
  
  return {
    signals: [],
    requires_human_review: false,
    source: 'degraded',
    execution_path: llmError ? `llm_failed -> fallback_disabled_or_no_match` : 'llm_empty_no_fallback'
  };
}

/**
 * LLM-based risk analysis (primary path)
 * Returns null if LLM unavailable or parsing fails
 */
async function runLLMRiskAnalysis(
  documents: { name: string; content: string }[],
  topicSections: TopicSection[]
): Promise<RiskSignal[] | null> {
  // Check if LLM is available
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[Flow2/Risk/LLM] No ANTHROPIC_API_KEY found, LLM path unavailable');
    return null;
  }
  
  // TODO: Implement actual Anthropic API call
  // For now, return null to trigger fallback in demo/test environments
  console.log('[Flow2/Risk/LLM] LLM provider not yet implemented, returning null');
  return null;
  
  /* Future implementation:
  const prompt = `Analyze the following KYC documents for high-risk indicators...`;
  const response = await anthropic.messages.create({...});
  const parsed = parseRiskSignalsFromLLM(response);
  return parsed;
  */
}

/**
 * Fallback pattern-based classifier (demo guardrail)
 * 
 * Covers 3 trigger document types:
 * 1. PEP + Sanctions + ID mismatch
 * 2. UBO unknown + offshore + layering
 * 3. Cash-intensive + crypto mixer + tax evasion
 */
function runFallbackClassifier(
  documents: { name: string; content: string }[]
): RiskSignal[] {
  const signals: RiskSignal[] = [];
  
  // Merge all document content
  const allText = documents.map(d => d.content).join('\n\n');
  const allTextLower = allText.toLowerCase();
  
  // High-risk patterns (any match triggers HIGH severity)
  // IMPORTANT: Patterns must match POSITIVE assertions, not negations
  const HIGH_RISK_PATTERNS = [
    // Category 1: PEP + Sanctions (must be positive affirmation)
    {
      regex: /\b(confirmed?|declares?|has|holding|current|former|affiliated with).{0,80}(politically\s+exposed\s+person|\bpep\b status)/i,
      category: 'pep' as const,
      title: 'Politically Exposed Person (PEP) Detected',
      keywords: ['politically exposed person', 'PEP', 'government affiliation']
    },
    {
      regex: /\b(sanction(s|ed)?|ofac|watchlist).{0,30}(detected|flagged|exposure|list|entity|connection|relationship)/i,
      category: 'sanctions' as const,
      title: 'Sanctions Exposure Detected',
      keywords: ['sanctions', 'OFAC', 'watchlist', 'sanctioned entity']
    },
    
    // Category 2: UBO + Offshore (must indicate actual problem)
    {
      regex: /(beneficial owner|UBO).{0,60}(unknown|undisclosed|refuse|concealed|unverifiable|to be determined|not provided)/i,
      category: 'ubo' as const,
      title: 'Ultimate Beneficial Ownership Unknown or Concealed',
      keywords: ['UBO', 'beneficial owner unknown', 'undisclosed ownership']
    },
    {
      regex: /\b(offshore|bvi|british virgin islands|cayman|cyprus|panama).{0,60}(jurisdiction|holding|structure|entity|shell|account)/i,
      category: 'kyc_risk' as const,
      title: 'High-Risk Offshore Jurisdiction Exposure',
      keywords: ['offshore', 'BVI', 'Cayman', 'Cyprus', 'Panama']
    },
    {
      regex: /\b(layering|structuring|shell company).{0,30}(detected|pattern|concern|indicator|typology)/i,
      category: 'aml' as const,
      title: 'Money Laundering Typology Indicators (Layering/Structuring)',
      keywords: ['layering', 'structuring', 'shell company']
    },
    
    // Category 3: Cash + Crypto + Tax Evasion (must indicate problematic activity)
    {
      regex: /\b(cash[-\s]?intensive|large cash|cash deposit).{0,40}(business|deposits?|concern|pattern|risk)/i,
      category: 'aml' as const,
      title: 'Cash-Intensive Business Model (Placement Risk)',
      keywords: ['cash-intensive', 'large cash deposits']
    },
    {
      regex: /\b(tornado\s?cash|chip\s?mixer|crypto.{0,20}(mixer|tumbler)|privacy coin|monero).{0,30}(usage|detected|transaction|service)/i,
      category: 'aml' as const,
      title: 'Cryptocurrency Mixing/Tumbler Services Usage',
      keywords: ['crypto mixer', 'TornadoCash', 'ChipMixer', 'privacy coin', 'Monero']
    },
    {
      regex: /\b(tax evasion|unreported income|undeclared|income discrepancy).{0,30}(detected|indicator|concern|violation)/i,
      category: 'tax_evasion' as const,
      title: 'Tax Evasion Indicators Detected',
      keywords: ['tax evasion', 'unreported income', 'income discrepancy']
    },
    
    // Additional critical keywords (must have problem context)
    {
      regex: /\b(adverse media|reputational risk|regulatory investigation).{0,30}(identified|ongoing|flagged|detected)/i,
      category: 'kyc_risk' as const,
      title: 'Adverse Media or Regulatory Investigation',
      keywords: ['adverse media', 'investigation']
    },
    {
      regex: /\b(suspicious activity|SAR|financial crime).{0,30}(report|detected|indicator|flagged|concern)/i,
      category: 'aml' as const,
      title: 'Suspicious Activity Indicators',
      keywords: ['suspicious activity', 'SAR', 'financial crime']
    }
  ];
  
  // Check each pattern
  const matchedPatterns: typeof HIGH_RISK_PATTERNS = [];
  
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.regex.test(allText)) {
      matchedPatterns.push(pattern);
    }
  }
  
  // If ANY high-risk pattern matched, generate signal
  if (matchedPatterns.length > 0) {
    console.log(`[Flow2/Risk/Fallback] Matched ${matchedPatterns.length} HIGH-risk pattern(s):`);
    matchedPatterns.forEach(p => console.log(`  - ${p.title}`));
    
    // Extract evidence snippets
    const evidence = extractEvidenceSnippets(allText, matchedPatterns);
    
    // Create aggregated signal
    const signal: RiskSignal = {
      category: 'kyc_risk', // Umbrella category
      severity: 'HIGH',
      title: 'Critical KYC Risk Indicators Detected',
      description: `Guardrail classifier flagged ${matchedPatterns.length} high-risk pattern(s): ${
        matchedPatterns.map(p => p.category).join(', ')
      }. Patterns matched: ${matchedPatterns.map(p => p.keywords[0]).join('; ')}.`,
      evidence,
      source: 'guardrail_classifier'
    };
    
    signals.push(signal);
  }
  
  return signals;
}

/**
 * Extract evidence snippets from document text
 */
function extractEvidenceSnippets(
  text: string,
  patterns: Array<{ regex: RegExp; title: string }>
): string[] {
  const snippets: string[] = [];
  const maxSnippets = 3;
  const snippetLength = 160;
  
  for (const pattern of patterns) {
    if (snippets.length >= maxSnippets) break;
    
    const match = pattern.regex.exec(text);
    if (match) {
      const matchIndex = match.index;
      const start = Math.max(0, matchIndex - 60);
      const end = Math.min(text.length, matchIndex + 100);
      const snippet = text.substring(start, end).trim().replace(/\s+/g, ' ');
      
      snippets.push(`[${pattern.title.substring(0, 40)}...] "${snippet.substring(0, snippetLength)}"`);
    }
  }
  
  return snippets.length > 0 ? snippets : ['Multiple high-risk keywords detected across document'];
}

/**
 * Determine if guardrail should be enabled
 * 
 * Default:
 * - Development: ENABLED (unless explicitly disabled)
 * - Test: ENABLED (forced)
 * - Production: DISABLED (unless explicitly enabled)
 */
function shouldEnableGuardrail(): boolean {
  const env = process.env.NODE_ENV;
  const explicit = process.env.FLOW2_DEMO_GUARDRAIL;
  
  // Explicit setting takes precedence
  if (explicit === '1' || explicit === 'true') return true;
  if (explicit === '0' || explicit === 'false') return false;
  
  // Test environment: always enable
  if (env === 'test') return true;
  
  // Development: enable by default
  if (env === 'development' || !env) return true;
  
  // Production: disable by default
  return false;
}


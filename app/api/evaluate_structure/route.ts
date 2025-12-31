/**
 * API Route: Structure Quality Evaluation
 * 
 * Uses LLM to evaluate the quality of a document parse result
 * and recommend next parsing strategy if needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type {
  StructureEvaluationRequest,
  StructureEvaluationResponse,
  ParsingStrategy,
} from '@/app/lib/types/structuring';

// Zod schema for LLM output validation
const EvaluationResponseSchema = z.object({
  evaluation: z.enum(['ACCEPT', 'REJECT']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(10).max(1000),
  qualitySignals: z.object({
    titleQuality: z.enum(['good', 'poor', 'mixed', 'n/a']),
    contentDistribution: z.enum(['balanced', 'skewed', 'unknown']),
    sectionCount: z.enum(['appropriate', 'too_few', 'too_many']),
  }),
  recommendedNextStrategy: z.enum([
    'heading_2_split',
    'heading_1_split',
    'text_pattern_analysis',
    'aggressive_split',
  ]).optional(),
});

// Valid strategy pool (guardrail)
const VALID_STRATEGIES: ParsingStrategy[] = [
  'heading_2_split',
  'heading_1_split',
  'text_pattern_analysis',
  'aggressive_split',
];

/**
 * POST /api/evaluate_structure
 * 
 * Evaluate structure quality using LLM
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: StructureEvaluationRequest = await request.json();
    
    // Validate required fields
    if (!body.documentMetadata || !body.strategyUsed || !body.parseResult) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[EvaluateStructure] ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { error: 'LLM service not configured', fallback: true },
        { status: 503 }
      );
    }
    
    const anthropic = new Anthropic({ apiKey });
    
    // Build evaluation prompt
    const prompt = buildEvaluationPrompt(body);
    
    console.log('[EvaluateStructure] Calling LLM for evaluation...');
    console.log('[EvaluateStructure] Strategy:', body.strategyUsed);
    console.log('[EvaluateStructure] Sections detected:', body.parseResult.sectionsDetected);
    
    // Call LLM with timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    let response;
    try {
      response = await anthropic.messages.create(
        {
          model: 'claude-3-haiku-20240307', // Fast, cost-efficient model
          max_tokens: 1000,
          temperature: 0.1, // Low temperature for consistency
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        { signal: controller.signal as any }
      );
    } finally {
      clearTimeout(timeoutId);
    }
    
    // Extract text from response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in LLM response');
    }
    
    const rawText = textContent.text;
    console.log('[EvaluateStructure] LLM response received');
    
    // Parse JSON from LLM response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }
    
    const parsedResponse = JSON.parse(jsonMatch[0]);
    
    // Validate against schema
    const validated = EvaluationResponseSchema.parse(parsedResponse);
    
    // Guardrail: Validate recommended strategy is in allowed pool
    if (validated.recommendedNextStrategy && 
        !VALID_STRATEGIES.includes(validated.recommendedNextStrategy)) {
      console.warn('[EvaluateStructure] LLM recommended invalid strategy:', validated.recommendedNextStrategy);
      validated.recommendedNextStrategy = 'text_pattern_analysis'; // Safe fallback
    }
    
    // Guardrail: Don't recommend same strategy
    if (validated.recommendedNextStrategy === body.strategyUsed) {
      console.warn('[EvaluateStructure] LLM recommended same strategy, switching to fallback');
      validated.recommendedNextStrategy = 'text_pattern_analysis';
    }
    
    // Guardrail: Don't recommend already-tried strategies
    if (body.previousAttempts && validated.recommendedNextStrategy) {
      const alreadyTried = body.previousAttempts.some(
        (a) => a.strategy === validated.recommendedNextStrategy
      );
      if (alreadyTried) {
        console.warn('[EvaluateStructure] LLM recommended already-tried strategy');
        validated.recommendedNextStrategy = 'text_pattern_analysis';
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[EvaluateStructure] ✓ Evaluation complete in ${duration}ms`);
    console.log(`[EvaluateStructure] Decision: ${validated.evaluation} (confidence: ${validated.confidence})`);
    
    const result: StructureEvaluationResponse = {
      evaluation: validated.evaluation,
      confidence: validated.confidence,
      reasoning: validated.reasoning,
      qualitySignals: validated.qualitySignals,
      recommendedNextStrategy: validated.recommendedNextStrategy,
    };
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Check if it's a timeout
    if (error.name === 'AbortError') {
      console.error(`[EvaluateStructure] ⏱ Timeout after ${duration}ms`);
      return NextResponse.json(
        { error: 'LLM evaluation timeout', fallback: true },
        { status: 504 }
      );
    }
    
    // Check if it's a validation error
    if (error instanceof z.ZodError) {
      console.error('[EvaluateStructure] Validation error:', error.errors);
      return NextResponse.json(
        { error: 'Invalid LLM response format', fallback: true, details: error.errors },
        { status: 500 }
      );
    }
    
    console.error('[EvaluateStructure] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Evaluation failed', fallback: true },
      { status: 500 }
    );
  }
}

/**
 * Build evaluation prompt for LLM
 */
function buildEvaluationPrompt(req: StructureEvaluationRequest): string {
  const { documentMetadata, strategyUsed, attemptNumber, parseResult, previousAttempts } = req;
  
  // Format sections for LLM (limit to first 10 for token efficiency)
  const sectionsDisplay = parseResult.sections.slice(0, 10).map((s, i) => {
    return `Section ${i + 1}: "${s.title}"
  - Paragraphs: ${s.paragraphCount}
  - Length: ${s.contentLength} chars
  - Sample: "${s.sampleContent.substring(0, 150)}..."`;
  }).join('\n\n');
  
  const moreSections = parseResult.sections.length > 10 
    ? `\n(... and ${parseResult.sections.length - 10} more sections)` 
    : '';
  
  const previousAttemptsText = previousAttempts && previousAttempts.length > 0
    ? `\nPrevious attempts:\n${previousAttempts.map(a => `- ${a.strategy}: ${a.sectionsDetected} sections`).join('\n')}`
    : '';
  
  return `You are a Structure Quality Evaluator for document parsing.

Your task: Evaluate if a document parse result represents high-quality structure.

Document Context:
- Total characters: ${documentMetadata.totalCharacters}
- Heading 1 elements: ${documentMetadata.h1Count}
- Heading 2 elements: ${documentMetadata.h2Count}
- Heading 3 elements: ${documentMetadata.h3Count}

Parsing Strategy Used: ${strategyUsed}
Attempt Number: ${attemptNumber}${previousAttemptsText}

Parse Result:
- Sections detected: ${parseResult.sectionsDetected}

${sectionsDisplay}${moreSections}

Your evaluation criteria:
1. Title Quality: Are section titles meaningful, distinct, and descriptive?
2. Content Distribution: Is content reasonably distributed across sections, or is one section dominant?
3. Section Count: Is the number of sections appropriate for the document length?

Consider:
- A document with ${documentMetadata.totalCharacters} characters typically benefits from ${Math.max(3, Math.floor(documentMetadata.totalCharacters / 2000))}+ sections
- Meaningful titles should reflect the content purpose (avoid generic "Section 1", "Document", etc.)
- If heading counts suggest untapped structure (e.g., many H1s but used H2 split), recommend switching

If you REJECT the result, recommend ONE of these strategies (do NOT invent new ones):
- heading_2_split: Split by Heading 2 styles
- heading_1_split: Split by Heading 1 styles
- text_pattern_analysis: Fallback pattern matching
- aggressive_split: Try both H1 and H2

Output ONLY valid JSON (no markdown, no explanations outside JSON):
{
  "evaluation": "ACCEPT" or "REJECT",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation (max 200 chars)",
  "qualitySignals": {
    "titleQuality": "good" | "poor" | "mixed" | "n/a",
    "contentDistribution": "balanced" | "skewed" | "unknown",
    "sectionCount": "appropriate" | "too_few" | "too_many"
  },
  "recommendedNextStrategy": "strategy_name" (optional, only if REJECT)
}`;
}


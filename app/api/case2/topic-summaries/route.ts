/**
 * Case2: CS Integration Exception Topic Summaries API Route
 * 
 * POST /api/case2/topic-summaries
 * 
 * Thin wrapper around generic topic summaries engine using CASE2_CS_INTEGRATION_CONFIG.
 * Called when user accepts Case2 recommended process.
 * 
 * FEATURES:
 * - Multi-document aggregation via generic engine
 * - No risk linking (unlike KYC route - Case2 is demo-only)
 * - Always returns exactly 6 Case2 topics
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CASE2_CS_INTEGRATION_CONFIG } from '@/app/lib/topicSummaries/configs';
import { callTopicSummariesEngine } from '@/app/lib/topicSummaries/engine';
import { TopicSummariesSuccessSchema, TopicSummariesErrorSchema } from '@/app/lib/topicSummaries/schemas';

// Request schema for Case2 topic summaries
const Case2TopicSummariesRequestSchema = z.object({
  case2_id: z.string().min(1, 'case2_id is required'),
  documents: z.array(z.object({
    doc_id: z.string(),
    filename: z.string(),
    text: z.string(),
  })).min(1, 'At least one document is required'),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate request
    const body = await request.json();
    const validated = Case2TopicSummariesRequestSchema.parse(body);

    console.log(`[Case2/TopicSummaries] Request: case2_id=${validated.case2_id}, docs=${validated.documents.length}`);

    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('[Case2/TopicSummaries] ANTHROPIC_API_KEY not configured');

      const errorResponse = TopicSummariesErrorSchema.parse({
        ok: false,
        run_id: validated.case2_id, // Reuse run_id field for case2_id
        error: 'LLM provider not configured (ANTHROPIC_API_KEY missing)',
        fallback: true,
      });

      return NextResponse.json(errorResponse, { status: 503 });
    }

    // Call generic engine with Case2 config
    const engineOutput = await callTopicSummariesEngine(
      {
        config: CASE2_CS_INTEGRATION_CONFIG,
        documents: validated.documents,
        // No risks for Case2 (demo-only path)
      },
      apiKey
    );

    // Return success response (no risk linking for Case2)
    const successResponse = TopicSummariesSuccessSchema.parse({
      ok: true,
      run_id: validated.case2_id, // Reuse run_id field for case2_id
      topic_summaries: engineOutput.topic_summaries,
      model_used: engineOutput.model_used,
      duration_ms: Date.now() - startTime,
    });

    console.log(`[Case2/TopicSummaries] ✓ Success: ${engineOutput.topic_summaries.length} topics returned`);

    return NextResponse.json(successResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Case2/TopicSummaries] Error:', error);

    // Try to extract case2_id from body if available
    let case2Id: string | undefined;
    try {
      const body = await request.json();
      case2Id = body.case2_id;
    } catch {
      // Ignore if body can't be parsed again
    }

    const errorResponse = TopicSummariesErrorSchema.parse({
      ok: false,
      run_id: case2Id,
      error: error.message || 'Internal server error',
      fallback: true,
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}


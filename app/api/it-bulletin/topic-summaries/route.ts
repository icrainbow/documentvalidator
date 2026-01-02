/**
 * IT Bulletin: Topic Summaries API Route
 * 
 * POST /api/it-bulletin/topic-summaries
 * 
 * Thin wrapper around generic topic summaries engine using IT_BULLETIN_CONFIG.
 * Generates impact analysis for IT change bulletins.
 * 
 * FEATURES:
 * - Multi-document aggregation via generic engine
 * - Always returns exactly 5 IT bulletin topics
 * - No risk linking (IT-specific: focuses on change impact, not risk)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { IT_BULLETIN_CONFIG } from '@/app/lib/topicSummaries/configs';
import { callTopicSummariesEngine } from '@/app/lib/topicSummaries/engine';
import { TopicSummariesSuccessSchema, TopicSummariesErrorSchema } from '@/app/lib/topicSummaries/schemas';

// Request schema (same structure as KYC, but no risks field)
const ITRequestSchema = z.object({
  run_id: z.string(),
  documents: z.array(
    z.object({
      doc_id: z.string(),
      filename: z.string(),
      text: z.string(),
    })
  ).min(1),
  topics: z.array(z.string()).length(5), // 5 IT topics (validated by config)
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate request
    const body = await request.json();
    const validated = ITRequestSchema.parse(body);

    console.log(`[IT/Bulletin/TopicSummaries] Request: run_id=${validated.run_id}, docs=${validated.documents.length}`);

    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('[IT/Bulletin/TopicSummaries] ANTHROPIC_API_KEY not configured');

      const errorResponse = TopicSummariesErrorSchema.parse({
        ok: false,
        run_id: validated.run_id,
        error: 'LLM provider not configured (ANTHROPIC_API_KEY missing)',
        fallback: true,
      });

      return NextResponse.json(errorResponse, { status: 503 });
    }

    // Call generic engine with IT config
    const engineOutput = await callTopicSummariesEngine(
      {
        config: IT_BULLETIN_CONFIG,
        documents: validated.documents,
        risks: undefined, // IT doesn't use risk linking
      },
      apiKey
    );

    // Return success response
    const successResponse = TopicSummariesSuccessSchema.parse({
      ok: true,
      run_id: validated.run_id,
      topic_summaries: engineOutput.topic_summaries,
      model_used: engineOutput.model_used,
      duration_ms: Date.now() - startTime,
    });

    console.log(`[IT/Bulletin/TopicSummaries] ✓ Success: ${engineOutput.topic_summaries.length} topics returned`);

    return NextResponse.json(successResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[IT/Bulletin/TopicSummaries] Error:', error);

    // Try to extract run_id from body if available
    let runId: string | undefined;
    try {
      const body = await request.json();
      runId = body.run_id;
    } catch {
      // Ignore if body can't be parsed again
    }

    const errorResponse = TopicSummariesErrorSchema.parse({
      ok: false,
      run_id: runId,
      error: error.message || 'Internal server error',
      fallback: true,
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}


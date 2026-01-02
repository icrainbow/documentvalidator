/**
 * Flow2: KYC Topics Summary API Route (REFACTORED)
 * 
 * POST /api/flow2/topic-summaries
 * 
 * Thin wrapper around generic topic summaries engine using KYC_FLOW2_CONFIG.
 * Backward compatible with existing Flow2 UI.
 * 
 * FEATURES:
 * - Multi-document aggregation via generic engine
 * - Risk-to-topic linking (KYC-specific)
 * - Always returns exactly 8 KYC topics
 */

import { NextRequest, NextResponse } from 'next/server';
import { RequestSchema } from '@/app/lib/flow2/kycTopicsSchema';
import { KYC_FLOW2_CONFIG } from '@/app/lib/topicSummaries/configs';
import { callTopicSummariesEngine } from '@/app/lib/topicSummaries/engine';
import { TopicSummariesSuccessSchema, TopicSummariesErrorSchema } from '@/app/lib/topicSummaries/schemas';
import { buildTopicRiskLinks } from '@/app/lib/flow2/riskTopicMapper';
import type { GenericTopicSummary } from '@/app/lib/topicSummaries/types';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate request (backward compatible with existing schema)
    const body = await request.json();
    const validated = RequestSchema.parse(body);

    console.log(`[Flow2/KYC/TopicSummaries] Request: run_id=${validated.run_id}, docs=${validated.documents.length}, risks=${validated.risks?.length || 0}`);

    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('[Flow2/KYC/TopicSummaries] ANTHROPIC_API_KEY not configured');

      const errorResponse = TopicSummariesErrorSchema.parse({
        ok: false,
        run_id: validated.run_id,
        error: 'LLM provider not configured (ANTHROPIC_API_KEY missing)',
        fallback: true,
      });

      return NextResponse.json(errorResponse, { status: 503 });
    }

    // Call generic engine with KYC config
    const engineOutput = await callTopicSummariesEngine(
      {
        config: KYC_FLOW2_CONFIG,
        documents: validated.documents,
        risks: validated.risks,
      },
      apiKey
    );

    // KYC-specific: Add risk linking
    let topicsWithRisks: GenericTopicSummary[] = engineOutput.topic_summaries;

    if (validated.risks && validated.risks.length > 0) {
      console.log(`[Flow2/KYC/TopicSummaries] Building risk links from ${validated.risks.length} risk(s)`);

      const riskLinkMap = buildTopicRiskLinks(validated.risks);

      topicsWithRisks = engineOutput.topic_summaries.map((topic) => ({
        ...topic,
        linked_risks: riskLinkMap.get(topic.topic_id as any) || [],
      }));

      console.log(`[Flow2/KYC/TopicSummaries] Risk linking complete: ${riskLinkMap.size} topic(s) have linked risks`);
    }

    // Return success response
    const successResponse = TopicSummariesSuccessSchema.parse({
      ok: true,
      run_id: validated.run_id,
      topic_summaries: topicsWithRisks,
      model_used: engineOutput.model_used,
      duration_ms: Date.now() - startTime,
    });

    console.log(`[Flow2/KYC/TopicSummaries] ✓ Success: ${topicsWithRisks.length} topics returned`);

    return NextResponse.json(successResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Flow2/KYC/TopicSummaries] Error:', error);

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

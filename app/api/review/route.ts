import { NextRequest, NextResponse } from 'next/server';
import type { ReviewRequest, ReviewResult } from '../../lib/types/review';
import { callClaudeForReview } from '../../lib/llmReviewExecutor';

/**
 * REAL LLM-Backed Review API - NO FAKE/DEMO LOGIC
 * All decisions come from Claude AI with structured JSON validation
 * 
 * Stage 3.5: Simplified to pure executor (section/document modes only)
 * Use /api/orchestrate for batch_review mode
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ReviewRequest = await request.json();

    // Validate input
    if (!body.documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
      return NextResponse.json(
        { error: 'sections array is required and must not be empty' },
        { status: 400 }
      );
    }

    // REJECT batch_review mode - must use /api/orchestrate
    if (body.mode !== 'section' && body.mode !== 'document') {
      return NextResponse.json(
        { error: 'Invalid mode. Expected "section" or "document". Use /api/orchestrate for batch_review.' },
        { status: 400 }
      );
    }

    if (body.mode === 'section' && !body.sectionId) {
      return NextResponse.json(
        { error: 'sectionId is required when mode is "section"' },
        { status: 400 }
      );
    }

    console.log(`[review] Starting ${body.mode} review for document ${body.documentId}`);
    
    const reviewStart = Date.now();
    
    // Call real LLM-backed agents
    const agentResult = await callClaudeForReview(
      body.sections,
      body.mode,
      body.sectionId,
      body.config
    );
    
    const reviewMs = Date.now() - reviewStart;

    const result: ReviewResult = {
      issues: agentResult.issues,
      remediations: agentResult.remediations,
      reviewedAt: new Date().toISOString(),
      runId: `run-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };

    console.log(`[review] Completed: ${result.issues.length} issues found (${reviewMs}ms)`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[review] Error:', error);
    return NextResponse.json(
      {
        error: 'Review failed',
        details: error.message || 'Unknown error',
        issues: [], // Return empty on error - fail closed
        remediations: [],
        reviewedAt: new Date().toISOString(),
        runId: `error-${Date.now()}`
      },
      { status: 500 }
    );
  }
}


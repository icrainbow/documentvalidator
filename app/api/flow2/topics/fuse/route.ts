import { NextRequest, NextResponse } from 'next/server';
import { fuseIncremental, fuseFullRebuild, type FusionRequest } from '../../../../lib/flow2/topicFusion';

export const runtime = 'nodejs';

/**
 * POST /api/flow2/topics/fuse
 * 
 * Fuses new documents into derived topics.
 * Supports two modes:
 * - incremental: updates a single topic
 * - full_rebuild: regenerates all topics from all documents
 */
export async function POST(request: NextRequest) {
  try {
    const body: FusionRequest = await request.json();

    if (!body.mode || !body.topic_key || !body.new_docs) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: mode, topic_key, new_docs' },
        { status: 400 }
      );
    }

    if (body.mode === 'incremental') {
      if (!body.existing_topic) {
        return NextResponse.json(
          { ok: false, error: 'existing_topic is required for incremental mode' },
          { status: 400 }
        );
      }

      const result = fuseIncremental(body);
      return NextResponse.json(result);
    }

    if (body.mode === 'full_rebuild') {
      if (!body.existing_docs) {
        return NextResponse.json(
          { ok: false, error: 'existing_docs is required for full_rebuild mode' },
          { status: 400 }
        );
      }

      const result = fuseFullRebuild(body);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid mode. Must be "incremental" or "full_rebuild"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API] /api/flow2/topics/fuse error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


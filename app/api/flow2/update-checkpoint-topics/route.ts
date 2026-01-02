/**
 * Flow2 API: Update Checkpoint Topic Summaries
 * 
 * Stores topic summaries in the checkpoint for email inclusion and persistence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadCheckpoint, saveCheckpoint } from '@/app/lib/flow2/checkpointStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { run_id, topic_summaries } = body;
    
    if (!run_id) {
      return NextResponse.json(
        { ok: false, error: 'run_id is required' },
        { status: 400 }
      );
    }
    
    if (!topic_summaries || !Array.isArray(topic_summaries)) {
      return NextResponse.json(
        { ok: false, error: 'topic_summaries must be an array' },
        { status: 400 }
      );
    }
    
    // Load checkpoint
    const checkpoint = await loadCheckpoint(run_id);
    if (!checkpoint) {
      return NextResponse.json(
        { ok: false, error: 'Checkpoint not found' },
        { status: 404 }
      );
    }
    
    // Update topic_summaries
    checkpoint.topic_summaries = topic_summaries;
    
    // Save checkpoint
    await saveCheckpoint(checkpoint);
    
    console.log(`[Flow2] Updated checkpoint ${run_id} with ${topic_summaries.length} topic summaries`);
    
    return NextResponse.json({
      ok: true,
      run_id,
      topic_count: topic_summaries.length,
    });
  } catch (error: any) {
    console.error('[Flow2/UpdateCheckpointTopics] Error:', error.message);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}


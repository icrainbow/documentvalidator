import { NextRequest, NextResponse } from 'next/server';
import { loadCheckpoint, saveCheckpoint } from '@/app/lib/flow2/checkpointStore';
import { z } from 'zod';

const RequestSchema = z.object({
  run_id: z.string(),
  animation_played: z.boolean(),
});

/**
 * Update checkpoint to mark post-reject animation as played
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = RequestSchema.parse(body);

    const checkpoint = await loadCheckpoint(validated.run_id);
    if (!checkpoint) {
      return NextResponse.json({ ok: false, error: 'Checkpoint not found' }, { status: 404 });
    }

    // Update demo_evidence.animation_played
    if (!checkpoint.demo_evidence) {
      checkpoint.demo_evidence = {};
    }
    checkpoint.demo_evidence.animation_played = validated.animation_played;

    await saveCheckpoint(checkpoint);
    console.log(`[API/update-checkpoint-animation] Updated run ${validated.run_id}: animation_played=${validated.animation_played}`);

    return NextResponse.json({ ok: true, message: 'Animation played status updated' });
  } catch (error: any) {
    console.error('[API/update-checkpoint-animation] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}


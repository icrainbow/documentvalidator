/**
 * Flow2 Demo: Post-Reject Tasks Update Endpoint
 * 
 * Updates the post_reject_tasks artifact in checkpoint metadata.
 * Used to transition tasks from 'running' → 'done' after initial animation.
 * 
 * DEMO ONLY - No real orchestration.
 */

import { NextResponse } from 'next/server';
import { loadCheckpoint, updateCheckpointStatus } from '@/app/lib/flow2/checkpointStore';

export const runtime = 'nodejs';

/**
 * POST /api/flow2/demo/post-reject-tasks
 * 
 * Body: { run_id: string, complete: boolean }
 * 
 * If complete=true: Mark all tasks as 'done' and artifact status as 'done'
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { run_id, complete } = body;
    
    if (!run_id) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing run_id parameter' 
      }, { status: 400 });
    }
    
    // Load checkpoint
    const checkpoint = await loadCheckpoint(run_id);
    if (!checkpoint) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Checkpoint not found',
        run_id 
      }, { status: 404 });
    }
    
    if (!complete) {
      // No-op if not completing
      return NextResponse.json({ ok: true, run_id, noop: true });
    }
    
    // Build completed artifact
    const completedTasks = [
      { 
        id: 'A', 
        title: 'De-obfuscate current SOF disclosure', 
        status: 'done' as const,
        detail: 'Extracted: Client stated $5M from business sale (Q3 2024)'
      },
      { 
        id: 'B', 
        title: 'Cross-check Wealth division 2024 annual report', 
        status: 'done' as const,
        detail: 'Retrieved: Q4 2024 Wealth report shows $50M AUM for same client'
      },
      { 
        id: 'C', 
        title: 'Validate UBO offshore holding chain', 
        status: 'done' as const,
        detail: 'Mapped: 3-layer structure (BVI → Cayman → Swiss trust)'
      },
    ];
    
    // Update checkpoint metadata with completed artifact
    await updateCheckpointStatus(run_id, checkpoint.status, {
      artifacts: {
        ...checkpoint.artifacts,
        post_reject_tasks: {
          run_id,
          status: 'done',
          tasks: completedTasks
        }
      }
    } as any);
    
    console.log(`[Flow2/PostRejectTasks] ✅ Marked all tasks as done for run ${run_id}`);
    
    return NextResponse.json({
      ok: true,
      run_id,
      tasks: completedTasks,
      status: 'done'
    });
    
  } catch (error: any) {
    console.error('[Flow2/PostRejectTasks] Error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}


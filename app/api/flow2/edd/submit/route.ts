/**
 * Flow2: EDD Decision Submit Endpoint (Stage 2)
 * 
 * GET /api/flow2/edd/submit?token=...&action=approve
 * - One-click approve via email link
 * 
 * POST /api/flow2/edd/submit
 * - Body: { token, action: 'reject', reason }
 * - Used by reject form
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadCheckpoint, getTokenMetadata, saveCheckpoint } from '@/app/lib/flow2/checkpointStore';

export const runtime = 'nodejs';

// ========================================
// GET: One-click EDD approve
// ========================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const token = searchParams.get('token');
  const action = searchParams.get('action');
  
  // Validate parameters
  if (!token) {
    return NextResponse.json({
      ok: false,
      error: 'Missing required parameter: token',
    }, { status: 400 });
  }
  
  if (action !== 'approve') {
    return NextResponse.json({
      ok: false,
      error: 'GET only supports action=approve. Use POST for reject.',
    }, { status: 400 });
  }
  
  // Resolve token to run_id
  const tokenMetadata = await getTokenMetadata(token.trim());
  
  if (!tokenMetadata) {
    return NextResponse.json({
      ok: false,
      error: 'Invalid or expired EDD approval token',
    }, { status: 404 });
  }
  
  // Verify token is for EDD (not stage 1)
  if (tokenMetadata.type !== 'edd') {
    return NextResponse.json({
      ok: false,
      error: 'Token is not an EDD approval token',
    }, { status: 400 });
  }
  
  const run_id = tokenMetadata.run_id;
  
  // Load checkpoint
  const checkpoint = await loadCheckpoint(run_id);
  
  if (!checkpoint) {
    return NextResponse.json({
      ok: false,
      error: 'Checkpoint not found',
      run_id,
    }, { status: 404 });
  }
  
  // Verify checkpoint has EDD stage
  if (!checkpoint.edd_stage) {
    return NextResponse.json({
      ok: false,
      error: 'EDD stage not found in checkpoint',
      run_id,
    }, { status: 400 });
  }
  
  // Verify token matches
  if (checkpoint.edd_stage.approval_token !== token.trim()) {
    return NextResponse.json({
      ok: false,
      error: 'Token mismatch',
      run_id,
    }, { status: 403 });
  }
  
  // Check for existing EDD decision (idempotency)
  if (checkpoint.edd_stage.decision) {
    if (checkpoint.edd_stage.decision === 'approve') {
      return NextResponse.json({
        ok: true,
        message: 'EDD already approved (idempotent)',
        run_id,
        final_decision: checkpoint.final_decision,
      });
    } else {
      return NextResponse.json({
        ok: false,
        error: 'Conflict: EDD already rejected',
        run_id,
        current_decision: checkpoint.edd_stage.decision,
      }, { status: 409 });
    }
  }
  
  // Update checkpoint: EDD approved
  const now = new Date().toISOString();
  checkpoint.edd_stage.status = 'approved';
  checkpoint.edd_stage.decision = 'approve';
  checkpoint.edd_stage.decided_at = now;
  checkpoint.edd_stage.decided_by = 'email_link';
  checkpoint.final_decision = 'approved_with_edd';
  checkpoint.status = 'completed';
  checkpoint.event_log = [
    ...(checkpoint.event_log || []),
    {
      timestamp: now,
      event: 'edd_approved',
      details: { via: 'email_link' },
    },
  ];
  
  try {
    await saveCheckpoint(checkpoint);
    console.log(`[EDD/Submit] ✅ EDD approved for run ${run_id}`);
    
    return NextResponse.json({
      ok: true,
      message: 'EDD approved successfully',
      run_id,
      final_decision: 'approved_with_edd',
    });
  } catch (error: any) {
    console.error('[EDD/Submit] ❌ Failed to save checkpoint:', error.message);
    return NextResponse.json({
      ok: false,
      error: 'Failed to save decision',
    }, { status: 500 });
  }
}

// ========================================
// POST: EDD reject with reason
// ========================================

export async function POST(request: NextRequest) {
  let body: any;
  
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      ok: false,
      error: 'Invalid JSON body',
    }, { status: 400 });
  }
  
  const { token, action, reason } = body;
  
  // Validate parameters
  if (!token || !action) {
    return NextResponse.json({
      ok: false,
      error: 'Missing required fields: token, action',
    }, { status: 400 });
  }
  
  if (action !== 'reject') {
    return NextResponse.json({
      ok: false,
      error: 'POST only supports action=reject',
    }, { status: 400 });
  }
  
  // Validate reason
  if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
    return NextResponse.json({
      ok: false,
      error: 'Rejection reason must be at least 10 characters',
    }, { status: 400 });
  }
  
  // Resolve token to run_id (same logic as GET)
  const tokenMetadata = await getTokenMetadata(token.trim());
  
  if (!tokenMetadata || tokenMetadata.type !== 'edd') {
    return NextResponse.json({
      ok: false,
      error: 'Invalid or expired EDD approval token',
    }, { status: 404 });
  }
  
  const run_id = tokenMetadata.run_id;
  
  // Load checkpoint
  const checkpoint = await loadCheckpoint(run_id);
  
  if (!checkpoint || !checkpoint.edd_stage) {
    return NextResponse.json({
      ok: false,
      error: 'Checkpoint or EDD stage not found',
      run_id,
    }, { status: 404 });
  }
  
  // Verify token matches
  if (checkpoint.edd_stage.approval_token !== token.trim()) {
    return NextResponse.json({
      ok: false,
      error: 'Token mismatch',
      run_id,
    }, { status: 403 });
  }
  
  // Check for existing EDD decision (idempotency)
  if (checkpoint.edd_stage.decision) {
    if (checkpoint.edd_stage.decision === 'reject') {
      return NextResponse.json({
        ok: true,
        message: 'EDD already rejected (idempotent)',
        run_id,
        final_decision: checkpoint.final_decision,
      });
    } else {
      return NextResponse.json({
        ok: false,
        error: 'Conflict: EDD already approved',
        run_id,
        current_decision: checkpoint.edd_stage.decision,
      }, { status: 409 });
    }
  }
  
  // Update checkpoint: EDD rejected
  const now = new Date().toISOString();
  checkpoint.edd_stage.status = 'rejected';
  checkpoint.edd_stage.decision = 'reject';
  checkpoint.edd_stage.decision_comment = reason.trim();
  checkpoint.edd_stage.decided_at = now;
  checkpoint.edd_stage.decided_by = 'web_form';
  checkpoint.final_decision = 'rejected';
  checkpoint.event_log = [
    ...(checkpoint.event_log || []),
    {
      timestamp: now,
      event: 'edd_rejected',
      details: { reason: reason.trim().slice(0, 100) },
    },
  ];
  
  try {
    await saveCheckpoint(checkpoint);
    console.log(`[EDD/Submit] ✅ EDD rejected for run ${run_id}`);
    
    return NextResponse.json({
      ok: true,
      message: 'EDD rejected successfully',
      run_id,
      final_decision: 'rejected',
    });
  } catch (error: any) {
    console.error('[EDD/Submit] ❌ Failed to save checkpoint:', error.message);
    return NextResponse.json({
      ok: false,
      error: 'Failed to save decision',
    }, { status: 500 });
  }
}



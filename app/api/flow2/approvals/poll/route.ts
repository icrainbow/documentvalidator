/**
 * Flow2 HITL: Poll Endpoint
 * 
 * Polls for human decision and handles 3-minute reminder (exactly once).
 * Returns countdown info for UI display.
 */

import { NextResponse } from 'next/server';
import { loadCheckpoint, updateCheckpointStatus } from '@/app/lib/flow2/checkpointStore';
import { sendReminderEmail } from '@/app/lib/email/smtpAdapter';

export const runtime = 'nodejs'; // Required for fs, SMTP

/**
 * GET /api/flow2/approvals/poll?run_id=...
 * 
 * Checks approval status, sends reminder if due, returns countdown info
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const run_id = searchParams.get('run_id');
  
  if (!run_id) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Missing run_id parameter',
      status: 'not_found' 
    }, { status: 400 });
  }
  
  // Validate run_id format (UUID v4)
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(run_id)) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Invalid run_id format',
      status: 'not_found' 
    }, { status: 400 });
  }
  
  // Load checkpoint
  const checkpoint = await loadCheckpoint(run_id);
  if (!checkpoint) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Checkpoint not found',
      run_id,
      status: 'not_found' 
    }, { status: 404 });
  }
  
  // Check if decision already exists
  if (checkpoint.decision) {
    // Decision made - return decided status
    const action = checkpoint.decision === 'approve' ? 'approve' : 'reject';
    const status = checkpoint.decision === 'approve' ? 'approved' : 'rejected';
    
    return NextResponse.json({
      ok: true,
      run_id,
      status,
      decision: {
        action,
        approver: checkpoint.decided_by || 'Unknown',
        timestamp: checkpoint.decided_at || new Date().toISOString(),
        reason: checkpoint.decision_comment,
      },
      // Backward compatibility fields
      decided_at: checkpoint.decided_at,
      decided_by: checkpoint.decided_by,
      decision_comment: checkpoint.decision_comment,
    });
  }
  
  // ========================================
  // REMINDER GATE (3-MINUTE, ONE-TIME)
  // ========================================
  
  if (
    checkpoint.approval_email_sent === true &&
    checkpoint.reminder_email_sent !== true // Not sent yet
  ) {
    const now = new Date();
    let reminderDueAt: Date;
    
    if (checkpoint.reminder_due_at) {
      reminderDueAt = new Date(checkpoint.reminder_due_at);
    } else {
      // Fallback: calculate from approval_sent_at + 180s
      const approvalSentAt = new Date(checkpoint.approval_sent_at || checkpoint.paused_at);
      reminderDueAt = new Date(approvalSentAt.getTime() + 180000);
    }
    
    if (now >= reminderDueAt) {
      console.log(`[Poll] Reminder due for run_id: ${run_id}. Sending reminder email...`);
      
      // Phase 5: IMPORTANT - Mark reminder as sent FIRST (atomic, prevents race)
      // This ensures exactly-once even if concurrent polls happen
      try {
        await updateCheckpointStatus(run_id, 'paused', {
          reminder_email_sent: true,
          reminder_sent_at: now.toISOString(),
        });
        console.log(`[Poll] Marked reminder as sent for run_id: ${run_id}`);
      } catch (error: any) {
        console.error('[Poll] Failed to mark reminder as sent:', error);
        // If this fails, don't send email (prevents duplicate on retry)
        return NextResponse.json({
          ok: false,
          error: 'Failed to update checkpoint',
          run_id,
        }, { status: 500 });
      }
      
      // Now attempt to send (if fails, reminder_email_sent stays true = exactly once)
      try {
        await sendReminderEmail({
          run_id,
          approval_token: checkpoint.approval_token || 'MISSING_TOKEN',
          recipient: checkpoint.approval_email_to || process.env.FLOW2_APPROVER_EMAIL || 'admin@example.com',
          checkpoint,
          base_url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        });
        
        console.log(`[Poll] Reminder email sent for run_id: ${run_id}`);
      } catch (error: any) {
        console.error('[Poll] Failed to send reminder:', error.message);
        // Don't fail the poll - user can still decide via original email
      }
    }
  }
  
  // ========================================
  // WAITING STATUS (WITH COUNTDOWN)
  // ========================================
  
  // Calculate countdown
  const approvalSentAt = checkpoint.approval_sent_at 
    ? new Date(checkpoint.approval_sent_at)
    : new Date(checkpoint.paused_at);
  
  const elapsed_seconds = Math.floor((Date.now() - approvalSentAt.getTime()) / 1000);
  
  let reminder_due_in_seconds: number | null = null;
  if (checkpoint.approval_email_sent && !checkpoint.reminder_email_sent) {
    const reminderDueAt = checkpoint.reminder_due_at
      ? new Date(checkpoint.reminder_due_at)
      : new Date(approvalSentAt.getTime() + 180000);
    
    const remaining = Math.max(0, Math.floor((reminderDueAt.getTime() - Date.now()) / 1000));
    reminder_due_in_seconds = remaining;
  }
  
  return NextResponse.json({
    ok: true,
    run_id,
    status: 'waiting_human',
    checkpoint_metadata: {
      approval_email_to: checkpoint.approval_email_to,
      approval_sent_at: checkpoint.approval_sent_at,
      reminder_sent_at: checkpoint.reminder_sent_at,
    },
    // Backward compatibility fields
    approval_sent_at: checkpoint.approval_sent_at,
    elapsed_seconds,
    reminder_sent: checkpoint.reminder_email_sent || false,
    reminder_due_in_seconds, // For UI countdown
  });
}


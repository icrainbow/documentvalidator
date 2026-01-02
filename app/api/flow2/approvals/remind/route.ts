/**
 * Flow2 HITL: Manual Reminder Endpoint
 * 
 * Allows initiator to manually send a reminder email to approver.
 * Enforces 5-minute cooldown to prevent spam.
 */

import { NextResponse } from 'next/server';
import { loadCheckpoint, saveCheckpoint } from '@/app/lib/flow2/checkpointStore';
import { sendReminderEmail } from '@/app/lib/email/smtpAdapter';

export const runtime = 'nodejs'; // Required for fs, SMTP

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/flow2/approvals/remind
 * Body: { run_id: string }
 * 
 * Manually triggers reminder email with cooldown enforcement
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { run_id } = body;
    
    if (!run_id || typeof run_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid run_id' },
        { status: 400 }
      );
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(run_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid run_id format' },
        { status: 400 }
      );
    }
    
    // Load checkpoint
    const checkpoint = await loadCheckpoint(run_id);
    if (!checkpoint) {
      return NextResponse.json(
        { success: false, error: 'Checkpoint not found' },
        { status: 404 }
      );
    }
    
    // Check if workflow is in waiting_human state
    if (checkpoint.status !== 'paused') {
      return NextResponse.json(
        {
          success: false,
          error: 'Workflow is not awaiting human review',
          current_status: checkpoint.status,
        },
        { status: 400 }
      );
    }
    
    // Check if decision already made
    if (checkpoint.decision) {
      return NextResponse.json(
        {
          success: false,
          error: 'Decision already made',
          decision: checkpoint.decision,
        },
        { status: 400 }
      );
    }
    
    // Enforce cooldown
    if (checkpoint.reminder_sent_at) {
      const lastReminderTime = new Date(checkpoint.reminder_sent_at).getTime();
      const elapsed = Date.now() - lastReminderTime;
      
      if (elapsed < COOLDOWN_MS) {
        const retry_after_seconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: 'Reminder cooldown active',
            message: `Please wait ${retry_after_seconds} seconds before sending another reminder`,
            retry_after_seconds,
          },
          { status: 429 }
        );
      }
    }
    
    // Update checkpoint with reminder timestamp FIRST (atomic)
    const now = new Date().toISOString();
    checkpoint.reminder_sent_at = now;
    checkpoint.reminder_email_sent = true;
    
    try {
      await saveCheckpoint(checkpoint);
      console.log(`[Remind] Updated checkpoint for run_id: ${run_id}`);
    } catch (error: any) {
      console.error('[Remind] Failed to update checkpoint:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update checkpoint' },
        { status: 500 }
      );
    }
    
    // Send reminder email
    try {
      const base_url = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const approval_email_to = checkpoint.approval_email_to || process.env.FLOW2_APPROVAL_EMAIL_TO || 'admin@example.com';
      const approval_token = checkpoint.approval_token || 'MISSING_TOKEN';
      
      await sendReminderEmail({
        run_id,
        approval_token,
        recipient: approval_email_to,
        checkpoint,
        base_url,
      });
      
      console.log(`[Remind] Reminder email sent for run_id: ${run_id}`);
      
      return NextResponse.json({
        success: true,
        reminder_sent_at: now,
        message: 'Reminder email sent successfully',
      });
      
    } catch (error: any) {
      console.error('[Remind] Failed to send reminder email:', error.message);
      
      // Email failed but checkpoint was updated - return partial success
      return NextResponse.json({
        success: false,
        error: 'Failed to send email',
        message: error.message,
        reminder_marked_sent: true, // Cooldown still applies
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('[Remind] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}


/**
 * Flow2 HITL: SMTP Email Adapter
 * 
 * Sends approval and reminder emails with HTML attachment packets.
 * Uses nodemailer with defensive error handling.
 */

import nodemailer from 'nodemailer';
import type { Flow2Checkpoint } from '../flow2/checkpointTypes';
import { buildApprovalPacket, renderApprovalPacketHtml, getApprovalPacketFilename } from '../flow2/approvalPacket';

// ========================================
// TRANSPORTER SETUP
// ========================================

/**
 * Create nodemailer transporter (reusable)
 */
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST || process.env.FLOW2_SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.FLOW2_SMTP_PORT || '587');
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || process.env.FLOW2_SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.FLOW2_SMTP_PASS;
  
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export interface EmailResult {
  messageId: string;
  success: boolean;
}

// ========================================
// INITIAL APPROVAL EMAIL
// ========================================

export async function sendApprovalEmail(params: {
  run_id: string;
  approval_token: string;
  recipient: string;
  checkpoint: Flow2Checkpoint;
  base_url: string;
}): Promise<EmailResult> {
  try {
    // Build packet and render HTML
    const packet = buildApprovalPacket(params.checkpoint, params.base_url);
    const packetHtml = renderApprovalPacketHtml(packet);
    const packetFilename = getApprovalPacketFilename(packet);
    
    const transporter = createTransporter();
    
    const customMessageId = `<flow2-${params.run_id}@${process.env.SMTP_DOMAIN || 'localhost'}>`;
    
    const mailOptions = {
      from: `Flow2 Reviews <${process.env.SMTP_USER || process.env.FLOW2_SMTP_USER}>`,
      to: params.recipient,
      subject: `[Flow2 Approval] Review Required - Run ${packet.run_short_id}`,
      messageId: customMessageId,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Flow2 Review Awaiting Approval</h2>
          <p>A Flow2 review requires your decision.</p>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Run ID:</strong> ${params.run_id}</p>
            <p style="margin: 4px 0;"><strong>Documents:</strong> ${params.checkpoint.documents.length} files</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> Awaiting human approval</p>
          </div>
          
          <div style="margin: 32px 0;">
            <a href="${packet.actions.approve_url}" 
               style="display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-right: 12px; font-weight: 600; font-size: 16px;">
              ✅ Approve
            </a>
            <a href="${packet.actions.reject_url}" 
               style="display: inline-block; padding: 14px 28px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              ❌ Reject
            </a>
          </div>
          
          <div style="margin-top: 32px; padding: 16px; background: #fef3c7; border-left: 4px solid #fbbf24; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;">
              📎 <strong>Attached:</strong> Complete approval context is attached as an HTML file (<code>${packetFilename}</code>). 
              Open the attachment for full details including execution progress, warnings, issues, and uploaded documents.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            Flow2 Approval System | Message-ID: ${customMessageId}<br/>
            Token: ${params.approval_token}
          </p>
        </div>
      `,
      attachments: [
        {
          filename: packetFilename,
          content: packetHtml,
          contentType: 'text/html; charset=utf-8',
        },
      ],
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`[SMTP] Approval email sent: ${result.messageId}`);
    
    return {
      messageId: result.messageId || customMessageId,
      success: true,
    };
  } catch (error: any) {
    console.error('[SMTP] Failed to send approval email:', error.message);
    throw error; // Let caller handle
  }
}

// ========================================
// REMINDER EMAIL (SAME ATTACHMENT)
// ========================================

export async function sendReminderEmail(params: {
  run_id: string;
  approval_token: string;
  recipient: string;
  checkpoint: Flow2Checkpoint;
  base_url: string;
}): Promise<EmailResult> {
  try {
    // Build same packet
    const packet = buildApprovalPacket(params.checkpoint, params.base_url);
    const packetHtml = renderApprovalPacketHtml(packet);
    const packetFilename = getApprovalPacketFilename(packet);
    
    const transporter = createTransporter();
    
    const customMessageId = `<flow2-reminder-${params.run_id}@${process.env.SMTP_DOMAIN || 'localhost'}>`;
    
    const elapsedMinutes = Math.floor(
      (Date.now() - new Date(params.checkpoint.approval_sent_at || params.checkpoint.paused_at).getTime()) / 60000
    );
    
    const mailOptions = {
      from: `Flow2 Reviews <${process.env.SMTP_USER || process.env.FLOW2_SMTP_USER}>`,
      to: params.recipient,
      subject: `[Flow2 Approval] ⏰ REMINDER - Run ${packet.run_short_id}`,
      messageId: customMessageId,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">⏰ Reminder: Flow2 Review Still Awaiting Approval</h2>
          <p>This is a reminder that a Flow2 review requires your decision.</p>
          
          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 2px solid #fbbf24;">
            <p style="margin: 4px 0;"><strong>Run ID:</strong> ${params.run_id}</p>
            <p style="margin: 4px 0;"><strong>Waiting since:</strong> ${new Date(params.checkpoint.paused_at).toLocaleString()}</p>
            <p style="margin: 4px 0;"><strong>Elapsed:</strong> ~${elapsedMinutes} minutes</p>
          </div>
          
          <div style="margin: 32px 0;">
            <a href="${packet.actions.approve_url}" 
               style="display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-right: 12px; font-weight: 600; font-size: 16px;">
              ✅ Approve
            </a>
            <a href="${packet.actions.reject_url}" 
               style="display: inline-block; padding: 14px 28px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              ❌ Reject
            </a>
          </div>
          
          <div style="margin-top: 32px; padding: 16px; background: #fef3c7; border-left: 4px solid #fbbf24; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;">
              📎 <strong>Attached:</strong> Complete approval context (same as original email).
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 40px;">
            This is an automated reminder. You will not receive additional reminders for this review.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: packetFilename,
          content: packetHtml,
          contentType: 'text/html; charset=utf-8',
        },
      ],
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`[SMTP] Reminder email sent: ${result.messageId}`);
    
    return {
      messageId: result.messageId || customMessageId,
      success: true,
    };
  } catch (error: any) {
    console.error('[SMTP] Failed to send reminder email:', error.message);
    throw error;
  }
}


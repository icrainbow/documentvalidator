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
    
    // Build document summaries for email body
    const documentsSummary = params.checkpoint.documents.map((doc, idx) => {
      const preview = doc.text.slice(0, 300).replace(/\s+/g, ' ').trim();
      const wordCount = doc.text.split(/\s+/).length;
      return `
        <div style="border-left: 3px solid #3b82f6; padding-left: 12px; margin: 12px 0;">
          <p style="margin: 4px 0; font-weight: 600; color: #1e40af;">${idx + 1}. ${doc.filename}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">~${wordCount} words</p>
          <p style="margin: 8px 0; font-size: 14px; color: #374151; line-height: 1.5;">${preview}${doc.text.length > 300 ? '...' : ''}</p>
        </div>
      `;
    }).join('');
    
    // Build issues summary
    const issuesSummary = packet.issues.length > 0 ? `
      <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #dc2626; font-size: 16px;">⚠️ ${packet.issues.length} Issue(s) Detected</h3>
        ${packet.issues.map(issue => `
          <div style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: ${issue.severity === 'critical' ? '#dc2626' : issue.severity === 'warning' ? '#ea580c' : '#6b7280'};">
              ${issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟠' : 'ℹ️'} ${issue.message}
            </p>
            ${issue.section ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Section: ${issue.section}</p>` : ''}
          </div>
        `).join('')}
      </div>
    ` : '';
    
    const mailOptions = {
      from: `Flow2 Reviews <${process.env.SMTP_USER || process.env.FLOW2_SMTP_USER}>`,
      to: params.recipient,
      subject: `[Flow2 Approval] Review Required - Run ${packet.run_short_id}`,
      messageId: customMessageId,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 650px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af; margin-bottom: 8px;">Flow2 KYC Review Awaiting Approval</h2>
          <p style="color: #6b7280; margin-top: 0;">A KYC review workflow has paused and requires your decision.</p>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Run ID:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${params.run_id.slice(0, 13)}...</code></p>
            <p style="margin: 4px 0;"><strong>Documents:</strong> ${params.checkpoint.documents.length} file(s) uploaded</p>
            <p style="margin: 4px 0;"><strong>Paused At:</strong> ${new Date(params.checkpoint.paused_at).toLocaleString()}</p>
          </div>
          
          ${issuesSummary}
          
          <h3 style="color: #374151; font-size: 16px; margin: 24px 0 12px 0;">📄 Uploaded Documents</h3>
          ${documentsSummary}
          
          <div style="margin: 32px 0; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 16px 0; color: #374151; font-weight: 600;">Choose an action:</p>
            <a href="${packet.actions.approve_url}" 
               style="display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px; font-weight: 600; font-size: 16px;">
              ✅ Approve & Continue
            </a>
            <a href="${packet.actions.reject_url}" 
               style="display: inline-block; padding: 14px 32px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px; font-weight: 600; font-size: 16px;">
              ❌ Reject
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
            Flow2 Approval System<br/>
            Message ID: ${customMessageId}<br/>
            Token: ${params.approval_token.slice(0, 8)}...
          </p>
        </div>
      `,
      // Removed attachments - Gmail displays HTML attachments as source code
      // All necessary context is now in the email body
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

// ========================================
// EDD APPROVAL EMAIL (STAGE 2)
// ========================================

export async function sendEddApprovalEmail(params: {
  run_id: string;
  approval_token: string;
  recipient: string;
  checkpoint: Flow2Checkpoint;
  edd_findings: Array<{ severity: string; title: string; detail: string }>;
  base_url: string;
}): Promise<EmailResult> {
  try {
    const transporter = createTransporter();
    
    const customMessageId = `<flow2-edd-${params.run_id}@${process.env.SMTP_DOMAIN || 'localhost'}>`;
    
    // Build findings summary HTML
    const findingsSummary = params.edd_findings.map(finding => {
      const severityColor = finding.severity === 'high' ? '#dc2626' : finding.severity === 'medium' ? '#ea580c' : '#6b7280';
      const severityIcon = finding.severity === 'high' ? '🔴' : finding.severity === 'medium' ? '🟠' : 'ℹ️';
      
      return `
        <div style="margin: 12px 0; padding: 12px; background: #f9fafb; border-left: 4px solid ${severityColor}; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: ${severityColor};">
            ${severityIcon} ${finding.title}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #374151;">
            ${finding.detail}
          </p>
        </div>
      `;
    }).join('');
    
    const approveUrl = `${params.base_url}/flow2/edd/approve?token=${params.approval_token}`;
    const rejectUrl = `${params.base_url}/flow2/edd/reject?token=${params.approval_token}`;
    
    const mailOptions = {
      from: `Flow2 Reviews <${process.env.SMTP_USER || process.env.FLOW2_SMTP_USER}>`,
      to: params.recipient,
      subject: `[Flow2 EDD] Additional Approval Required - Run ${params.run_id.slice(0, 13)}...`,
      messageId: customMessageId,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 650px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">🔍 Enhanced Due Diligence (EDD) Review Required</h2>
          <p style="color: #6b7280; margin-top: 0;">The initial review was rejected due to identified risk factors. An EDD sub-review has been completed automatically.</p>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Run ID:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${params.run_id.slice(0, 13)}...</code></p>
            <p style="margin: 4px 0;"><strong>Stage:</strong> Enhanced Due Diligence (Stage 2)</p>
          </div>
          
          <h3 style="color: #374151; font-size: 16px; margin: 24px 0 12px 0;">📋 EDD Findings</h3>
          ${findingsSummary}
          
          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #78350f;">
              <strong>⚠️ Action Required:</strong> Please review the EDD findings above and make a decision to approve or reject.
            </p>
          </div>
          
          <div style="margin: 32px 0; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 16px 0; color: #374151; font-weight: 600;">Choose an action:</p>
            <a href="${approveUrl}" 
               style="display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px; font-weight: 600; font-size: 16px;">
              ✅ Approve EDD & Continue
            </a>
            <a href="${rejectUrl}" 
               style="display: inline-block; padding: 14px 32px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px; font-weight: 600; font-size: 16px;">
              ❌ Reject EDD
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
            Flow2 EDD Approval System<br/>
            Message ID: ${customMessageId}<br/>
            Token: ${params.approval_token.slice(0, 8)}...
          </p>
        </div>
      `,
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`[SMTP] EDD approval email sent: ${result.messageId}`);
    
    return {
      messageId: result.messageId || customMessageId,
      success: true,
    };
  } catch (error: any) {
    console.error('[SMTP] Failed to send EDD approval email:', error.message);
    throw error;
  }
}


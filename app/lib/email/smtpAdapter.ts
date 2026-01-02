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
    const transporter = createTransporter();
    
    const customMessageId = `<flow2-${params.run_id}@${process.env.SMTP_DOMAIN || 'localhost'}>`;
    
    // Build approval URLs
    const approveUrl = `${params.base_url}/flow2/approvals/approve?token=${params.approval_token}`;
    const rejectUrl = `${params.base_url}/flow2/approvals/reject?token=${params.approval_token}`;
    
    // Build issues summary from checkpoint
    const issues = params.checkpoint.graph_state?.issues || [];
    const issuesSummary = issues.length > 0 ? `
      <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #dc2626; font-size: 16px;">⚠️ ${issues.length} Issue(s) Detected</h3>
        ${issues.map((issue: any) => `
          <div style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: ${issue.severity === 'critical' || issue.severity === 'high' ? '#dc2626' : issue.severity === 'warning' || issue.severity === 'medium' ? '#ea580c' : '#6b7280'};">
              ${issue.severity === 'critical' || issue.severity === 'high' ? '🔴' : issue.severity === 'warning' || issue.severity === 'medium' ? '🟠' : 'ℹ️'} ${issue.message || issue.detail || issue.title}
            </p>
          </div>
        `).join('')}
      </div>
    ` : '';
    
    // Build topic summaries section from checkpoint
    const topicSummaries = params.checkpoint.topic_summaries || [];
    const topicSummariesHtml = topicSummaries.length > 0 ? `
      <h3 style="color: #374151; font-size: 16px; margin: 32px 0 12px 0;">📊 Topic Summary (KYC Analysis)</h3>
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
        ${topicSummaries.map(topic => {
          const coverageColor = topic.coverage === 'PRESENT' ? '#10b981' : 
                               topic.coverage === 'WEAK' ? '#f59e0b' : '#6b7280';
          const coverageIcon = topic.coverage === 'PRESENT' ? '✓' : 
                              topic.coverage === 'WEAK' ? '⚠' : '○';
          
          return `
            <div style="margin: 16px 0; padding: 12px; background: white; border-radius: 6px; border-left: 4px solid ${coverageColor};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="margin: 0; color: #1e40af; font-size: 14px;">${topic.title}</h4>
                <span style="font-size: 11px; font-weight: 600; color: ${coverageColor}; background: ${coverageColor}15; padding: 4px 8px; border-radius: 4px;">
                  ${coverageIcon} ${topic.coverage}
                </span>
              </div>
              ${topic.bullets && topic.bullets.length > 0 ? `
                <ul style="margin: 8px 0; padding-left: 20px; color: #374151; font-size: 13px; line-height: 1.6;">
                  ${topic.bullets.map(bullet => `<li style="margin: 4px 0;">${bullet}</li>`).join('')}
                </ul>
              ` : ''}
              ${topic.evidence && topic.evidence.length > 0 ? `
                <p style="margin: 8px 0 0 0; padding: 8px; background: #f9fafb; border-radius: 4px; font-size: 12px; color: #6b7280; font-style: italic;">
                  📎 Evidence: "${topic.evidence[0].quote.slice(0, 120)}${topic.evidence[0].quote.length > 120 ? '...' : ''}"
                </p>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    ` : '';
    
    const mailOptions = {
      from: `Flow2 Reviews <${process.env.SMTP_USER || process.env.FLOW2_SMTP_USER}>`,
      to: params.recipient,
      subject: `[Flow2 Approval] Review Required - Run ${params.run_id.slice(0, 8)}`,
      messageId: customMessageId,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'MIME-Version': '1.0'
      },
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flow2 Approval Required</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
    <h2 style="color: #1e40af; margin-bottom: 8px;">Flow2 KYC Review Awaiting Approval</h2>
    <p style="color: #6b7280; margin-top: 0;">A KYC review workflow has paused and requires your decision.</p>
    
    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Run ID:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${params.run_id.slice(0, 13)}...</code></p>
      <p style="margin: 4px 0;"><strong>Documents:</strong> ${params.checkpoint.documents.length} file(s) uploaded (see attachments below)</p>
      <p style="margin: 4px 0;"><strong>Paused At:</strong> ${new Date(params.checkpoint.paused_at).toLocaleString()}</p>
    </div>
    
    ${issuesSummary}
    
    ${topicSummariesHtml}
    
    <h3 style="color: #374151; font-size: 16px; margin: 24px 0 12px 0;">📎 Attached Documents</h3>
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #15803d; font-weight: 600;">
        ✓ ${params.checkpoint.documents.length} original document(s) attached to this email:
      </p>
      ${params.checkpoint.documents.map((doc, idx) => `
        <p style="margin: 6px 0; font-size: 13px; color: #166534; padding-left: 16px;">
          📄 ${idx + 1}. ${doc.filename}
        </p>
      `).join('')}
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280; font-style: italic;">
        💡 Download attachments to review the complete documents.
      </p>
    </div>
    
    <div style="margin: 32px 0; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center;">
      <p style="margin: 0 0 16px 0; color: #374151; font-weight: 600;">Choose an action:</p>
      <a href="${approveUrl}" 
         style="display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px; font-weight: 600; font-size: 16px;">
        ✅ Approve & Continue
      </a>
      <a href="${rejectUrl}" 
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
</body>
</html>`,
      // ATTACHMENTS: Only user-uploaded documents (NO HTML packet)
      attachments: params.checkpoint.documents.map((doc, idx) => ({
        filename: doc.filename || `document-${idx + 1}.txt`,
        content: doc.text,
        contentType: 'text/plain; charset=utf-8',
      })),
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


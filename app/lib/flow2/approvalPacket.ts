/**
 * Flow2 HITL: Approval Packet Builder
 * 
 * Builds HTML attachment for approval emails containing execution context snapshot.
 * CRITICAL: Never include raw document content, always escape HTML, defensive coding.
 */

import type { Flow2Checkpoint } from './checkpointTypes';
import type { GraphTraceEvent } from '../graphKyc/types';

// ========================================
// PART A: SAFETY HELPERS (REQUIRED)
// ========================================

/**
 * Escape HTML special characters to prevent XSS and broken rendering
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Truncate long strings with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format byte size to human-readable
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format ISO timestamp to readable date
 */
export function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return iso; // Fallback to raw if parsing fails
  }
}

// ========================================
// PART B: APPROVAL PACKET TYPES
// ========================================

export interface ApprovalPacketMilestone {
  step_id: string;
  label: string;
  status: 'done' | 'pending' | 'warning';
  evidence?: string;
}

export interface ApprovalPacketWarning {
  id: string;
  message: string;
  step_id?: string;
  status: 'open' | 'accepted' | 'acknowledged';
}

export interface ApprovalPacketIssue {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  section?: string;
  evidence?: string;
}

export interface ApprovalPacketUpload {
  name: string;
  type?: string;
  size_bytes?: number;
  pages?: number;
  words?: number;
  summary?: string; // ⚠️ MUST NOT contain raw content
}

export interface ApprovalPacket {
  version: 'flow2-approval-packet-v1';
  run_id: string;
  run_short_id: string; // First 8 chars
  created_at: string; // ISO 8601
  paused_at: string; // ISO 8601
  current_node_id: string;
  status: 'paused' | 'completed' | 'terminated' | 'failed';
  
  progress: ApprovalPacketMilestone[];
  warnings: ApprovalPacketWarning[];
  issues: ApprovalPacketIssue[];
  uploads: ApprovalPacketUpload[];
  
  derived: {
    topics?: string[]; // Topic titles only
    risk_score?: number; // 0-100
    notes?: string;
  };
  
  actions: {
    approve_url: string;
    reject_url: string;
  };
}

// ========================================
// PART C: PACKET BUILDER (DEFENSIVE)
// ========================================

// Fixed milestones for demo stability
const FIXED_MILESTONES: Array<{ step_id: string; label: string }> = [
  { step_id: 'topic_assembler', label: 'Topic Assembly' },
  { step_id: 'risk_triage', label: 'Risk Triage' },
  { step_id: 'parallel_checks', label: 'Parallel Checks' },
  { step_id: 'human_review', label: 'Human Review Gate' },
  { step_id: 'finalize', label: 'Finalization' },
];

/**
 * Build approval packet from checkpoint (DEFENSIVE - never throws)
 */
export function buildApprovalPacket(
  checkpoint: Flow2Checkpoint,
  baseUrl: string
): ApprovalPacket {
  const run_short_id = checkpoint.run_id.slice(0, 8);
  const token = checkpoint.approval_token || 'MISSING_TOKEN';
  
  // Build progress
  const progress: ApprovalPacketMilestone[] = FIXED_MILESTONES.map((milestone) => {
    let status: 'done' | 'pending' | 'warning' = 'pending';
    let evidence: string | undefined;
    
    // Determine status from trace events (fallback chain)
    const traceEvents = (checkpoint.graph_state?.trace || []) as GraphTraceEvent[];
    const milestoneEvent = traceEvents.find((e: GraphTraceEvent) => e.node === milestone.step_id);
    
    if (milestoneEvent) {
      if (milestoneEvent.status === 'executed') {
        status = 'done';
      } else if (milestoneEvent.status === 'failed') {
        status = 'warning';
      }
    } else if (checkpoint.current_node_id === milestone.step_id) {
      status = 'done';
    } else if (checkpoint.paused_at_node_id === milestone.step_id) {
      status = 'pending'; // Paused here
    }
    
    // Add evidence for specific milestones (defensive)
    try {
      if (milestone.step_id === 'topic_assembler') {
        const topicSections = (checkpoint.graph_state as any)?.topicSections;
        const topicCount = Array.isArray(topicSections) ? topicSections.length : 0;
        evidence = topicCount > 0 ? `${topicCount} topics derived` : undefined;
      } else if (milestone.step_id === 'parallel_checks') {
        const issues = (checkpoint.graph_state as any)?.issues;
        const issueCount = Array.isArray(issues) ? issues.length : 0;
        evidence = issueCount > 0 ? `${issueCount} issues found` : 'No issues detected';
      }
    } catch {
      // Silently ignore evidence extraction errors
    }
    
    return { step_id: milestone.step_id, label: milestone.label, status, evidence };
  });
  
  // Extract warnings (fallback chain)
  const warnings: ApprovalPacketWarning[] = [];
  
  try {
    // Source 1: graph_state.warnings
    const stateWarnings = (checkpoint.graph_state as any)?.warnings;
    if (Array.isArray(stateWarnings)) {
      stateWarnings.forEach((w: any, idx: number) => {
        warnings.push({
          id: `warning-${idx}`,
          message: truncate(String(w.message || w.text || w), 200),
          step_id: w.step_id || w.node,
          status: w.status || 'open',
        });
      });
    }
    
    // Source 2: trace events with status='warning' or 'failed'
    traceEvents.forEach((event: GraphTraceEvent, idx: number) => {
      if ((event.status === 'failed') && event.reason) {
        warnings.push({
          id: `trace-warning-${idx}`,
          message: truncate(event.reason, 200),
          step_id: event.node,
          status: 'open',
        });
      }
    });
  } catch (error) {
    console.error('[ApprovalPacket] Failed to extract warnings:', error);
  }
  
  // Extract issues (fallback chain)
  const issues: ApprovalPacketIssue[] = [];
  
  try {
    // Source 1: graph_state.issues
    const stateIssues = (checkpoint.graph_state as any)?.issues;
    if (Array.isArray(stateIssues)) {
      stateIssues.forEach((issue: any) => {
        issues.push({
          severity: issue.severity || 'info',
          message: truncate(String(issue.message || issue.description || issue), 200),
          section: issue.section || issue.topic_key || issue.topicId,
          evidence: issue.evidence ? truncate(String(issue.evidence), 100) : undefined,
        });
      });
    }
  } catch (error) {
    console.error('[ApprovalPacket] Failed to extract issues:', error);
  }
  
  // Extract uploads (NEVER dump raw content)
  const uploads: ApprovalPacketUpload[] = [];
  
  try {
    const documents = checkpoint.documents || [];
    documents.forEach((doc: any) => {
      let size_bytes: number | undefined;
      if (doc.text && typeof doc.text === 'string') {
        size_bytes = doc.text.length; // Rough estimate
      } else if (doc.content && typeof doc.content === 'string') {
        size_bytes = doc.content.length;
      } else if (doc.size) {
        size_bytes = doc.size;
      } else if (doc.metadata?.size) {
        size_bytes = doc.metadata.size;
      }
      
      // Summary: MUST NOT include raw content
      let summary: string | undefined;
      if (doc.summary) {
        summary = truncate(String(doc.summary), 200);
      } else {
        summary = '(no summary available)';
      }
      
      uploads.push({
        name: doc.filename || doc.name || 'Untitled',
        type: doc.doc_type_hint || doc.type || undefined,
        size_bytes,
        pages: doc.metadata?.pages,
        words: doc.metadata?.words,
        summary,
      });
    });
  } catch (error) {
    console.error('[ApprovalPacket] Failed to extract uploads:', error);
  }
  
  // Extract derived context
  let topics: string[] = [];
  let risk_score: number | undefined;
  let notes: string = 'Awaiting human approval';
  
  try {
    // Extract topic titles (not full content)
    const topicSections = (checkpoint.graph_state as any)?.topicSections;
    if (Array.isArray(topicSections)) {
      topics = topicSections
        .map((t: any) => t.topicId || t.topic_key || t.title || '(untitled)')
        .filter(Boolean);
    }
    
    // Extract risk score
    risk_score = (checkpoint.graph_state as any)?.riskScore;
    
    // Paused reason as notes
    if ((checkpoint as any).paused_reason) {
      notes = (checkpoint as any).paused_reason;
    }
  } catch (error) {
    console.error('[ApprovalPacket] Failed to extract derived context:', error);
  }
  
  // Build action URLs
  const approve_url = `${baseUrl}/api/flow2/approvals/submit?token=${token}&action=approve`;
  const reject_url = `${baseUrl}/flow2/reject?token=${token}`;
  
  return {
    version: 'flow2-approval-packet-v1',
    run_id: checkpoint.run_id,
    run_short_id,
    created_at: checkpoint.created_at,
    paused_at: checkpoint.paused_at,
    current_node_id: checkpoint.current_node_id,
    status: checkpoint.status,
    progress,
    warnings,
    issues,
    uploads,
    derived: { topics, risk_score, notes },
    actions: { approve_url, reject_url },
  };
}

// ========================================
// PART D: HTML RENDERER
// ========================================

export function renderApprovalPacketHtml(packet: ApprovalPacket): string {
  const created = formatTimestamp(packet.created_at);
  const paused = formatTimestamp(packet.paused_at);
  const generated = formatTimestamp(new Date().toISOString());
  
  // Progress rows
  const progressRows = packet.progress
    .map((step) => {
      const statusClass = `status-${step.status}`;
      const evidence = step.evidence ? escapeHtml(step.evidence) : '—';
      return `
        <tr>
          <td>${escapeHtml(step.label)}</td>
          <td class="${statusClass}">${step.status.toUpperCase()}</td>
          <td>${evidence}</td>
        </tr>
      `;
    })
    .join('');
  
  // Warnings section
  let warningsHtml = '';
  if (packet.warnings.length > 0) {
    const warningItems = packet.warnings
      .map((w) => `<li>${escapeHtml(w.message)} <span style="color: #6b7280; font-size: 12px;">(${w.status})</span></li>`)
      .join('');
    warningsHtml = `
      <h3 style="font-size: 16px; margin: 16px 0 8px 0;">Warnings:</h3>
      <ul>${warningItems}</ul>
    `;
  }
  
  // Issues section
  let issuesHtml = '';
  if (packet.issues.length > 0) {
    const issueItems = packet.issues
      .map((issue) => {
        const section = issue.section ? ` <span style="color: #6b7280; font-size: 12px;">(Section: ${escapeHtml(issue.section)})</span>` : '';
        const evidence = issue.evidence ? `<br/><span style="color: #6b7280; font-size: 12px; margin-left: 20px;">Evidence: ${escapeHtml(issue.evidence)}</span>` : '';
        return `
          <li>
            <span class="severity-${issue.severity}">[${issue.severity.toUpperCase()}]</span> 
            ${escapeHtml(issue.message)}${section}${evidence}
          </li>
        `;
      })
      .join('');
    issuesHtml = `
      <h3 style="font-size: 16px; margin: 16px 0 8px 0;">Issues:</h3>
      <ul>${issueItems}</ul>
    `;
  }
  
  // Uploads rows
  const uploadRows = packet.uploads
    .map((file) => {
      const size = file.size_bytes ? formatBytes(file.size_bytes) : '—';
      const summary = file.summary ? escapeHtml(file.summary) : '—';
      return `
        <tr>
          <td>${escapeHtml(file.name)}</td>
          <td>${escapeHtml(file.type || '—')}</td>
          <td>${size}</td>
          <td style="max-width: 300px; word-wrap: break-word;">${summary}</td>
        </tr>
      `;
    })
    .join('');
  
  // Derived context section
  let derivedHtml = '';
  if (packet.derived.topics && packet.derived.topics.length > 0) {
    const topicsText = packet.derived.topics.map(escapeHtml).join(', ');
    const riskScore = packet.derived.risk_score !== undefined ? `<p><strong>Risk Score:</strong> ${packet.derived.risk_score}/100</p>` : '';
    const notes = packet.derived.notes ? `<p><strong>Notes:</strong> ${escapeHtml(packet.derived.notes)}</p>` : '';
    derivedHtml = `
      <div class="section">
        <h2>🧩 Derived Context</h2>
        <p><strong>Topics:</strong> ${topicsText}</p>
        ${riskScore}
        ${notes}
      </div>
    `;
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flow2 Approval Packet - ${escapeHtml(packet.run_short_id)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #f9fafb; }
    .header { background: #1e40af; color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .header .meta { font-size: 14px; opacity: 0.9; }
    .section { background: white; padding: 20px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section h2 { margin: 0 0 16px 0; font-size: 18px; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px; background: #f3f4f6; font-weight: 600; font-size: 14px; }
    td { padding: 8px; border-top: 1px solid #e5e7eb; font-size: 14px; vertical-align: top; }
    .status-done { color: #10b981; font-weight: 600; }
    .status-pending { color: #6b7280; }
    .status-warning { color: #f59e0b; font-weight: 600; }
    .severity-critical { color: #dc2626; font-weight: 600; }
    .severity-warning { color: #f59e0b; }
    .severity-info { color: #3b82f6; }
    .actions { background: #fef3c7; padding: 20px; border-radius: 8px; border: 2px solid #fbbf24; }
    .actions h2 { color: #92400e; margin-top: 0; }
    .btn { display: inline-block; padding: 12px 24px; margin: 8px 8px 8px 0; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .btn-approve { background: #10b981; color: white; }
    .btn-reject { background: #ef4444; color: white; }
    .url-copy { background: #f3f4f6; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 11px; word-break: break-all; margin-top: 8px; }
    ul { padding-left: 24px; }
    li { margin-bottom: 8px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 Flow2 Approval Packet</h1>
    <div class="meta">
      Run ID: ${escapeHtml(packet.run_short_id)} | Created: ${created} | Paused: ${paused}
    </div>
  </div>

  <div class="section">
    <h2>📊 Execution Progress</h2>
    <table>
      <thead>
        <tr><th>Step</th><th>Status</th><th>Evidence</th></tr>
      </thead>
      <tbody>${progressRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>⚠️ Warnings & Issues</h2>
    ${packet.warnings.length === 0 && packet.issues.length === 0 
      ? '<p style="color: #10b981;">✅ No warnings or issues detected.</p>' 
      : warningsHtml + issuesHtml
    }
  </div>

  <div class="section">
    <h2>📎 Upload Summary</h2>
    <table>
      <thead>
        <tr><th>File Name</th><th>Type</th><th>Size</th><th>Summary</th></tr>
      </thead>
      <tbody>${uploadRows}</tbody>
    </table>
  </div>

  ${derivedHtml}

  <div class="actions">
    <h2>🚀 Required Action</h2>
    <p>Please review the information above and make your decision:</p>
    <div>
      <a href="${escapeHtml(packet.actions.approve_url)}" class="btn btn-approve">✅ Approve</a>
      <a href="${escapeHtml(packet.actions.reject_url)}" class="btn btn-reject">❌ Reject (with reason)</a>
    </div>
    <p style="margin-top: 20px; font-size: 12px; color: #92400e;">
      <strong>Note:</strong> Approve is a one-click action. Reject requires you to provide a reason on the web form.
    </p>
    <div style="margin-top: 16px;">
      <p style="font-size: 12px; color: #92400e; margin-bottom: 4px;">Copy URLs if buttons don't work:</p>
      <div class="url-copy"><strong>Approve:</strong> ${escapeHtml(packet.actions.approve_url)}</div>
      <div class="url-copy"><strong>Reject:</strong> ${escapeHtml(packet.actions.reject_url)}</div>
    </div>
  </div>

  <div style="text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
    Flow2 Approval Packet v1 | Run ID: ${escapeHtml(packet.run_id)} | Generated: ${generated}
  </div>
</body>
</html>
  `.trim();
}

// ========================================
// PART E: FILENAME HELPER
// ========================================

export function getApprovalPacketFilename(packet: ApprovalPacket): string {
  return `Flow2-ApprovalPacket-${packet.run_short_id}.html`;
}


/**
 * Flow2: Human-Readable Review Report Generator
 * 
 * Generates a Markdown-formatted review status report for end users.
 * File format: Review_Status_Report_{runId}.md
 */

import type { ApprovalPackage } from './packageApprovalData';

/**
 * Generate a human-readable Markdown report from approval package data
 */
export function generateMarkdownReport(pkg: ApprovalPackage): string {
  const lines: string[] = [];
  
  // ========== HEADER ==========
  lines.push('# Review Status Report');
  lines.push('');
  lines.push(`**Generated:** ${formatDateTime(pkg.generatedAt)}`);
  lines.push(`**Review ID:** \`${pkg.documentId}\``);
  lines.push(`**Status:** ${formatFinalStatus(pkg.finalOutcome.status, pkg.finalOutcome.decision)}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // ========== FINAL OUTCOME (TOP) ==========
  lines.push('## 📊 Final Outcome');
  lines.push('');
  lines.push(`- **Decision:** ${formatDecision(pkg.finalOutcome.decision)}`);
  lines.push(`- **Status:** ${pkg.finalOutcome.status}`);
  if (pkg.finalOutcome.reason) {
    lines.push(`- **Reason:** ${pkg.finalOutcome.reason}`);
  }
  lines.push(`- **Completed At:** ${formatDateTime(pkg.finalOutcome.completedAt)}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // ========== DOCUMENTS ==========
  lines.push('## 📄 Submitted Documents');
  lines.push('');
  lines.push(`**Total:** ${pkg.documents.count} document(s)`);
  if (pkg.documents.totalSizeBytes) {
    lines.push(`**Total Size:** ${formatBytes(pkg.documents.totalSizeBytes)}`);
  }
  lines.push('');
  pkg.documents.filenames.forEach((filename, idx) => {
    lines.push(`${idx + 1}. ${filename}`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // ========== RISK ASSESSMENT ==========
  lines.push('## 🔍 Risk Assessment');
  lines.push('');
  lines.push(`**Overall Risk Level:** ${formatRiskLevel(pkg.riskAssessment.overallLevel)}`);
  lines.push('');
  
  if (pkg.riskAssessment.signals.length > 0) {
    lines.push('### Risk Signals Detected');
    lines.push('');
    pkg.riskAssessment.signals.forEach((signal, idx) => {
      lines.push(`#### ${idx + 1}. ${signal.title}`);
      lines.push(`- **Category:** ${signal.category}`);
      lines.push(`- **Severity:** ${signal.severity.toUpperCase()}`);
      lines.push(`- **Detail:** ${signal.detail}`);
      lines.push('');
    });
  } else {
    lines.push('✅ No significant risk signals detected.');
    lines.push('');
  }
  
  lines.push('---');
  lines.push('');
  
  // ========== COMPLIANCE REVIEW (TOPIC SUMMARIES) ==========
  if (pkg.topicSummaries && pkg.topicSummaries.length > 0) {
    lines.push('## ✓ Compliance Review - Key Topics Extracted');
    lines.push('');
    
    pkg.topicSummaries.forEach((topic, idx) => {
      lines.push(`### ${idx + 1}. ${topic.title}`);
      lines.push(`**Coverage:** ${topic.coverage}`);
      lines.push('');
      if (topic.bullets && topic.bullets.length > 0) {
        topic.bullets.forEach(bullet => {
          lines.push(`- ${bullet}`);
        });
        lines.push('');
      }
    });
    
    lines.push('---');
    lines.push('');
  }
  
  // ========== APPROVAL DECISIONS ==========
  lines.push('## ✍️ Approval History');
  lines.push('');
  
  // Stage 1: Human Review
  lines.push('### Stage 1: Human Review');
  lines.push(`- **Decision:** ${formatDecision(pkg.approvals.stage1.decision)}`);
  lines.push(`- **Decided By:** ${pkg.approvals.stage1.decidedBy}`);
  lines.push(`- **Decided At:** ${formatDateTime(pkg.approvals.stage1.decidedAt)}`);
  if (pkg.approvals.stage1.comment) {
    lines.push(`- **Comment:** ${pkg.approvals.stage1.comment}`);
  }
  lines.push('');
  
  // EDD Review (if exists)
  if (pkg.approvals.edd) {
    lines.push('### Stage 2: Enhanced Due Diligence (EDD)');
    lines.push(`- **Decision:** ${formatDecision(pkg.approvals.edd.decision)}`);
    lines.push(`- **Decided By:** ${pkg.approvals.edd.decidedBy}`);
    lines.push(`- **Decided At:** ${formatDateTime(pkg.approvals.edd.decidedAt)}`);
    if (pkg.approvals.edd.comment) {
      lines.push(`- **Comment:** ${pkg.approvals.edd.comment}`);
    }
    lines.push('');
  }
  
  lines.push('---');
  lines.push('');
  
  // ========== WORKFLOW EXECUTION TRACE ==========
  lines.push('## ⚙️ Workflow Execution Timeline');
  lines.push('');
  lines.push(`**Run ID:** \`${pkg.graphTrace.runId}\``);
  lines.push(`**Started:** ${formatDateTime(pkg.graphTrace.startedAt)}`);
  lines.push(`**Completed:** ${formatDateTime(pkg.graphTrace.completedAt)}`);
  lines.push(`**Total Duration:** ${formatDuration(pkg.graphTrace.durationMs)}`);
  lines.push('');
  
  if (pkg.graphTrace.nodes && pkg.graphTrace.nodes.length > 0) {
    lines.push('### Execution Steps');
    lines.push('');
    lines.push('| Step | Node | Status | Duration |');
    lines.push('|------|------|--------|----------|');
    
    pkg.graphTrace.nodes.forEach((node, idx) => {
      const status = formatNodeStatus(node.status);
      const duration = node.durationMs ? formatDuration(node.durationMs) : 'N/A';
      lines.push(`| ${idx + 1} | ${node.nodeName} | ${status} | ${duration} |`);
    });
    lines.push('');
  }
  
  lines.push('---');
  lines.push('');
  
  // ========== EVIDENCE DASHBOARD (IF DEMO MODE) ==========
  if (pkg.evidenceDashboard && pkg.evidenceDashboard.triggered) {
    lines.push('## 🔬 Evidence Analysis (Demo Mode)');
    lines.push('');
    if (pkg.evidenceDashboard.evidenceSummary) {
      lines.push(`**Summary:** ${pkg.evidenceDashboard.evidenceSummary}`);
      lines.push('');
    }
    if (pkg.evidenceDashboard.findings && pkg.evidenceDashboard.findings.length > 0) {
      lines.push('### Findings');
      lines.push('');
      pkg.evidenceDashboard.findings.forEach((finding: any, idx: number) => {
        lines.push(`${idx + 1}. ${JSON.stringify(finding)}`);
      });
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }
  
  // ========== FOOTER ==========
  lines.push('---');
  lines.push('');
  lines.push('*This report was generated automatically by the Agentic Review System.*');
  lines.push(`*Package Version: ${pkg.packageVersion}*`);
  lines.push('');
  
  return lines.join('\n');
}

// ========== FORMATTING HELPERS ==========

function formatDateTime(isoString: string): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  } catch {
    return isoString;
  }
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else if (seconds > 0) {
    return `${seconds}s`;
  } else {
    return `${ms}ms`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDecision(decision: string): string {
  switch (decision.toLowerCase()) {
    case 'approve':
    case 'approved':
      return '✅ **APPROVED**';
    case 'reject':
    case 'rejected':
      return '❌ **REJECTED**';
    case 'approved_with_edd':
      return '✅ **APPROVED (with EDD)**';
    default:
      return decision.toUpperCase();
  }
}

function formatFinalStatus(status: string, decision: string): string {
  if (status === 'COMPLETE' && decision.toLowerCase().includes('approve')) {
    return '✅ **APPROVED & COMPLETED**';
  } else if (status === 'COMPLETE' && decision.toLowerCase().includes('reject')) {
    return '❌ **REJECTED**';
  } else if (status === 'FAILED') {
    return '⚠️ **FAILED**';
  } else {
    return `🔄 **${status}**`;
  }
}

function formatRiskLevel(level: string): string {
  switch (level.toLowerCase()) {
    case 'low':
      return '🟢 **LOW RISK**';
    case 'medium':
      return '🟡 **MEDIUM RISK**';
    case 'high':
      return '🟠 **HIGH RISK**';
    case 'critical':
      return '🔴 **CRITICAL RISK**';
    default:
      return level.toUpperCase();
  }
}

function formatNodeStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'executed':
      return '✅ Executed';
    case 'failed':
      return '❌ Failed';
    case 'skipped':
      return '⏭️ Skipped';
    case 'waiting':
      return '⏳ Waiting';
    default:
      return status;
  }
}

/**
 * Download a text file (Markdown or HTML)
 */
export function downloadTextFile(content: string, filename: string, mimeType: string = 'text/markdown'): void {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log(`[HumanReadableReport] Downloaded: ${filename}`);
  } catch (error: any) {
    console.error('[HumanReadableReport] Download failed:', error.message);
    throw error;
  }
}


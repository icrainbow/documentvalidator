/**
 * Flow2: Approval Package Generation
 * 
 * Packages full review trace + evidence into downloadable files:
 * 1. Human-readable Markdown report (Review_Status_Report_{runId}.md)
 * 2. Machine-readable JSON data (Review_Data_Package_{runId}.json)
 * 
 * PHASE 3 implementation - client-side packaging from poll endpoint data.
 */

import { generateMarkdownReport, downloadTextFile } from './generateHumanReadableReport';

export interface ApprovalPackage {
  packageVersion: '1.0';
  generatedAt: string;
  documentId: string;
  
  // Document metadata
  documents: {
    count: number;
    filenames: string[];
    totalSizeBytes?: number;
  };
  
  // Graph execution trace
  graphTrace: {
    graphId: string;
    version: string;
    runId: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
    
    // Node execution history
    nodes: Array<{
      nodeId: string;
      nodeName: string;
      status: 'executed' | 'failed' | 'skipped' | 'waiting';
      startedAt?: string;
      endedAt?: string;
      durationMs?: number;
      decision?: string;
      metadata?: any;
    }>;
  };
  
  // Risk assessment results
  riskAssessment: {
    overallLevel: 'low' | 'medium' | 'high' | 'critical';
    signals: Array<{
      category: string;
      severity: string;
      title: string;
      detail: string;
    }>;
  };
  
  // Topic summaries (LLM-generated)
  topicSummaries: Array<{
    topic_id: string;
    title: string;
    coverage: string;
    bullets: string[];
    evidence?: any[];
  }>;
  
  // Evidence dashboard (demo-only)
  evidenceDashboard?: {
    triggered: boolean;
    findings: any[];
    evidenceSummary?: string;
  };
  
  // Approval decisions
  approvals: {
    stage1: {
      decision: 'approve' | 'reject';
      decidedBy: string;
      decidedAt: string;
      comment?: string;
    };
    edd?: {
      decision: 'approve' | 'reject';
      decidedBy: string;
      decidedAt: string;
      comment?: string;
    };
  };
  
  // Final outcome
  finalOutcome: {
    status: 'COMPLETE' | 'FAILED' | 'RUNNING';
    decision: 'approved' | 'rejected' | 'approved_with_edd';
    reason?: string;
    completedAt: string;
  };
}

/**
 * Create approval package from checkpoint metadata (from poll endpoint)
 */
export function createApprovalPackage(
  runId: string,
  checkpointMetadata: any
): ApprovalPackage {
  const now = new Date().toISOString();
  
  // Extract document info
  const documents = checkpointMetadata.documents || [];
  const documentInfo = {
    count: documents.length,
    filenames: documents.map((d: any) => d.filename || 'unknown'),
    totalSizeBytes: documents.reduce((sum: number, d: any) => sum + (d.size || 0), 0),
  };
  
  // Extract graph trace
  const graphState = checkpointMetadata.graph_state || {};
  const graphTrace = {
    graphId: 'flow2_kyc_v1',
    version: '1.0.0',
    runId: runId,
    startedAt: checkpointMetadata.created_at || '',
    completedAt: checkpointMetadata.decided_at || now,
    durationMs: calculateDuration(checkpointMetadata.created_at, checkpointMetadata.decided_at),
    nodes: extractNodeHistory(graphState),
  };
  
  // Extract risk assessment
  const riskAssessment = extractRiskData(graphState);
  
  // Extract topic summaries
  const topicSummaries = checkpointMetadata.topic_summaries || [];
  
  // Extract approvals
  const approvals: any = {
    stage1: {
      decision: checkpointMetadata.decision || 'approve',
      decidedBy: checkpointMetadata.decided_by || 'Unknown',
      decidedAt: checkpointMetadata.decided_at || '',
      comment: checkpointMetadata.decision_comment,
    },
  };
  
  if (checkpointMetadata.edd_stage) {
    approvals.edd = {
      decision: checkpointMetadata.edd_stage.decision || 'reject',
      decidedBy: checkpointMetadata.edd_stage.decided_by || 'Unknown',
      decidedAt: checkpointMetadata.edd_stage.decided_at || '',
      comment: checkpointMetadata.edd_stage.decision_comment,
    };
  }
  
  // Build final outcome
  const finalOutcome = {
    status: checkpointMetadata.reviewProcessStatus || 'RUNNING',
    decision: checkpointMetadata.final_decision || 'rejected',
    reason: checkpointMetadata.failureReason,
    completedAt: checkpointMetadata.decided_at || checkpointMetadata.failedAt || now,
  };
  
  // Build package
  const pkg: ApprovalPackage = {
    packageVersion: '1.0',
    generatedAt: now,
    documentId: runId,
    documents: documentInfo,
    graphTrace,
    riskAssessment,
    topicSummaries,
    approvals,
    finalOutcome,
  };
  
  // Add evidence dashboard if demo mode
  if (checkpointMetadata.demo_evidence) {
    pkg.evidenceDashboard = {
      triggered: true,
      findings: checkpointMetadata.demo_evidence.findings || [],
      evidenceSummary: checkpointMetadata.demo_evidence.evidence_summary,
    };
  }
  
  return pkg;
}

/**
 * Download approval package (both human-readable and machine-readable formats)
 */
export function downloadApprovalPackage(
  runId: string,
  checkpointMetadata: any
): void {
  try {
    const pkg = createApprovalPackage(runId, checkpointMetadata);
    
    // Generate short ID for filename
    const shortId = runId.slice(0, 8);
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19); // YYYYMMDD_HHmmss
    
    // 1. Download HUMAN-READABLE Markdown report
    const markdownReport = generateMarkdownReport(pkg);
    const markdownFilename = `Review_Status_Report_${shortId}.md`;
    downloadTextFile(markdownReport, markdownFilename, 'text/markdown');
    
    // Small delay to avoid browser blocking multiple downloads
    setTimeout(() => {
      // 2. Download MACHINE-READABLE JSON package
      const jsonString = JSON.stringify(pkg, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const jsonFilename = `Review_Data_Package_${shortId}_${timestamp}.json`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = jsonFilename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log(`[ApprovalPackage] Downloaded: ${markdownFilename} + ${jsonFilename}`);
    }, 300);
    
  } catch (error: any) {
    console.error('[ApprovalPackage] Download failed:', error.message);
    throw error;
  }
}

// ========== Helper Functions ==========

function calculateDuration(start?: string, end?: string): number {
  if (!start || !end) return 0;
  try {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    return Math.max(0, endMs - startMs);
  } catch {
    return 0;
  }
}

function extractNodeHistory(graphState: any): any[] {
  if (!graphState?.trace?.events) return [];
  
  return graphState.trace.events.map((event: any) => ({
    nodeId: event.node || event.nodeId || 'unknown',
    nodeName: event.node || event.nodeId || 'unknown',
    status: event.status || 'executed',
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    durationMs: event.durationMs,
    decision: event.decision,
    metadata: event.metadata || event.reason,
  }));
}

function extractRiskData(graphState: any): any {
  const issues = graphState?.issues || [];
  const riskIssues = issues.filter((i: any) => 
    i.category === 'kyc_risk' || 
    i.category === 'sanctions' ||
    i.category === 'pep' ||
    i.category === 'aml'
  );
  
  return {
    overallLevel: determineOverallRisk(riskIssues),
    signals: riskIssues.map((i: any) => ({
      category: i.category || 'unknown',
      severity: normalizeSeverity(i.severity),
      title: i.message || i.title || 'Unknown issue',
      detail: i.detail || i.message || '',
    })),
  };
}

function determineOverallRisk(issues: any[]): 'low' | 'medium' | 'high' | 'critical' {
  if (issues.length === 0) return 'low';
  
  const hasCritical = issues.some(i => 
    i.severity === 'critical' || 
    i.severity === 'high' ||
    i.severity === 'FAIL'
  );
  if (hasCritical) return 'high';
  
  const hasMedium = issues.some(i => 
    i.severity === 'medium' || 
    i.severity === 'warning' ||
    i.severity === 'WARNING'
  );
  if (hasMedium) return 'medium';
  
  return 'low';
}

function normalizeSeverity(severity: any): string {
  if (!severity) return 'info';
  const s = String(severity).toLowerCase();
  
  if (s === 'fail' || s === 'critical' || s === 'high') return 'high';
  if (s === 'warning' || s === 'medium') return 'medium';
  if (s === 'info' || s === 'low') return 'low';
  
  return s;
}



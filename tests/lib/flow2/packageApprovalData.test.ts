/**
 * Unit Tests: Approval Package Generation
 * 
 * Tests for app/lib/flow2/packageApprovalData.ts
 */

import { describe, it, expect } from '@jest/globals';
import { createApprovalPackage, ApprovalPackage } from '@/app/lib/flow2/packageApprovalData';

describe('createApprovalPackage', () => {
  it('should create package with basic required fields', () => {
    const mockMetadata = {
      created_at: '2026-01-01T00:00:00Z',
      decided_at: '2026-01-01T01:00:00Z',
      decision: 'reject',
      reviewProcessStatus: 'FAILED',
      failureReason: 'EDD review rejected',
      failedAt: '2026-01-01T01:00:00Z',
      failedStage: 'edd_review',
      documents: [],
      graph_state: {},
      topic_summaries: [],
      decided_by: 'test@example.com',
    };
    
    const pkg = createApprovalPackage('test-run-id-12345678', mockMetadata);
    
    expect(pkg.packageVersion).toBe('1.0');
    expect(pkg.documentId).toBe('test-run-id-12345678');
    expect(pkg.generatedAt).toBeDefined();
    expect(pkg.documents).toBeDefined();
    expect(pkg.graphTrace).toBeDefined();
    expect(pkg.riskAssessment).toBeDefined();
    expect(pkg.topicSummaries).toBeDefined();
    expect(pkg.approvals).toBeDefined();
    expect(pkg.finalOutcome).toBeDefined();
  });

  it('should include FAILED status in final outcome', () => {
    const mockMetadata = {
      reviewProcessStatus: 'FAILED',
      failureReason: 'EDD review rejected by reviewer',
      failedAt: '2026-01-01T02:00:00Z',
      final_decision: 'rejected',
      documents: [],
      graph_state: {},
    };
    
    const pkg = createApprovalPackage('test-run-id', mockMetadata);
    
    expect(pkg.finalOutcome.status).toBe('FAILED');
    expect(pkg.finalOutcome.reason).toBe('EDD review rejected by reviewer');
    expect(pkg.finalOutcome.decision).toBe('rejected');
    expect(pkg.finalOutcome.completedAt).toBe('2026-01-01T02:00:00Z');
  });

  it('should include EDD approval if present', () => {
    const mockMetadata = {
      decision: 'reject',
      decided_by: 'human@example.com',
      decided_at: '2026-01-01T01:00:00Z',
      edd_stage: {
        decision: 'approve',
        decided_by: 'edd@example.com',
        decided_at: '2026-01-01T02:00:00Z',
        decision_comment: 'EDD approved after review',
      },
      reviewProcessStatus: 'COMPLETE',
      final_decision: 'approved_with_edd',
      documents: [],
      graph_state: {},
    };
    
    const pkg = createApprovalPackage('test-run-id', mockMetadata);
    
    expect(pkg.approvals.stage1.decision).toBe('reject');
    expect(pkg.approvals.stage1.decidedBy).toBe('human@example.com');
    expect(pkg.approvals.edd).toBeDefined();
    expect(pkg.approvals.edd?.decision).toBe('approve');
    expect(pkg.approvals.edd?.decidedBy).toBe('edd@example.com');
  });

  it('should include document metadata without full text', () => {
    const mockMetadata = {
      documents: [
        { filename: 'doc1.pdf', size: 1000 },
        { filename: 'doc2.pdf', size: 2000 },
        { filename: 'doc3.pdf', size: 3000 },
      ],
      graph_state: {},
    };
    
    const pkg = createApprovalPackage('test-run-id', mockMetadata);
    
    expect(pkg.documents.count).toBe(3);
    expect(pkg.documents.filenames).toEqual(['doc1.pdf', 'doc2.pdf', 'doc3.pdf']);
    expect(pkg.documents.totalSizeBytes).toBe(6000);
  });

  it('should include evidence dashboard if demo mode', () => {
    const mockMetadata = {
      demo_evidence: {
        findings: [
          { severity: 'high', title: 'Finding 1', detail: 'Detail 1' },
          { severity: 'medium', title: 'Finding 2', detail: 'Detail 2' },
        ],
        evidence_summary: 'Demo evidence summary',
      },
      documents: [],
      graph_state: {},
    };
    
    const pkg = createApprovalPackage('test-run-id', mockMetadata);
    
    expect(pkg.evidenceDashboard).toBeDefined();
    expect(pkg.evidenceDashboard?.triggered).toBe(true);
    expect(pkg.evidenceDashboard?.findings.length).toBe(2);
    expect(pkg.evidenceDashboard?.evidenceSummary).toBe('Demo evidence summary');
  });

  it('should extract node history from graph trace', () => {
    const mockMetadata = {
      graph_state: {
        trace: {
          events: [
            { node: 'doc_analysis', status: 'executed', startedAt: '2026-01-01T00:01:00Z', endedAt: '2026-01-01T00:02:00Z', durationMs: 60000 },
            { node: 'risk_assessment', status: 'executed', startedAt: '2026-01-01T00:02:00Z', endedAt: '2026-01-01T00:03:00Z', durationMs: 60000 },
            { node: 'human_review', status: 'failed', decision: 'reject', startedAt: '2026-01-01T00:03:00Z', endedAt: '2026-01-01T00:04:00Z' },
          ],
        },
      },
      documents: [],
    };
    
    const pkg = createApprovalPackage('test-run-id', mockMetadata);
    
    expect(pkg.graphTrace.nodes.length).toBe(3);
    expect(pkg.graphTrace.nodes[0].nodeId).toBe('doc_analysis');
    expect(pkg.graphTrace.nodes[0].status).toBe('executed');
    expect(pkg.graphTrace.nodes[2].nodeId).toBe('human_review');
    expect(pkg.graphTrace.nodes[2].status).toBe('failed');
    expect(pkg.graphTrace.nodes[2].decision).toBe('reject');
  });

  it('should extract risk assessment data', () => {
    const mockMetadata = {
      graph_state: {
        issues: [
          { category: 'kyc_risk', severity: 'high', message: 'High risk detected', detail: 'Risk detail 1' },
          { category: 'sanctions', severity: 'medium', message: 'Sanction warning', detail: 'Risk detail 2' },
          { category: 'pep', severity: 'INFO', message: 'PEP info', detail: 'Info detail' },
        ],
      },
      documents: [],
    };
    
    const pkg = createApprovalPackage('test-run-id', mockMetadata);
    
    expect(pkg.riskAssessment.overallLevel).toBe('high');
    expect(pkg.riskAssessment.signals.length).toBe(3);
    expect(pkg.riskAssessment.signals[0].severity).toBe('high');
    expect(pkg.riskAssessment.signals[0].category).toBe('kyc_risk');
    expect(pkg.riskAssessment.signals[1].severity).toBe('medium');
    expect(pkg.riskAssessment.signals[2].severity).toBe('low'); // INFO normalized to low
  });

  it('should include topic summaries', () => {
    const mockMetadata = {
      topic_summaries: [
        {
          topic_id: 'source_of_funds',
          title: 'Source of Funds',
          coverage: 'PRESENT',
          bullets: ['Bullet 1', 'Bullet 2'],
          evidence: [{ quote: 'Evidence quote' }],
        },
        {
          topic_id: 'sanctions',
          title: 'Sanctions Check',
          coverage: 'WEAK',
          bullets: ['Bullet 3'],
        },
      ],
      documents: [],
      graph_state: {},
    };
    
    const pkg = createApprovalPackage('test-run-id', mockMetadata);
    
    expect(pkg.topicSummaries.length).toBe(2);
    expect(pkg.topicSummaries[0].topic_id).toBe('source_of_funds');
    expect(pkg.topicSummaries[0].bullets.length).toBe(2);
    expect(pkg.topicSummaries[1].coverage).toBe('WEAK');
  });

  it('should handle missing optional fields gracefully', () => {
    const mockMetadata = {
      // Minimal metadata
      documents: [],
      graph_state: {},
    };
    
    const pkg = createApprovalPackage('test-run-id', mockMetadata);
    
    expect(pkg).toBeDefined();
    expect(pkg.packageVersion).toBe('1.0');
    expect(pkg.documents.count).toBe(0);
    expect(pkg.graphTrace.nodes.length).toBe(0);
    expect(pkg.topicSummaries.length).toBe(0);
    expect(pkg.approvals.stage1.decision).toBe('approve'); // Default
    expect(pkg.approvals.edd).toBeUndefined();
  });

  it('should NOT include any environment variables or secrets', () => {
    const mockMetadata = {
      approval_token: 'secret-token-12345',
      edd_stage: {
        approval_token: 'secret-edd-token-67890',
      },
      documents: [],
      graph_state: {},
    };
    
    const pkg = createApprovalPackage('test-run-id', mockMetadata);
    const pkgString = JSON.stringify(pkg);
    
    // Ensure no tokens/secrets are included
    expect(pkgString).not.toContain('secret-token');
    expect(pkgString).not.toContain('approval_token');
  });

  it('should generate deterministic filename format', () => {
    // This test is more for downloadApprovalPackage, but we can verify structure
    const mockMetadata = {
      documents: [],
      graph_state: {},
    };
    
    const pkg = createApprovalPackage('test-run-id-12345678', mockMetadata);
    
    // Filename should be: approval-package_{run_id_slice}_{timestamp}.json
    // We can't test the actual download, but we can verify the package is JSON-serializable
    expect(() => JSON.stringify(pkg)).not.toThrow();
    expect(pkg.documentId.slice(0, 8)).toBe('test-run');
  });
});

describe('downloadApprovalPackage', () => {
  // Browser-only tests (require jsdom or browser environment)
  // Skipped in Node.js environment
  
  it.skip('should trigger browser download (requires browser environment)', () => {
    // This test would require mocking window.URL, Blob, createElement, etc.
    // In real e2e tests with Playwright, we can verify the download happens
  });
});



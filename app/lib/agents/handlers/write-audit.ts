import { AgentHandler } from '../types';
import { AuditEvent } from '../domain';

interface WriteAuditInput {
  document_id: string;
  agent_activity: Array<{
    agent_id: string;
    trace_id: string;
    timestamp: string;
    status: 'success' | 'error' | 'blocked';
    summary: string;
  }>;
  final_decision: 'approved' | 'rejected' | 'needs_revision' | 'pending_evidence';
  reviewer?: string;
  flagged_issues_count?: number;
}

interface WriteAuditOutput extends AuditEvent {}

export const writeAuditHandler: AgentHandler<WriteAuditInput, WriteAuditOutput> = async (input, context) => {
  if (context.mode === 'fake') {
    const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const timestamp = new Date().toISOString();
    
    // Determine compliance status based on final decision
    let complianceStatus: AuditEvent['compliance_status'];
    switch (input.final_decision) {
      case 'approved':
        complianceStatus = 'compliant';
        break;
      case 'rejected':
        complianceStatus = 'non_compliant';
        break;
      case 'needs_revision':
        complianceStatus = 'conditional';
        break;
      case 'pending_evidence':
        complianceStatus = 'under_review';
        break;
      default:
        complianceStatus = 'under_review';
    }

    // Build executive summary
    const agentCount = input.agent_activity.length;
    const errorCount = input.agent_activity.filter(a => a.status === 'error').length;
    const blockedCount = input.agent_activity.filter(a => a.status === 'blocked').length;
    const flaggedIssues = input.flagged_issues_count || 0;

    const summary = `Document ${input.document_id} underwent compliance review with ${agentCount} agent operations. ` +
      `Final decision: ${input.final_decision.toUpperCase()}. ` +
      `${flaggedIssues} issue(s) flagged. ` +
      `${errorCount > 0 ? `${errorCount} agent error(s). ` : ''}` +
      `${blockedCount > 0 ? `${blockedCount} operation(s) blocked. ` : ''}` +
      `Compliance status: ${complianceStatus}.`;

    // Build detailed audit trail (markdown format)
    const details = `# Audit Report: ${auditId}

## Document Information
- **Document ID:** ${input.document_id}
- **Audit Timestamp:** ${timestamp}
- **Reviewer:** ${input.reviewer || 'Automated System'}
- **Final Decision:** ${input.final_decision}
- **Compliance Status:** ${complianceStatus}

## Agent Activity Log

${input.agent_activity.map((activity, idx) => `
### ${idx + 1}. ${activity.agent_id}
- **Trace ID:** ${activity.trace_id}
- **Timestamp:** ${activity.timestamp}
- **Status:** ${activity.status === 'success' ? '✅ Success' : activity.status === 'error' ? '❌ Error' : '🚫 Blocked'}
- **Summary:** ${activity.summary}
`).join('\n')}

## Review Summary

- **Total Agent Operations:** ${agentCount}
- **Successful Operations:** ${input.agent_activity.filter(a => a.status === 'success').length}
- **Failed Operations:** ${errorCount}
- **Blocked Operations:** ${blockedCount}
- **Issues Flagged:** ${flaggedIssues}

## Compliance Assessment

**Status:** ${complianceStatus.toUpperCase()}

${complianceStatus === 'compliant' ? 
  'This document meets all regulatory and internal policy requirements.' :
  complianceStatus === 'non_compliant' ?
  'This document has critical compliance issues that prevent approval.' :
  complianceStatus === 'conditional' ?
  'This document may proceed with specified conditions and follow-up requirements.' :
  'This document is under review pending additional evidence or clarification.'
}

## Next Steps

${input.final_decision === 'approved' ?
  '- Proceed with implementation as outlined\n- Archive approval documentation\n- Schedule periodic review' :
  input.final_decision === 'rejected' ?
  '- Address critical compliance violations\n- Resubmit revised document for review\n- Escalate to compliance officer if needed' :
  input.final_decision === 'needs_revision' ?
  '- Review flagged issues and evidence requests\n- Provide additional documentation\n- Resubmit for expedited review' :
  '- Await requested evidence from client\n- Monitor evidence submission deadline\n- Resume review upon receipt of information'
}

---
*This audit record is generated automatically and stored in the compliance database.*
`;

    // Calculate next review date
    let nextReviewDate: string | undefined;
    if (input.final_decision === 'approved') {
      // Approved documents reviewed quarterly
      const reviewDate = new Date();
      reviewDate.setMonth(reviewDate.getMonth() + 3);
      nextReviewDate = reviewDate.toISOString();
    } else if (input.final_decision === 'pending_evidence') {
      // Pending reviews checked in 7 days
      const reviewDate = new Date();
      reviewDate.setDate(reviewDate.getDate() + 7);
      nextReviewDate = reviewDate.toISOString();
    }

    return {
      audit_id: auditId,
      timestamp,
      document_id: input.document_id,
      agent_activity: input.agent_activity,
      final_decision: input.final_decision,
      compliance_status: complianceStatus,
      summary,
      details,
      flagged_issues: flaggedIssues,
      next_review_date: nextReviewDate,
      reviewer: input.reviewer || 'Automated System',
    };
  }

  throw new Error('Real write-audit not implemented yet.');
};


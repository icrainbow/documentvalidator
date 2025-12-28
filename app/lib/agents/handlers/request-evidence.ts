import { AgentHandler } from '../types';
import { EvidenceRequest, RedTeamIssue } from '../domain';

interface RequestEvidenceInput {
  issues: RedTeamIssue[];
  missing_evidence: string[]; // List of missing evidence descriptions
  context: string; // Document or section context
}

interface RequestEvidenceOutput {
  requests: EvidenceRequest[];
  total_requests: number;
  immediate_count: number;
}

export const requestEvidenceHandler: AgentHandler<RequestEvidenceInput, RequestEvidenceOutput> = async (input, context) => {
  if (context.mode === 'fake') {
    const requests: EvidenceRequest[] = [];
    let requestIdCounter = 1;

    // Generate evidence requests from issues
    input.issues.forEach(issue => {
      let requestType: EvidenceRequest['request_type'] = 'clarification';
      let priority: EvidenceRequest['priority'] = 'medium';
      let requiredFrom = 'Client';
      let requestText = '';
      let reason = '';

      switch (issue.type) {
        case 'policy_violation':
          requestType = issue.severity === 'critical' ? 'approval' : 'documentation';
          priority = issue.severity === 'critical' ? 'immediate' : 'high';
          requiredFrom = issue.severity === 'critical' ? 'Compliance Officer' : 'Client';
          requestText = `Please provide documentation or approval to address: ${issue.description}`;
          reason = `Policy violation detected: ${issue.policy_refs?.join(', ')}`;
          break;

        case 'missing_info':
          requestType = 'documentation';
          priority = issue.severity === 'critical' ? 'immediate' : issue.severity === 'high' ? 'high' : 'medium';
          requiredFrom = 'Client';
          requestText = `Please provide the following information: ${issue.description}`;
          reason = 'Required information is missing from the document';
          break;

        case 'logical_error':
          requestType = 'clarification';
          priority = 'high';
          requiredFrom = 'Client';
          requestText = `Please clarify or correct: ${issue.description}`;
          reason = 'Logical inconsistency detected';
          break;

        case 'formatting':
          requestType = 'clarification';
          priority = 'low';
          requiredFrom = 'Document Preparer';
          requestText = `Please correct formatting issue: ${issue.description}`;
          reason = 'Document formatting does not meet standards';
          break;

        case 'tone':
          requestType = 'clarification';
          priority = 'low';
          requiredFrom = 'Document Preparer';
          requestText = `Please revise language: ${issue.description}`;
          reason = 'Document tone is inappropriate for context';
          break;
      }

      // Calculate deadline based on priority
      const now = new Date();
      let deadline: string | undefined;
      switch (priority) {
        case 'immediate':
          deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
          break;
        case 'high':
          deadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days
          break;
        case 'medium':
          deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week
          break;
        case 'low':
          deadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 2 weeks
          break;
      }

      requests.push({
        id: `EVR-${String(requestIdCounter++).padStart(4, '0')}`,
        request_type: requestType,
        request_text: requestText,
        reason: reason,
        priority: priority,
        required_from: requiredFrom,
        related_issue_ids: [issue.id],
        deadline,
      });
    });

    // Generate evidence requests from missing evidence list
    input.missing_evidence.forEach(evidence => {
      requests.push({
        id: `EVR-${String(requestIdCounter++).padStart(4, '0')}`,
        request_type: 'supporting_data',
        request_text: `Please provide: ${evidence}`,
        reason: 'Required supporting evidence is missing',
        priority: 'medium',
        required_from: 'Client',
        related_issue_ids: [],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    });

    // Count immediate requests
    const immediateCount = requests.filter(r => r.priority === 'immediate').length;

    return {
      requests,
      total_requests: requests.length,
      immediate_count: immediateCount,
    };
  }

  throw new Error('Real request-evidence not implemented yet.');
};


/**
 * Contract Risk Review Flow Definition
 * Extract → Map to Contract Standards → Adversarial Review → [Branch] → Evidence Requests → Risk Summary → Audit
 */

import { FlowDefinition, OrchestrationContext } from '../types';
import { analyzeContractRiskAndDecide } from '../analyzers/contract-risk-analyzer';

export const CONTRACT_RISK_REVIEW_FLOW: FlowDefinition = {
  id: 'contract-risk-review-v1',
  name: 'Contract Risk Review Workflow',
  version: '1.0.0',
  description: 'Contractual risk assessment: Extract contract terms → Map to standards → Adversarial review → Branch on risk level → Generate evidence requests (if needed) → Draft risk summary → Write audit log',
  
  // Main sequence: always executed
  mainSequence: [
    {
      id: 'extract-contract-terms',
      name: 'Extract Contract Terms',
      agent_id: 'extract-facts-agent',
      artifact_key: 'facts',
      critical: true,
      prepareInput: (context: OrchestrationContext) => ({
        sectionContent: context.sections[0].content,
        sectionTitle: context.sections[0].title,
        sectionId: context.sections[0].id,
        docId: context.document_id,
        // Hint to agent: focus on contractual elements
        extractionFocus: 'contractual',
      }),
    },
    {
      id: 'map-to-standards',
      name: 'Map to Contract Standards',
      agent_id: 'map-policy-agent',
      artifact_key: 'policy_mappings',
      critical: true,
      prepareInput: (context: OrchestrationContext) => {
        const facts = context.artifacts.facts?.facts || [];
        return {
          facts: facts,
          sectionContent: context.sections[0].content,
          sectionTitle: context.sections[0].title,
          // Hint to agent: use contract template matching instead of policy
          matchingStrategy: 'contract_template',
          documentType: 'contract',
        };
      },
    },
    {
      id: 'adversarial-contract-review',
      name: 'Adversarial Contract Review',
      agent_id: 'redteam-review-agent',
      artifact_key: 'review_issues',
      critical: true,
      prepareInput: (context: OrchestrationContext) => {
        const mappings = context.artifacts.policy_mappings?.mappings || [];
        return {
          sectionContent: context.sections[0].content,
          sectionTitle: context.sections[0].title,
          sectionId: context.sections[0].id,
          policyMappings: mappings,
          // Hint to agent: focus on contract-specific risks
          reviewMode: 'contract_risk',
        };
      },
    },
  ],
  
  // Conditional steps: executed based on decision analyzer
  conditionalSteps: [
    {
      id: 'request-contract-evidence',
      name: 'Request Contract Evidence',
      agent_id: 'request-evidence-agent',
      artifact_key: 'evidence_requests',
      critical: false,
      // Condition evaluated by orchestrator based on decision
      condition: (context: OrchestrationContext) => {
        // Run if decision is escalate_legal or negotiate_terms
        return (
          context.decision?.next_action === 'escalate_legal' ||
          context.decision?.next_action === 'negotiate_terms'
        );
      },
      prepareInput: (context: OrchestrationContext) => {
        const issues = context.artifacts.review_issues?.issues || [];
        const mappings = context.artifacts.policy_mappings?.mappings || [];
        
        // Extract missing evidence from high-risk/non-standard mappings
        const missingEvidence: string[] = [];
        
        mappings.forEach((mapping) => {
          if (mapping.risk_level === 'high' || mapping.risk_level === 'non_standard') {
            missingEvidence.push(`Review required for: ${mapping.policy_rule.title}`);
          }
        });
        
        // Add contract-specific evidence requests
        issues.forEach((issue) => {
          if (issue.type === 'unlimited_liability') {
            missingEvidence.push('Executive approval for unlimited liability clause');
          }
          if (issue.type === 'missing_signature') {
            missingEvidence.push('Signed signature page from authorized signatory');
          }
        });
        
        return {
          issues,
          missing_evidence: missingEvidence,
          context: `Contract ${context.document_id}, Section "${context.sections[0].title}"`,
          evidenceType: 'contract_exhibits',
        };
      },
    },
  ],
  
  // Finalization: always executed at the end
  finalizationSteps: [
    {
      id: 'draft-risk-summary',
      name: 'Draft Contract Risk Summary',
      agent_id: 'draft-client-comms-agent',
      artifact_key: 'client_communication',
      critical: false,
      prepareInput: (context: OrchestrationContext) => {
        const opts = context.options ?? {
          tone: 'formal' as const,
          language: 'english' as const,
          client_name: 'Client',
          reviewer: 'Automated Contract System',
          mode: 'fake' as const,
          skip_steps: [],
        };
        const issues = context.artifacts.review_issues?.issues || [];
        const facts = context.artifacts.facts?.facts || [];
        const mappings = context.artifacts.policy_mappings?.mappings || [];
        const requests = context.artifacts.evidence_requests?.requests || [];
        
        const criticalCount = issues.filter((i) => i.severity === 'critical').length;
        const highCount = issues.filter((i) => i.severity === 'high').length;
        
        const overallStatus =
          context.decision?.next_action === 'ready_to_sign' || 
          context.decision?.next_action === 'acceptable_risk'
            ? 'pass'
            : 'fail';
        
        return {
          review_summary: {
            facts: facts,
            issues: issues,
            policyMappings: mappings,
            evidenceRequests: requests,
          },
          review_results: {
            overall_status: overallStatus,
            issues,
            critical_count: criticalCount,
            high_count: highCount,
          },
          tone: opts.tone,
          language: opts.language,
          client_name: opts.client_name,
          // Hint: this is a contract risk summary
          communicationType: 'contract_risk_summary',
        };
      },
    },
    {
      id: 'log-contract-review',
      name: 'Audit Contract Review',
      agent_id: 'write-audit-agent',
      artifact_key: 'audit_log',
      critical: false,
      prepareInput: (context: OrchestrationContext) => {
        const opts = context.options ?? {
          tone: 'formal' as const,
          language: 'english' as const,
          client_name: 'Client',
          reviewer: 'Automated Contract Review System',
          mode: 'fake' as const,
          skip_steps: [],
        };
        const finalDecision = mapNextActionToFinalDecision(
          context.decision?.next_action || 'rejected'
        );
        
        return {
          document_id: context.document_id,
          agent_activity: context.execution.steps.map((step) => ({
            agent_id: step.agent_id,
            trace_id: step.trace_id,
            timestamp: step.completed_at,
            status: step.status,
            summary: step.output_summary,
          })),
          final_decision: finalDecision,
          reviewer: opts.reviewer,
          flagged_issues_count: context.artifacts.review_issues?.issues?.length || 0,
          auditType: 'contract_review',
        };
      },
    },
  ],
  
  // Attach contract-specific decision analyzer
  decisionAnalyzer: analyzeContractRiskAndDecide,
};

// Helper function to map next_action to audit final_decision
function mapNextActionToFinalDecision(
  action: string
): 'approved' | 'rejected' | 'needs_revision' | 'pending_evidence' | 'escalated' | 'under_negotiation' {
  switch (action) {
    case 'ready_to_sign':
    case 'acceptable_risk':
      return 'approved';
    case 'escalate_legal':
      return 'escalated';
    case 'negotiate_terms':
      return 'under_negotiation';
    case 'request_more_info':
      return 'pending_evidence';
    case 'rejected':
      return 'rejected';
    default:
      return 'needs_revision';
  }
}


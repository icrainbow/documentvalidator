/**
 * Compliance Review Flow Definition
 * Extract → Map Policy → Red Team → [Branch] → Evidence Requests → Client Comms → Audit
 */

import { FlowDefinition, OrchestrationContext } from '../types';
import { analyzeComplianceAndDecide } from '../analyzers/compliance-analyzer';

export const COMPLIANCE_REVIEW_FLOW: FlowDefinition = {
  id: 'compliance-review-v1',
  name: 'Compliance Review Workflow',
  version: '1.0.0',
  description: 'Full compliance review: Extract facts → Map to policies → Red team review → Branch on severity → Generate evidence requests (if needed) → Draft client communication → Write audit log',
  
  // Main sequence: always executed
  mainSequence: [
    {
      id: 'extract-facts',
      name: 'Extract Facts',
      agent_id: 'extract-facts-agent',
      artifact_key: 'facts',
      critical: true,
      prepareInput: (context: OrchestrationContext) => ({
        sectionContent: context.sections[0].content,
        sectionTitle: context.sections[0].title,
        sectionId: context.sections[0].id,
        docId: context.document_id,
      }),
    },
    {
      id: 'map-policy',
      name: 'Map to Policy Rules',
      agent_id: 'map-policy-agent',
      artifact_key: 'policy_mappings',
      critical: true,
      prepareInput: (context: OrchestrationContext) => ({
        facts: context.artifacts.facts?.facts || [],
        documentType: 'investment_proposal',
      }),
    },
    {
      id: 'redteam-review',
      name: 'Red Team Review',
      agent_id: 'redteam-review-agent',
      artifact_key: 'review_issues',
      critical: true,
      prepareInput: (context: OrchestrationContext) => ({
        sectionContent: context.sections[0].content,
        sectionTitle: context.sections[0].title,
        sectionId: context.sections[0].id,
        policyMappings: context.artifacts.policy_mappings?.mappings || [],
      }),
    },
  ],
  
  // Conditional steps: executed based on branching logic
  conditionalSteps: [
    {
      id: 'request-evidence',
      name: 'Request Evidence',
      agent_id: 'request-evidence-agent',
      artifact_key: 'evidence_requests',
      critical: false,
      condition: (context: OrchestrationContext) => {
        // Run if decision is request_more_info
        return context.decision?.next_action === 'request_more_info';
      },
      prepareInput: (context: OrchestrationContext) => {
        const issues = context.artifacts.review_issues?.issues || [];
        
        // Extract missing evidence from high/critical policy mappings
        const missingEvidence: string[] = [];
        const policyMappings = context.artifacts.policy_mappings?.mappings || [];
        
        policyMappings.forEach((mapping) => {
          if (mapping.risk_level === 'high' || mapping.risk_level === 'critical') {
            mapping.policy_rules.forEach((rule) => {
              if (rule.category === 'documentation') {
                missingEvidence.push(`Documentation for: ${rule.title}`);
              } else if (rule.category === 'kyc') {
                missingEvidence.push(`KYC verification: ${rule.title}`);
              } else if (rule.category === 'aml') {
                missingEvidence.push(`AML check: ${rule.title}`);
              }
            });
          }
        });
        
        return {
          issues,
          missing_evidence: missingEvidence,
          context: `Document ${context.document_id}, Section "${context.sections[0].title}"`,
        };
      },
    },
  ],
  
  // Finalization: always executed at the end
  finalizationSteps: [
    {
      id: 'draft-comms',
      name: 'Draft Client Communication',
      agent_id: 'draft-client-comms-agent',
      artifact_key: 'client_communication',
      critical: false,
      prepareInput: (context: OrchestrationContext) => {
        const opts = context.options ?? {
          tone: 'formal' as const,
          language: 'english' as const,
          client_name: 'Valued Client',
          reviewer: 'Automated System',
          mode: 'fake' as const,
          skip_steps: [],
        };
        const issues = context.artifacts.review_issues?.issues || [];
        const criticalCount = issues.filter((i) => i.severity === 'critical').length;
        const highCount = issues.filter((i) => i.severity === 'high').length;
        
        const overallStatus =
          context.decision?.next_action === 'ready_to_send' || context.decision?.next_action === 'approved'
            ? 'pass'
            : 'fail';
        
        return {
          review_results: {
            overall_status: overallStatus,
            issues,
            critical_count: criticalCount,
            high_count: highCount,
          },
          tone: opts.tone,
          language: opts.language,
          client_name: opts.client_name,
        };
      },
    },
    {
      id: 'write-audit',
      name: 'Write Audit Log',
      agent_id: 'write-audit-agent',
      artifact_key: 'audit_log',
      critical: false,
      prepareInput: (context: OrchestrationContext) => {
        const opts = context.options ?? {
          tone: 'formal' as const,
          language: 'english' as const,
          client_name: 'Valued Client',
          reviewer: 'Automated Compliance System',
          mode: 'fake' as const,
          skip_steps: [],
        };
        const finalDecision = mapNextActionToFinalDecision(context.decision?.next_action || 'rejected');
        
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
        };
      },
    },
  ],
  
  // Attach compliance-specific decision analyzer
  decisionAnalyzer: analyzeComplianceAndDecide,
};

// Helper function to map next_action to audit final_decision
function mapNextActionToFinalDecision(
  action: string
): 'approved' | 'rejected' | 'needs_revision' | 'pending_evidence' {
  switch (action) {
    case 'approved':
    case 'ready_to_send':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'request_more_info':
      return 'pending_evidence';
    default:
      return 'needs_revision';
  }
}


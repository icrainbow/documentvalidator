/**
 * Compliance Review Decision Analyzer
 * State machine logic for compliance-review-v1 flow
 */

import { OrchestrationContext, OrchestrateResponse } from '../types';

/**
 * Analyze compliance artifacts and decide next action
 */
export function analyzeComplianceAndDecide(
  context: OrchestrationContext
): OrchestrateResponse['decision'] {
  const issues = context.artifacts.review_issues?.issues || [];
  const policyMappings = context.artifacts.policy_mappings?.mappings || [];
  
  // Count severity levels
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const highCount = issues.filter((i) => i.severity === 'high').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const lowCount = issues.filter((i) => i.severity === 'low').length;
  
  // Check for prohibited/critical policy violations
  const criticalPolicyCount = policyMappings.filter(
    (m) => m.risk_level === 'critical'
  ).length;
  
  // Check for missing evidence (high-risk policy mappings)
  const missingEvidenceCount = policyMappings.filter(
    (m) => m.risk_level === 'high' || m.risk_level === 'critical'
  ).length;
  
  // Update signals
  context.signals.critical_count = criticalCount;
  context.signals.high_count = highCount;
  context.signals.medium_count = mediumCount;
  context.signals.low_count = lowCount;
  context.signals.flagged_policy_count = criticalPolicyCount;
  
  // Decision logic
  if (criticalCount > 0 || criticalPolicyCount > 0) {
    context.signals.branch_triggers.push('critical_issues_detected');
    
    return {
      next_action: 'rejected',
      reason: `${criticalCount} critical issue(s) and ${criticalPolicyCount} critical policy violation(s) prevent approval`,
      confidence: 1.0,
      recommended_actions: [
        'Address all critical violations immediately',
        'Remove prohibited content or seek executive approval',
        'Resubmit for review after corrections',
      ],
      blocking_issues: issues
        .filter((i) => i.severity === 'critical')
        .map((i) => i.description),
    };
  }
  
  if (highCount > 0 || missingEvidenceCount > 0) {
    context.signals.branch_triggers.push('high_issues_or_missing_evidence');
    
    return {
      next_action: 'request_more_info',
      reason: `${highCount} high-priority issue(s) and ${missingEvidenceCount} policy concern(s) require additional information`,
      confidence: 0.8,
      recommended_actions: [
        'Provide requested evidence and documentation',
        'Address flagged issues',
        'Schedule follow-up review after submission',
      ],
      blocking_issues: issues
        .filter((i) => i.severity === 'high')
        .map((i) => i.description),
    };
  }
  
  if (mediumCount > 0) {
    context.signals.branch_triggers.push('medium_issues_need_attention');
    
    return {
      next_action: 'request_more_info',
      reason: `${mediumCount} medium-priority issue(s) require attention before approval`,
      confidence: 0.7,
      recommended_actions: [
        'Review and address medium-priority issues',
        'Consider requesting additional context or clarifications',
        'Escalate to senior reviewer if needed',
      ],
      blocking_issues: issues
        .filter((i) => i.severity === 'medium')
        .map((i) => i.description),
    };
  }
  
  if (lowCount > 0) {
    context.signals.branch_triggers.push('low_issues_advisory_only');
    
    return {
      next_action: 'ready_to_send',
      reason: `Document approved with ${lowCount} minor advisory notice(s)`,
      confidence: 0.85,
      recommended_actions: [
        'Consider addressing low-priority suggestions for quality improvement',
        'Proceed with approval workflow',
        'Document advisories in audit log',
      ],
      blocking_issues: [],
    };
  }
  
  // No issues at all
  context.signals.branch_triggers.push('all_checks_passed');
  
  return {
    next_action: 'ready_to_send',
    reason: 'All compliance checks passed successfully',
    confidence: 0.95,
    recommended_actions: [
      'Send client communication',
      'Proceed with approval workflow',
      'Archive audit log for records',
    ],
    blocking_issues: [],
  };
}


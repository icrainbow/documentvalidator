/**
 * Contract Risk Review Decision Analyzer
 * State machine logic for contract-risk-review-v1 flow
 */

import { OrchestrationContext, OrchestrateResponse } from '../types';

/**
 * Analyze contract risk artifacts and decide next action
 */
export function analyzeContractRiskAndDecide(
  context: OrchestrationContext
): OrchestrateResponse['decision'] {
  const issues = context.artifacts.review_issues?.issues || [];
  const mappings = context.artifacts.policy_mappings?.mappings || [];
  
  // Derive counts from artifacts (contract-specific issue types)
  const unlimitedLiabilityCount = issues.filter((i) => 
    i.type === 'unlimited_liability'
  ).length;
  
  const missingSignatureCount = issues.filter((i) => 
    i.type === 'missing_signature'
  ).length;
  
  const highFinancialExposure = issues.filter((i) => 
    i.type === 'financial_exposure' && i.severity === 'high'
  ).length;
  
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const highCount = issues.filter((i) => i.severity === 'high').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const lowCount = issues.filter((i) => i.severity === 'low').length;
  
  const nonStandardTermsCount = mappings.filter((m) => 
    m.risk_level === 'non_standard'
  ).length;
  
  // Update signals
  context.signals.critical_count = criticalCount;
  context.signals.high_count = highCount;
  context.signals.medium_count = mediumCount;
  context.signals.low_count = lowCount;
  context.signals.flagged_policy_count = nonStandardTermsCount;
  
  // BRANCH 1: Escalate to legal (CRITICAL)
  if (unlimitedLiabilityCount > 0 || criticalCount > 0 || missingSignatureCount > 0) {
    context.signals.branch_triggers.push('critical_contract_risk_detected');
    
    return {
      next_action: 'escalate_legal',
      reason: `${criticalCount} critical risk(s) including ${unlimitedLiabilityCount} unlimited liability clause(s) and ${missingSignatureCount} missing signature(s) require legal counsel review`,
      confidence: 1.0,
      recommended_actions: [
        'Forward to legal department immediately',
        'Do NOT proceed without legal sign-off',
        'Request redlined version with proposed changes',
      ],
      blocking_issues: issues
        .filter((i) => 
          i.severity === 'critical' || 
          i.type === 'unlimited_liability' || 
          i.type === 'missing_signature'
        )
        .map((i) => i.description),
    };
  }
  
  // BRANCH 2: Negotiate terms (HIGH RISK)
  if (highCount > 0 || highFinancialExposure > 0 || nonStandardTermsCount > 2) {
    context.signals.branch_triggers.push('high_contract_risk_detected');
    
    return {
      next_action: 'negotiate_terms',
      reason: `${highCount} high-priority risk(s), ${highFinancialExposure} financial exposure(s), and ${nonStandardTermsCount} non-standard term(s) should be negotiated`,
      confidence: 0.75,
      recommended_actions: [
        'Request amendments to high-risk clauses',
        'Propose liability cap or indemnification limits',
        'Seek business justification for non-standard terms',
      ],
      blocking_issues: issues
        .filter((i) => i.severity === 'high' || i.type === 'financial_exposure')
        .map((i) => i.description),
    };
  }
  
  // BRANCH 3: Acceptable risk (MEDIUM/LOW)
  if (mediumCount > 0 || lowCount > 0) {
    context.signals.branch_triggers.push('acceptable_contract_risk');
    
    return {
      next_action: 'acceptable_risk',
      reason: `${mediumCount + lowCount} minor risk(s) identified, but within acceptable tolerance`,
      confidence: 0.85,
      recommended_actions: [
        'Document identified risks in contract file',
        'Monitor performance during contract execution',
        'Review at renewal',
      ],
      blocking_issues: [],
    };
  }
  
  // BRANCH 4: Ready to sign (NO ISSUES)
  context.signals.branch_triggers.push('contract_approved');
  
  return {
    next_action: 'ready_to_sign',
    reason: 'Contract terms are standard and risk exposure is acceptable',
    confidence: 0.95,
    recommended_actions: [
      'Proceed with signature',
      'Archive audit log',
      'Schedule post-signature compliance check',
    ],
    blocking_issues: [],
  };
}


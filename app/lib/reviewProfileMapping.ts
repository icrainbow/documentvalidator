/**
 * Review Profile Mapping (Context-Driven Agent Selection)
 * Maps client context to recommended agent bundles with policy-based locking
 */

import type { ClientContext } from './reviewProfiles';

export interface AgentBundleRecommendation {
  profileId: string;
  selectedAgents: {
    compliance: string;
    evaluation: string;
    rewrite: string;
  };
  reasons: string[];
  locked: {
    compliance: boolean;  // always true - locked by policy
    evaluation: boolean;  // false - user can change
    rewrite: boolean;     // false - user can change
  };
}

/**
 * Recommend agent bundle based on client context
 * Implements EXACT demo mapping rules per Revision 2
 * 
 * @param context - Client context with segment, jurisdiction, risk, products
 * @returns Recommended agent bundle with locking policy
 */
export function recommendAgentBundle(context: ClientContext & { contractNumber?: string }): AgentBundleRecommendation {
  const reasons: string[] = [];
  let profileId: string;
  let compliance: string;
  let evaluation: string;
  let rewrite: string;

  // Rule 1: CH jurisdiction OR CIC segment
  if (context.jurisdiction === 'CH' || context.clientSegment === 'CIC') {
    profileId = 'compliance-ch-cic-v1';
    compliance = 'compliance_enhanced_ch_cic_v1';
    evaluation = 'evaluation_strict_v1';
    rewrite = 'rewrite_policy_safe_v1';
    
    if (context.jurisdiction === 'CH') {
      reasons.push('CH jurisdiction requires enhanced compliance pack');
    }
    if (context.clientSegment === 'CIC') {
      reasons.push('CIC segment requires enhanced compliance pack');
    }
    reasons.push('Strict evaluation recommended for complex structures');
    reasons.push('Policy-safe rewrite for regulatory compliance');
  }
  // Rule 2: UHNW segment
  else if (context.clientSegment === 'UHNW') {
    profileId = 'compliance-uhnw-v1';
    compliance = 'compliance_enhanced_uhnw_v1';
    evaluation = 'evaluation_standard_v1';
    rewrite = 'rewrite_policy_safe_v1';
    
    reasons.push('UHNW requires enhanced compliance oversight');
    reasons.push('Standard evaluation for UHNW segment');
    reasons.push('Policy-safe rewrite for high-value clients');
  }
  // Rule 3: Default (Retail/HNW)
  else {
    profileId = 'compliance-standard-v1';
    compliance = 'compliance_standard_v1';
    evaluation = 'evaluation_standard_v1';
    rewrite = 'rewrite_standard_v1';
    
    reasons.push('Standard compliance pack for retail/HNW');
    reasons.push('Standard evaluation for simple products');
  }

  return {
    profileId,
    selectedAgents: { compliance, evaluation, rewrite },
    reasons,
    locked: {
      compliance: true,   // ALWAYS locked by policy
      evaluation: false,  // User can change
      rewrite: false      // User can change
    }
  };
}


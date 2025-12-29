/**
 * Agent Feasibility Validator
 * Validates agent selections against client context and policy rules
 * Implements STRICT blocking for CH/CIC optional mismatches (Revision 2)
 */

import type { ClientContext } from './reviewProfiles';

export interface ValidationResult {
  valid: boolean;
  errors: string[];     // BLOCKING issues - prevent rerun/update
  warnings: string[];   // Non-blocking issues (unused in demo)
}

/**
 * Validate agent feasibility against client context
 * 
 * Rules (Revision 2):
 * - CH or CIC: compliance must be compliance_enhanced_ch_cic_v1 (always)
 * - CH or CIC: if evaluation !== undefined, must be evaluation_strict_v1
 * - CH or CIC: if rewrite !== undefined, must be rewrite_policy_safe_v1
 * - UHNW: compliance must be compliance_enhanced_uhnw_v1 OR compliance_enhanced_ch_cic_v1
 * - UHNW: if rewrite !== undefined, must be rewrite_policy_safe_v1
 * - Optional agents can be undefined (disabled) - this is VALID
 * 
 * @param context - Client context
 * @param selectedAgents - Selected agent IDs
 * @returns Validation result with errors/warnings
 */
export function validateAgentFeasibility(
  context: ClientContext & { contractNumber?: string },
  selectedAgents: {
    compliance: string;
    evaluation?: string;
    rewrite?: string;
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule: CH or CIC contexts (STRICT)
  if (context.jurisdiction === 'CH' || context.clientSegment === 'CIC') {
    // Compliance MUST be compliance_enhanced_ch_cic_v1
    if (selectedAgents.compliance !== 'compliance_enhanced_ch_cic_v1') {
      errors.push(
        `CH/CIC context requires compliance_enhanced_ch_cic_v1 (current: ${selectedAgents.compliance})`
      );
    }

    // Evaluation: if enabled, MUST be evaluation_strict_v1
    if (selectedAgents.evaluation !== undefined) {
      if (selectedAgents.evaluation !== 'evaluation_strict_v1') {
        errors.push(
          `CH/CIC context requires evaluation_strict_v1 if evaluation is enabled (current: ${selectedAgents.evaluation})`
        );
      }
    }

    // Rewrite: if enabled, MUST be rewrite_policy_safe_v1
    if (selectedAgents.rewrite !== undefined) {
      if (selectedAgents.rewrite !== 'rewrite_policy_safe_v1') {
        errors.push(
          `CH/CIC context requires rewrite_policy_safe_v1 if rewrite is enabled (current: ${selectedAgents.rewrite})`
        );
      }
    }
  }
  // Rule: UHNW contexts (STRICT)
  else if (context.clientSegment === 'UHNW') {
    // Compliance MUST be compliance_enhanced_uhnw_v1 OR compliance_enhanced_ch_cic_v1
    if (
      selectedAgents.compliance !== 'compliance_enhanced_uhnw_v1' &&
      selectedAgents.compliance !== 'compliance_enhanced_ch_cic_v1'
    ) {
      errors.push(
        `UHNW requires compliance_enhanced_uhnw_v1 or compliance_enhanced_ch_cic_v1 (current: ${selectedAgents.compliance})`
      );
    }

    // Rewrite: if enabled, MUST be rewrite_policy_safe_v1
    if (selectedAgents.rewrite !== undefined) {
      if (selectedAgents.rewrite !== 'rewrite_policy_safe_v1') {
        errors.push(
          `UHNW requires rewrite_policy_safe_v1 if rewrite is enabled (current: ${selectedAgents.rewrite})`
        );
      }
    }
  }
  // Default: no strict requirements for optional agents
  else {
    // No errors for Retail/HNW/Institutional contexts
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}


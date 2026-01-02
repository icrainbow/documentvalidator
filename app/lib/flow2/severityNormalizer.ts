/**
 * Flow2: Severity Normalization (PATCH 3)
 * 
 * Converts repo Issue severities and Risk signal severities to canonical UI values.
 * 
 * INPUT SOURCES:
 * - Base Issue: 'FAIL' | 'WARNING' | 'INFO' (from app/lib/types/review.ts)
 * - Risk Signal: 'HIGH' | 'MEDIUM' | 'LOW' (from app/lib/graphKyc/riskAssessment.ts)
 * - Potential external: 'critical', 'high', 'medium', 'low' (various cases)
 * 
 * OUTPUT:
 * - Canonical: 'high' | 'medium' | 'low' (lowercase, for UI highlight logic)
 * 
 * DETERMINISTIC: No LLM, no randomness.
 */

export type CanonicalRiskSeverity = 'high' | 'medium' | 'low';

/**
 * Normalize any severity input to canonical Flow2 UI values
 * 
 * Mappings:
 * - FAIL, HIGH, CRITICAL, critical -> 'high'
 * - WARNING, MEDIUM, medium -> 'medium'
 * - INFO, LOW, low, undefined -> 'low'
 * 
 * @param input - Severity string from Issue or RiskSignal (may be undefined)
 * @returns Canonical severity ('high' | 'medium' | 'low')
 */
export function normalizeSeverity(input: string | undefined): CanonicalRiskSeverity {
  if (!input) return 'low';
  
  const normalized = input.toUpperCase().trim();
  
  // Map all variants to canonical lowercase values
  switch (normalized) {
    // High-risk mappings
    case 'FAIL':       // Base Issue severity
    case 'HIGH':       // Risk signal severity
    case 'CRITICAL':   // Potential external variant
    case 'SEVERE':     // Potential external variant
      return 'high';
    
    // Medium-risk mappings
    case 'WARNING':    // Base Issue severity
    case 'MEDIUM':     // Risk signal severity
    case 'MODERATE':   // Potential external variant
      return 'medium';
    
    // Low-risk mappings (including defaults)
    case 'INFO':       // Base Issue severity
    case 'LOW':        // Risk signal severity
    case 'MINOR':      // Potential external variant
    default:
      return 'low';
  }
}

/**
 * Check if a severity represents a high-risk condition
 * (Used for UI highlighting and gating logic)
 */
export function isHighRisk(severity: string | undefined): boolean {
  return normalizeSeverity(severity) === 'high';
}

/**
 * Check if a severity represents at least medium risk
 * (Used for warning thresholds)
 */
export function isMediumOrHighRisk(severity: string | undefined): boolean {
  const normalized = normalizeSeverity(severity);
  return normalized === 'high' || normalized === 'medium';
}


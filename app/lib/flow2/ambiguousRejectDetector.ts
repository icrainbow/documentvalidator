/**
 * Flow2 Demo: Ambiguous Reject Comment Detector
 * 
 * Detects when an approver's reject comment matches the "ambiguous reject" pattern
 * that triggers Enhanced Due Diligence (EDD) injection in demo mode.
 * 
 * DEMO ONLY - No production impact.
 */

/**
 * SAMPLE REJECT TEXT for quick copy in demos:
 * Use this exact text to trigger the full Phase 8 EDD demo experience.
 */
export const SAMPLE_EDD_REJECT_TEXT = `Reject. The identity details don't reconcile, and the stated source of funds appears inconsistent with prior disclosures in other channels. Please cross-check last year's Wealth documentation, perform UBO look-through on the offshore holding chain, and validate against the latest policy change. Route: EDD. [DEMO_EDD]`;

/**
 * Enhanced EDD trigger detection with natural language support
 * 
 * Detects EDD intent from:
 * 1. Legacy explicit triggers: "Route: EDD" or "[DEMO_EDD]" (backward compatible)
 * 2. Natural language patterns: rejection + high-weight ownership/offshore signals
 * 
 * Scoring categories (with max caps to prevent synonym stacking):
 * - OWNERSHIP (UBO, beneficial ownership, look-through): max 3 points
 * - OFFSHORE_STRUCTURE (offshore holding/ownership chain): max 3 points
 * - IDENTITY_INCONSISTENCY: max 1 point
 * - SOF_SOW_INCONSISTENCY: max 1 point
 * - POLICY_CHANGE: max 1 point
 * 
 * Trigger threshold: 4 points + rejection indicator present
 */
export function isRouteEddTrigger(comment: string | undefined): boolean {
  if (!comment || typeof comment !== 'string') {
    return false;
  }
  
  const normalized = comment.toLowerCase().trim();
  
  // BACKWARD COMPATIBLE: Check legacy triggers first (highest priority)
  if (normalized.includes('route: edd') || normalized.includes('[demo_edd]')) {
    return true;
  }
  
  // NEW: Natural language EDD intent detection
  return detectNaturalLanguageEddIntent(normalized);
}

/**
 * Detect EDD intent from natural language reject comments
 * 
 * Hard requirements:
 * 1. MUST contain rejection indicator (reject/decline/cannot proceed/etc.)
 * 2. MUST score >= 4 points from category signals
 */
function detectNaturalLanguageEddIntent(text: string): boolean {
  // GATE CONDITION: Must be a rejection
  if (!hasRejectionIndicator(text)) {
    return false;
  }
  
  // Calculate score with category caps
  const scoreBreakdown = calculateEddScore(text);
  const totalScore = scoreBreakdown.total;
  
  // Debug logging (dev-only, gated by environment or flag)
  const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_EDD === 'true';
  if (isDev && totalScore > 0) {
    console.log('[EDD Natural Language Detection]', {
      total: totalScore,
      threshold: 4,
      triggered: totalScore >= 4,
      breakdown: scoreBreakdown.categories
    });
  }
  
  return totalScore >= 4;
}

/**
 * Check if text contains rejection decision indicators
 */
function hasRejectionIndicator(text: string): boolean {
  const indicators = [
    'reject',
    'rejected',
    'decline',
    'declined',
    'unable to approve',
    'cannot approve',
    'cannot proceed',
    'do not approve',
    'not approved'
  ];
  
  return indicators.some(indicator => text.includes(indicator));
}

/**
 * Calculate EDD score with category-based caps (prevents synonym stacking)
 */
function calculateEddScore(text: string): { total: number; categories: Record<string, number> } {
  const categories: Record<string, number> = {
    OWNERSHIP: 0,
    OFFSHORE_STRUCTURE: 0,
    IDENTITY_INCONSISTENCY: 0,
    SOF_SOW_INCONSISTENCY: 0,
    POLICY_CHANGE: 0
  };
  
  // Category 1: OWNERSHIP (UBO, beneficial ownership, look-through) - MAX 3
  if (hasOwnershipSignals(text)) {
    categories.OWNERSHIP = 3;
  }
  
  // Category 2: OFFSHORE_STRUCTURE - MAX 3
  if (hasOffshoreStructureSignals(text)) {
    categories.OFFSHORE_STRUCTURE = 3;
  }
  
  // Category 3: IDENTITY_INCONSISTENCY - MAX 1
  if (hasIdentityInconsistency(text)) {
    categories.IDENTITY_INCONSISTENCY = 1;
  }
  
  // Category 4: SOF/SOW INCONSISTENCY - MAX 1
  if (hasSofSowInconsistency(text)) {
    categories.SOF_SOW_INCONSISTENCY = 1;
  }
  
  // Category 5: POLICY_CHANGE - MAX 1
  if (hasPolicyChangeSignal(text)) {
    categories.POLICY_CHANGE = 1;
  }
  
  const total = Object.values(categories).reduce((sum, val) => sum + val, 0);
  
  return { total, categories };
}

/**
 * HIGH-WEIGHT: Ownership signals (UBO, beneficial ownership, look-through)
 */
function hasOwnershipSignals(text: string): boolean {
  const patterns = [
    'ubo',
    'ultimate beneficial owner',
    'beneficial ownership',
    'beneficial owner',
    'look-through',
    'look through'
  ];
  
  return patterns.some(pattern => text.includes(pattern));
}

/**
 * HIGH-WEIGHT: Offshore structure signals
 */
function hasOffshoreStructureSignals(text: string): boolean {
  // Must have "offshore" + structure-related term
  if (!text.includes('offshore')) {
    return false;
  }
  
  const structureTerms = [
    'holding chain',
    'holding structure',
    'ownership chain',
    'ownership structure',
    'entity chain',
    'structure'
  ];
  
  return structureTerms.some(term => text.includes(term));
}

/**
 * MEDIUM-WEIGHT: Identity inconsistency signals
 */
function hasIdentityInconsistency(text: string): boolean {
  const hasIdentity = text.includes('identity') || text.includes('identification');
  
  const inconsistencyTerms = [
    'don\'t reconcile',
    'do not reconcile',
    'doesn\'t match',
    'does not match',
    'not match',
    'mismatch',
    'inconsistent',
    'discrepancy',
    'discrepancies'
  ];
  
  return hasIdentity && inconsistencyTerms.some(term => text.includes(term));
}

/**
 * MEDIUM-WEIGHT: Source of funds/wealth inconsistency
 */
function hasSofSowInconsistency(text: string): boolean {
  const hasSofSow = 
    text.includes('source of funds') || 
    text.includes('source of wealth') ||
    text.includes('sof') ||
    text.includes('sow');
  
  const inconsistencyTerms = [
    'inconsistent',
    'inconsistency',
    'appears inconsistent',
    'different from',
    'does not match',
    'doesn\'t match',
    'mismatch'
  ];
  
  return hasSofSow && inconsistencyTerms.some(term => text.includes(term));
}

/**
 * MEDIUM-WEIGHT: Policy change signals
 */
function hasPolicyChangeSignal(text: string): boolean {
  const hasPolicy = text.includes('policy') || text.includes('policies') || text.includes('regulation');
  
  const changeTerms = [
    'change',
    'changed',
    'update',
    'updated',
    'latest',
    'new',
    'recent',
    'revised'
  ];
  
  return hasPolicy && changeTerms.some(term => text.includes(term));
}

/**
 * Normalize text for robust pattern matching:
 * - Lowercase
 * - Trim
 * - Collapse whitespace
 * - Remove punctuation (except apostrophes for contractions)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if text contains ALL keywords in a group (OR logic within group, AND across groups)
 */
function containsAllKeywords(text: string, keywordGroups: string[][]): boolean {
  for (const group of keywordGroups) {
    // At least one keyword from this group must match
    const groupMatch = group.some(keyword => text.includes(keyword));
    if (!groupMatch) {
      return false;
    }
  }
  return true;
}

/**
 * Detect if a reject comment matches the "ambiguous reject" pattern
 * 
 * Canonical English example:
 * "Reject. The identity information doesn't match, and the client's declared source of funds
 * elsewhere is completely different from this bank statement. Check the Wealth division's
 * annual report from last year and see how many shell entities or aliases they actually have.
 * Also, I recall the policy was updated last month — this type of offshore holding structure
 * now requires an extra layer of review. Do not miss it."
 * 
 * Matching logic (ALL groups must match):
 * 
 * Group 1: Identity mismatch
 *   - "identity" AND ("doesn't match" OR "not match" OR "mismatch")
 * 
 * Group 2: Wealth annual report
 *   - "wealth" AND ("annual report" OR "year-end report" OR "year end report")
 *     AND ("last year" OR "2024")
 * 
 * Group 3: Shell / aliases
 *   - ("shell" OR "aliases" OR "front companies" OR "nominee")
 * 
 * Group 4: Policy + offshore
 *   - "policy" AND ("last month" OR "recently updated")
 *     AND ("offshore" OR "offshore holding" OR "offshore structure")
 */
export function isAmbiguousReject(comment: string | undefined): boolean {
  if (!comment || typeof comment !== 'string') {
    return false;
  }
  
  const normalized = normalizeText(comment);
  
  // Group 1: Identity mismatch
  const group1 = [
    ['identity'],
    ['doesn\'t match', 'doesnt match', 'not match', 'mismatch', 'do not match', 'does not match']
  ];
  
  // Group 2: Wealth annual report + last year/2024
  const group2 = [
    ['wealth'],
    ['annual report', 'year end report', 'yearly report'],
    ['last year', '2024', 'previous year']
  ];
  
  // Group 3: Shell / aliases
  const group3 = [
    ['shell', 'aliases', 'front companies', 'front company', 'nominee', 'shell entities', 'shell entity']
  ];
  
  // Group 4: Policy updated + offshore
  const group4 = [
    ['policy', 'policies', 'regulation'],
    ['last month', 'recently updated', 'recent update', 'recently changed'],
    ['offshore', 'offshore holding', 'offshore structure', 'offshore trust']
  ];
  
  // Check all groups (AND logic)
  const allGroups = [group1, group2, group3, group4];
  
  for (const groups of allGroups) {
    if (!containsAllKeywords(normalized, groups)) {
      return false;
    }
  }
  
  console.log('[AmbiguousRejectDetector] ✅ MATCHED ambiguous reject pattern');
  return true;
}

/**
 * Get a human-readable summary of why a comment matched (for debugging/logs)
 */
export function getMatchSummary(comment: string): string {
  const normalized = normalizeText(comment);
  const matches: string[] = [];
  
  if (normalized.includes('identity') && (
    normalized.includes('doesn t match') || 
    normalized.includes('not match') || 
    normalized.includes('mismatch')
  )) {
    matches.push('Identity mismatch');
  }
  
  if (normalized.includes('wealth') && (
    normalized.includes('annual report') || 
    normalized.includes('year end report') ||
    normalized.includes('year-end report')
  )) {
    matches.push('Wealth annual report');
  }
  
  if (
    normalized.includes('shell') || 
    normalized.includes('aliases') || 
    normalized.includes('front compan')
  ) {
    matches.push('Shell/aliases');
  }
  
  if (normalized.includes('policy') && (
    normalized.includes('last month') || 
    normalized.includes('recently updated')
  ) && normalized.includes('offshore')) {
    matches.push('Policy + offshore');
  }
  
  return matches.join(', ');
}


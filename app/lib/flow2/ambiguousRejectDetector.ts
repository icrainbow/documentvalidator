/**
 * Flow2 Demo: Ambiguous Reject Comment Detector
 * 
 * Detects when an approver's reject comment matches the "ambiguous reject" pattern
 * that triggers Enhanced Due Diligence (EDD) injection in demo mode.
 * 
 * DEMO ONLY - No production impact.
 */

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


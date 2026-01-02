/**
 * Flow2: Issue Adapter (PATCH 4)
 * 
 * Maps repo-verified Issue structure to RiskInput for topic-risk linking.
 * Uses actual types from app/lib/types/review.ts (verified in STEP 0).
 * 
 * REPO STRUCTURE (verified):
 * - Issue.id: string (stable)
 * - Issue.severity: 'FAIL' | 'WARNING' | 'INFO'
 * - Issue.title: string
 * - Issue.message: string
 * - Issue.category: string | undefined (only on Flow2 risk-sourced issues)
 * 
 * EXTENSIONS (Flow2 only):
 * - Risk signals may have category: 'kyc_risk' | 'sanctions' | 'pep' | etc.
 * - Risk signals may use severity: 'HIGH' | 'MEDIUM' | 'LOW'
 */

import type { Issue } from '@/app/lib/types/review';
import type { RiskInput } from './kycTopicsSchema';
import { normalizeSeverity } from './severityNormalizer';

/**
 * Flow2 Issue extensions (category field may exist on risk-sourced issues)
 * Type guard approach to handle optional Flow2-specific fields
 */
type Flow2Issue = Issue & {
  category?: string; // May exist on risk assessment issues
};

/**
 * Map a repo Issue to RiskInput for topic-risk linking
 * 
 * Field mappings (verified in STEP 0):
 * - id -> risk_id (stable ID already present)
 * - severity -> severity (normalized via severityNormalizer)
 * - category -> category (optional, only on risk issues)
 * - title -> title
 * - message -> description
 * 
 * @param issue - Repo Issue (may have Flow2 extensions)
 * @returns RiskInput for risk-topic mapping
 */
export function mapIssueToRiskInput(issue: Flow2Issue): RiskInput {
  return {
    risk_id: issue.id, // ✅ Stable ID already present in repo
    severity: issue.severity, // Will be normalized by severityNormalizer
    category: issue.category, // May be undefined (only on risk-sourced issues)
    title: issue.title,
    description: issue.message,
  };
}

/**
 * Batch convert issues to risk inputs
 * Filters out issues that don't have sufficient data for risk linking
 * 
 * @param issues - Array of repo Issues
 * @returns Array of RiskInput objects for risk mapping
 */
export function mapIssuesToRiskInputs(issues: Flow2Issue[]): RiskInput[] {
  return issues
    .filter(issue => {
      // Basic validation: must have id and title/message
      if (!issue.id) {
        console.warn('[IssueAdapter] Skipping issue without id:', issue);
        return false;
      }
      if (!issue.title && !issue.message) {
        console.warn('[IssueAdapter] Skipping issue without title/message:', issue.id);
        return false;
      }
      return true;
    })
    .map(mapIssueToRiskInput);
}

/**
 * Check if an issue is likely a risk-related issue (for filtering)
 * 
 * Heuristics:
 * - Has category field (Flow2 risk issues)
 * - Severity is FAIL or HIGH
 * - Title/message contains risk keywords
 */
export function isRiskIssue(issue: Flow2Issue): boolean {
  // Has explicit category (risk assessment issues)
  if (issue.category) {
    return true;
  }
  
  // High severity (FAIL or HIGH normalized to 'high')
  const normalized = normalizeSeverity(issue.severity);
  if (normalized === 'high') {
    return true;
  }
  
  // Keyword detection in title/message
  const text = `${issue.title} ${issue.message}`.toLowerCase();
  const riskKeywords = [
    'risk', 'sanction', 'pep', 'aml', 'ubo', 'tax evasion',
    'missing', 'incomplete', 'conflict', 'contradiction',
    'gap', 'coverage', 'flag'
  ];
  
  return riskKeywords.some(keyword => text.includes(keyword));
}


/**
 * Bridge between UI types and Review API types
 * Allows gradual migration without breaking existing UI
 */

import type { Section as APISection, Issue as APIIssue, ReviewResult } from './types/review';

// UI Section type (existing)
export interface UISection {
  id: number;
  title: string;
  content: string;
  status: 'unreviewed' | 'pass' | 'fail' | 'warning';
  log: Array<{
    agent: string;
    action: string;
    timestamp: Date;
  }>;
}

// Convert UI Section to API Section
export function toAPISection(uiSection: UISection, order: number): APISection {
  return {
    id: `section-${uiSection.id}`,
    title: uiSection.title,
    content: uiSection.content,
    order
  };
}

// Convert API Issue severity to UI status
export function apiSeverityToUIStatus(severity: 'FAIL' | 'WARNING' | 'INFO'): 'fail' | 'warning' | 'pass' {
  if (severity === 'FAIL') return 'fail';
  if (severity === 'WARNING') return 'warning';
  return 'pass'; // INFO doesn't block
}

// Compute section status from API issues
export function computeSectionStatus(sectionId: number, apiIssues: APIIssue[]): 'pass' | 'fail' | 'warning' {
  const sectionKey = `section-${sectionId}`;
  const sectionIssues = apiIssues.filter(issue => issue.sectionId === sectionKey);
  
  if (sectionIssues.length === 0) {
    return 'pass';
  }
  
  const hasFail = sectionIssues.some(issue => issue.severity === 'FAIL');
  if (hasFail) return 'fail';
  
  const hasWarning = sectionIssues.some(issue => issue.severity === 'WARNING');
  if (hasWarning) return 'warning';
  
  return 'pass'; // Only INFO issues
}

// Compute warnings fingerprint for sign-off validation
export function computeWarningsFingerprint(apiIssues: APIIssue[]): string {
  const warnings = apiIssues
    .filter(issue => issue.severity === 'WARNING')
    .map(issue => `${issue.sectionId}:${issue.title}:${issue.evidence || issue.message}`)
    .sort();
  
  return warnings.join('|');
}

// Create sign-off record
export function createSignOff(apiIssues: APIIssue[], runId: string): {
  signerName: string;
  signedAt: string;
  warningsFingerprint: string;
  runId: string;
} {
  return {
    signerName: 'Victoria',
    signedAt: new Date().toISOString(),
    warningsFingerprint: computeWarningsFingerprint(apiIssues),
    runId
  };
}

// Save sign-off to localStorage
export function saveSignOff(
  docId: string,
  signOff: { signerName: string; signedAt: string; warningsFingerprint: string; runId: string } | null
): void {
  if (typeof window === 'undefined') return;
  
  const key = `doc:${docId}:signoff`;
  if (signOff) {
    localStorage.setItem(key, JSON.stringify(signOff));
  } else {
    localStorage.removeItem(key);
  }
}

// Load sign-off from localStorage
export function loadSignOff(docId: string): {
  signerName: string;
  signedAt: string;
  warningsFingerprint: string;
  runId: string;
} | null {
  if (typeof window === 'undefined') return null;
  
  const key = `doc:${docId}:signoff`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Compute document status
export function computeDocumentStatus(
  apiIssues: APIIssue[],
  signOff: { warningsFingerprint: string; runId: string } | null
): {
  status: 'NOT_READY' | 'REQUIRES_SIGN_OFF' | 'READY_TO_SUBMIT';
  isSubmittable: boolean;
  counts: {
    totalFails: number;
    totalWarnings: number;
    failSections: number;
    warnSections: number;
  };
  explanation: string;
} {
  const failIssues = apiIssues.filter(i => i.severity === 'FAIL');
  const warningIssues = apiIssues.filter(i => i.severity === 'WARNING');
  
  const totalFails = failIssues.length;
  const totalWarnings = warningIssues.length;
  
  // Count unique sections
  const failSections = new Set(failIssues.map(i => i.sectionId)).size;
  const warnSections = new Set(warningIssues.map(i => i.sectionId)).size;
  
  // Has blocking issues
  if (totalFails > 0) {
    return {
      status: 'NOT_READY',
      isSubmittable: false,
      counts: { totalFails, totalWarnings, failSections, warnSections },
      explanation: `${totalFails} blocking issue(s) must be resolved before submission.`
    };
  }
  
  // Has warnings but no fails
  if (totalWarnings > 0) {
    const currentFingerprint = computeWarningsFingerprint(apiIssues);
    const isSignOffValid = signOff && signOff.warningsFingerprint === currentFingerprint;
    
    if (isSignOffValid) {
      return {
        status: 'READY_TO_SUBMIT',
        isSubmittable: true,
        counts: { totalFails, totalWarnings, failSections, warnSections },
        explanation: `Warnings signed off by authorized reviewer. Ready for submission.`
      };
    }
    
    return {
      status: 'REQUIRES_SIGN_OFF',
      isSubmittable: false,
      counts: { totalFails, totalWarnings, failSections, warnSections },
      explanation: `${totalWarnings} warning(s) require sign-off before submission.`
    };
  }
  
  // No issues
  return {
    status: 'READY_TO_SUBMIT',
    isSubmittable: true,
    counts: { totalFails: 0, totalWarnings: 0, failSections: 0, warnSections: 0 },
    explanation: 'All compliance checks passed. Document ready for submission.'
  };
}


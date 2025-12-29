/**
 * Document Status Computation and Sign-off Management
 */

export type DocumentStatus = 'NOT_READY' | 'REQUIRES_SIGN_OFF' | 'READY_TO_SUBMIT';

export interface DocumentStatusResult {
  status: DocumentStatus;
  isSubmittable: boolean;
  counts: {
    failSections: number;
    warnSections: number;
    totalFails: number;
    totalWarnings: number;
  };
  explanation: string;
}

export interface SignOff {
  signerName: string;
  signedAt: string; // ISO string
  warningsFingerprint: string;
}

/**
 * Compute a stable fingerprint for warning issues
 * Used to detect if warnings have changed since sign-off
 */
export function computeWarningsFingerprint(issues: any[]): string {
  const warningIssues = issues.filter(issue => {
    const severity = (issue.severity || '').toLowerCase();
    return severity === 'medium' || severity === 'low' || severity === 'warning';
  });
  
  if (warningIssues.length === 0) return '';
  
  // Create stable identifier for each warning
  const identifiers = warningIssues.map(issue => {
    const sectionIndex = issue.section_index ?? -1;
    const type = issue.type || 'unknown';
    const desc = (issue.description || '').substring(0, 50); // First 50 chars
    return `${sectionIndex}:${type}:${desc}`;
  }).sort();
  
  return identifiers.join('|');
}

/**
 * Compute document status based on issues and sign-off state
 */
export function computeDocumentStatus(
  issues: any[],
  signOff: SignOff | null
): DocumentStatusResult {
  
  // Count issues by severity
  const failIssues = issues.filter(issue => {
    const severity = (issue.severity || '').toLowerCase();
    return severity === 'critical' || severity === 'high';
  });
  
  const warningIssues = issues.filter(issue => {
    const severity = (issue.severity || '').toLowerCase();
    return severity === 'medium' || severity === 'low' || severity === 'warning';
  });
  
  // Count unique sections with each status
  const failSections = new Set(
    failIssues.map(i => i.section_index ?? -1).filter(idx => idx >= 0)
  ).size;
  
  const warnSections = new Set(
    warningIssues.map(i => i.section_index ?? -1).filter(idx => idx >= 0)
  ).size;
  
  const counts = {
    failSections,
    warnSections,
    totalFails: failIssues.length,
    totalWarnings: warningIssues.length
  };
  
  // Determine status
  if (failIssues.length > 0) {
    return {
      status: 'NOT_READY',
      isSubmittable: false,
      counts,
      explanation: 'Resolve blocking issues (FAIL/CRITICAL/HIGH) before submitting.'
    };
  }
  
  if (warningIssues.length > 0) {
    // Check if sign-off is valid
    const currentFingerprint = computeWarningsFingerprint(issues);
    const signOffValid = signOff && signOff.warningsFingerprint === currentFingerprint;
    
    if (signOffValid) {
      return {
        status: 'READY_TO_SUBMIT',
        isSubmittable: true,
        counts,
        explanation: 'Warnings have been signed off. Document ready for submission.'
      };
    }
    
    return {
      status: 'REQUIRES_SIGN_OFF',
      isSubmittable: false,
      counts,
      explanation: 'Warnings require sign-off before submitting.'
    };
  }
  
  // No fails, no warnings
  return {
    status: 'READY_TO_SUBMIT',
    isSubmittable: true,
    counts,
    explanation: 'All checks passed. Document ready for submission.'
  };
}

/**
 * Create a sign-off record
 */
export function createSignOff(issues: any[]): SignOff {
  return {
    signerName: 'Victoria',
    signedAt: new Date().toISOString(),
    warningsFingerprint: computeWarningsFingerprint(issues)
  };
}

/**
 * Persist sign-off to localStorage
 */
export function saveSignOff(docId: string, signOff: SignOff | null): void {
  if (typeof window === 'undefined') return;
  const key = `doc:${docId}:signoff`;
  if (signOff) {
    localStorage.setItem(key, JSON.stringify(signOff));
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Load sign-off from localStorage
 */
export function loadSignOff(docId: string): SignOff | null {
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



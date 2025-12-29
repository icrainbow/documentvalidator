/**
 * Review System Types - Shared between frontend and API
 * NO FAKE/DEMO LOGIC - All data from real LLM agents
 */

export interface Section {
  id: string;
  title: string;
  content: string;
  order: number;
}

export type IssueSeverity = 'FAIL' | 'WARNING' | 'INFO';
export type IssueStatus = 'open' | 'resolved' | 'accepted';

export interface Issue {
  id: string;
  sectionId: string;
  severity: IssueSeverity;
  title: string;
  message: string;
  evidence?: string;        // snippet quoted from section
  rationale?: string;       // agent explanation
  ruleRef?: string;         // optional policy reference
  agent: {
    id: string;
    name: string;
  };
  // AUDIT: Warning acceptance tracking
  status?: IssueStatus;     // default 'open' for backward compatibility
  acceptedBy?: string;      // who accepted the warning
  acceptedAt?: string;      // ISO timestamp when accepted
}

export interface Remediation {
  sectionId: string;
  proposedText?: string;    // compliant rewrite preserving similar length
  diff?: {
    before: string;
    after: string;
  };
  agent: {
    id: string;
    name: string;
  };
}

export interface ReviewResult {
  issues: Issue[];
  remediations?: Remediation[];
  reviewedAt: string;
  runId: string;
}

export interface ReviewRequest {
  documentId: string;
  mode: 'section' | 'document';
  sectionId?: string;       // required if mode=section
  sections: Section[];      // ALWAYS current content from client state
  config?: any;             // Optional review configuration for governed agent selection
}

export interface SignOff {
  signerName: string;
  signedAt: string;
  warningsFingerprint: string;
  runId: string;
}

export type DocumentStatus = 'NOT_READY' | 'REQUIRES_SIGN_OFF' | 'READY_TO_SUBMIT';


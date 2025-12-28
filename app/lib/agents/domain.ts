/**
 * Domain Models for Agent System
 * Enterprise-grade structured types for compliance, audit, and policy enforcement
 */

// ============================================================================
// Evidence and Facts
// ============================================================================

export interface EvidenceAnchor {
  doc_id?: string; // Optional document identifier
  section_id?: string; // Optional section identifier
  section_title?: string; // Human-readable section name
  snippet: string; // Text snippet providing evidence
  char_range?: { start: number; end: number }; // Character offsets
}

export interface Fact {
  category: 'entity' | 'amount' | 'date' | 'commitment' | 'risk' | 'instrument' | 'other';
  text: string; // The fact itself
  confidence: number; // 0.0 - 1.0
  source: EvidenceAnchor; // Where this fact came from
}

// ============================================================================
// Policy System
// ============================================================================

export interface PolicyRule {
  id: string; // e.g., "KYC-001", "AML-003"
  title: string; // Human-readable title
  category: 'kyc' | 'aml' | 'risk' | 'disclosure' | 'conduct' | 'documentation';
  requirement_text: string; // What the policy requires
  keywords: string[]; // Keywords for matching
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface PolicyMapping {
  fact: Fact; // The fact being mapped
  policy_rules: PolicyRule[]; // Matched policies
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  reason: string; // Why this mapping was made
}

// ============================================================================
// Compliance and Review
// ============================================================================

export interface RedTeamIssue {
  id: string; // Unique issue identifier
  type: 'policy_violation' | 'logical_error' | 'formatting' | 'tone' | 'missing_info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string; // What's wrong
  affected_text?: string; // The problematic text
  suggested_fix: string; // How to fix it
  policy_refs?: string[]; // Related policy IDs
  source?: EvidenceAnchor; // Where the issue was found
}

export interface EvidenceRequest {
  id: string; // Unique request identifier
  request_type: 'documentation' | 'clarification' | 'approval' | 'attestation' | 'supporting_data';
  request_text: string; // Human-readable request
  reason: string; // Why this evidence is needed
  priority: 'immediate' | 'high' | 'medium' | 'low';
  required_from: string; // Role, department, or person
  related_issue_ids: string[]; // Issues this request addresses
  deadline?: string; // ISO 8601 timestamp
}

// ============================================================================
// Audit and Compliance Trail
// ============================================================================

export interface AuditEvent {
  audit_id: string; // Unique audit identifier
  timestamp: string; // ISO 8601
  document_id: string;
  agent_activity: Array<{
    agent_id: string;
    trace_id: string;
    timestamp: string;
    status: 'success' | 'error' | 'blocked';
    summary: string;
  }>;
  final_decision: 'approved' | 'rejected' | 'needs_revision' | 'pending_evidence';
  compliance_status: 'compliant' | 'non_compliant' | 'conditional' | 'under_review';
  summary: string; // Executive summary
  details: string; // Full audit trail (markdown or structured text)
  flagged_issues: number;
  next_review_date?: string; // ISO 8601
  reviewer?: string; // Who reviewed
}

// ============================================================================
// Client Communication
// ============================================================================

export interface ClientCommunication {
  subject: string;
  body: string; // Full message body
  tone: 'formal' | 'friendly' | 'urgent';
  language: string;
  call_to_action: string;
  attachment_suggestions: string[];
  urgency_level: 'immediate' | 'high' | 'medium' | 'low';
}


/**
 * Case 3: Guardrail - Type Definitions
 * 
 * Deterministic demo-only types for wrong document / wrong BR detection.
 */

export type GuardrailReason = 'wrong_br' | 'wrong_document';
export type GuardrailSuggestedAction = 'fix_br' | 'replace_doc';
export type GuardrailConfidence = 'high' | 'medium' | 'low';

export interface GuardrailIssue {
  isBlocked: boolean;
  reason: GuardrailReason | null;
  details: string[];          // 2-4 bullet points explaining the mismatch
  confidence: GuardrailConfidence;
  suggestedAction: GuardrailSuggestedAction;
  detectedDocType?: string;   // e.g., "Bank Statement", "Utility Bill"
  expectedDocType?: string;   // e.g., "Passport or National ID"
}


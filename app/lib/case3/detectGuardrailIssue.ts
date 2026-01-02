/**
 * Case 3: Guardrail - Detection Logic
 * 
 * Deterministic detection of wrong document vs wrong BR mismatches.
 * PURE FUNCTION: No React, no DOM, no side effects.
 * 
 * Trigger Priority:
 * 1. Filename pattern matching (highest priority)
 * 2. Content marker detection
 * 3. Otherwise: not blocked
 */

import type { Flow2Document } from '../graphKyc/demoData';
import type { GuardrailIssue } from './types';

/**
 * Detect wrong BR scenario by filename
 */
function detectWrongBRByFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.includes('wrong_br') || 
         lower.includes('wrongbr') || 
         lower.includes('_br_mismatch_');
}

/**
 * Detect wrong document scenario by filename
 */
function detectWrongDocumentByFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.includes('wrong_document') || 
         lower.includes('wrongdocument') || 
         lower.includes('_doc_mismatch_') ||
         lower.endsWith('.wrong');
}

/**
 * Detect wrong BR scenario by content marker
 */
function detectWrongBRByContent(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('[guardrail_wrong_br]');
}

/**
 * Detect wrong document scenario by content marker
 */
function detectWrongDocumentByContent(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('[guardrail_wrong_document]');
}

/**
 * Main detection function
 * 
 * @param document - Flow2Document to validate
 * @returns GuardrailIssue with isBlocked=true if mismatch detected
 */
export function detectGuardrailIssue(document: Flow2Document): GuardrailIssue {
  // Priority 1: Filename matching
  if (detectWrongBRByFilename(document.filename)) {
    return {
      isBlocked: true,
      reason: 'wrong_br',
      details: [
        'Document type detected: Bank Statement (financial document)',
        'BR form expects: Passport or National ID (identity document)',
        'Confidence: High (filename pattern match)'
      ],
      confidence: 'high',
      suggestedAction: 'fix_br',
      detectedDocType: 'Bank Statement',
      expectedDocType: 'Passport or National ID'
    };
  }

  if (detectWrongDocumentByFilename(document.filename)) {
    return {
      isBlocked: true,
      reason: 'wrong_document',
      details: [
        'Document appears to be: Utility Bill (irrelevant for KYC)',
        'Expected: KYC-relevant identity or financial document',
        'Confidence: High (filename pattern match)'
      ],
      confidence: 'high',
      suggestedAction: 'replace_doc',
      detectedDocType: 'Utility Bill',
      expectedDocType: 'KYC-relevant document'
    };
  }

  // Priority 2: Content marker detection
  if (detectWrongBRByContent(document.text)) {
    return {
      isBlocked: true,
      reason: 'wrong_br',
      details: [
        'Document content indicates: Financial statement',
        'BR form expects: Identity verification document',
        'Confidence: High (content marker detected)'
      ],
      confidence: 'high',
      suggestedAction: 'fix_br',
      detectedDocType: 'Financial Statement',
      expectedDocType: 'Identity Document'
    };
  }

  if (detectWrongDocumentByContent(document.text)) {
    return {
      isBlocked: true,
      reason: 'wrong_document',
      details: [
        'Document content: Non-KYC document detected',
        'Expected: Identity or financial verification document',
        'Confidence: High (content marker detected)'
      ],
      confidence: 'high',
      suggestedAction: 'replace_doc',
      detectedDocType: 'Non-KYC Document',
      expectedDocType: 'KYC-relevant document'
    };
  }

  // No issue detected - document is valid
  return {
    isBlocked: false,
    reason: null,
    details: [],
    confidence: 'high',
    suggestedAction: 'fix_br' // default, unused when not blocked
  };
}


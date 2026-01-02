/**
 * Flow2 Demo: Evidence Dashboard Pseudo-Documents Builder
 * 
 * DEMO-ONLY: Extracts evidence dashboard artifacts and converts them into
 * pseudo-documents for injection into Topic Summary LLM input.
 * 
 * Scope: Flow2 demo mode only. No impact on Flow1 or production flows.
 */

import type { Flow2Document } from './types';

/**
 * Build pseudo-documents from post-reject analysis evidence payload.
 * 
 * Returns empty array if no evidence dashboard data is present.
 * 
 * Extracts 3 evidence cards:
 * 1. Approver Comment (reviewer rejection text)
 * 2. Wealth Report Extract (SOF mismatch: $5M vs $50M)
 * 3. Ownership Structure + Policy Update (offshore holdings EDD requirement)
 */
export function buildFlow2DemoEvidencePseudoDocs(postRejectData: any): Flow2Document[] {
  // Guard: Require evidence payload
  if (!postRejectData?.evidence) {
    console.log('[DemoEvidence] No evidence payload found, returning empty array');
    return [];
  }
  
  const evidence = postRejectData.evidence;
  const pseudoDocs: Flow2Document[] = [];
  
  // Card 1: Approver Comment (from reviewer text)
  const reviewerText = postRejectData.reviewer_text || evidence.reviewer_comment;
  if (reviewerText) {
    pseudoDocs.push({
      doc_id: 'demo-artifact:approver_comment',
      filename: 'Approver_Rejection_Comment.txt',
      doc_type_hint: 'General Document',
      text: `DOCUMENT: Approver Rejection Comment
SOURCE: Human Reviewer Decision
TIMESTAMP: ${new Date().toISOString()}

REJECTION REASON:
${reviewerText}

ANALYSIS NOTES:
This rejection triggered Enhanced Due Diligence (EDD) review due to identified risk factors and ambiguous disclosures requiring deeper investigation.`
    });
  }
  
  // Card 2: Wealth Report Extract (SOF mismatch)
  const disclosureCurrent = evidence.disclosures?.current || evidence.disclosure_current;
  const disclosureWealth = evidence.disclosures?.wealth || evidence.disclosure_wealth;
  
  if (disclosureCurrent && disclosureWealth) {
    pseudoDocs.push({
      doc_id: 'demo-artifact:wealth_report_extract',
      filename: 'Wealth_Division_Report_Extract_Q4_2024.txt',
      doc_type_hint: 'Source of Wealth',
      text: `DOCUMENT: Wealth Division Annual Report Extract
SOURCE: Internal Q4 2024 Report, Page 47
CLASSIFICATION: Internal Use Only

SOURCE OF FUNDS DISCREPANCY ANALYSIS:

CLIENT DISCLOSURE (Current):
${disclosureCurrent}

WEALTH DIVISION RECORD (Q4 2024):
${disclosureWealth}

DISCREPANCY MAGNITUDE:
The reported AUM is 10x higher than the client's stated source of funds. This significant mismatch requires explanation and verification of:
- Origin of the additional $45M
- Whether these are separate accounts or consolidated holdings
- Timing of wealth accumulation vs. disclosure date
- Potential undisclosed business interests or inheritance

RECOMMENDATION:
Request detailed breakdown of all funding sources and cross-reference with historical account statements and tax filings.`
    });
  }
  
  // Card 3: Ownership Structure + Policy Update
  const regulationTitle = evidence.regulation?.title || evidence.regulation_title;
  const regulationEffectiveDate = evidence.regulation?.effective_date || evidence.regulation_effective_date;
  const regulationSummary = evidence.regulation?.summary;
  
  if (regulationTitle && regulationEffectiveDate) {
    // Extract ownership structure from evidence (if available)
    const structureInfo = evidence.structure_tree 
      ? `CORPORATE STRUCTURE IDENTIFIED:
${JSON.stringify(evidence.structure_tree, null, 2)}

COMPLEXITY ASSESSMENT:
Multi-layer offshore structure (BVI → Cayman → Swiss trust) obscures ultimate beneficial ownership.
Requires enhanced due diligence per updated policy.`
      : `CORPORATE STRUCTURE:
Complex multi-layer offshore holding structure identified with jurisdictions including British Virgin Islands, Cayman Islands, and Switzerland. Ultimate beneficial owner (UBO) requires verification.`;

    pseudoDocs.push({
      doc_id: 'demo-artifact:ownership_structure_policy',
      filename: 'Ownership_Structure_And_Policy_Update_Dec_2025.txt',
      doc_type_hint: 'Beneficial Ownership',
      text: `DOCUMENT: Ownership Structure Analysis & Regulatory Policy Update
SOURCE: Corporate Structure Analyzer + Compliance Policy Database
DATE: ${new Date().toISOString()}

${structureInfo}

REGULATORY POLICY UPDATE:
Title: ${regulationTitle}
Effective Date: ${regulationEffectiveDate}
${regulationSummary ? `\nSummary: ${regulationSummary}` : ''}

COMPLIANCE IMPACT:
This policy change mandates Enhanced Due Diligence (EDD) for all offshore holding structures with more than 2 layers. 
The client's structure meets this threshold and must undergo additional review including:
- UBO verification through independent sources
- Source of funds for each layer of the structure
- Economic substance verification in each jurisdiction
- Tax compliance documentation from all relevant jurisdictions

ACTION REQUIRED:
Initiate EDD procedures immediately. Do not proceed with onboarding until EDD review is completed and approved.`
    });
  }
  
  console.log(`[DemoEvidence] Generated ${pseudoDocs.length} pseudo-document(s) from evidence payload`);
  
  return pseudoDocs;
}

/**
 * Check if orchestration data contains demo evidence that should trigger injection.
 * 
 * This is used to determine the isFlow2Demo gate.
 */
export function hasFlow2DemoEvidence(postRejectData: any): boolean {
  return !!(
    postRejectData?.evidence && 
    (postRejectData.triggered === true || postRejectData.demo_mode)
  );
}


/**
 * Generic Topic Summaries Engine - Configurations (SSOT)
 * 
 * Each review mode has a fixed configuration defining:
 * - Topic IDs and titles
 * - Prompt template
 * - UI labels
 * 
 * Adding a new mode requires only adding a new config here.
 */

import type { TopicSummaryConfig } from './types';

/**
 * KYC Flow2 Configuration (8 topics)
 * Existing KYC review workflow - unchanged behavior
 */
export const KYC_FLOW2_CONFIG: TopicSummaryConfig = {
  template_id: 'kyc_flow2',
  panel_title: 'Topic Summary',
  panel_subtitle: 'KYC: LLM-generated summary of customer information across all documents',
  topic_ids: [
    'customer_identity_profile',
    'relationship_purpose',
    'source_of_wealth',
    'source_of_funds',
    'ownership_ubo_control',
    'geography_jurisdiction_risk',
    'sanctions_pep_adverse_media',
    'transaction_patterns_expected_behavior',
  ] as const,
  topic_titles: {
    customer_identity_profile: 'Customer Identity & Profile',
    relationship_purpose: 'Relationship Purpose',
    source_of_wealth: 'Source of Wealth',
    source_of_funds: 'Source of Funds',
    ownership_ubo_control: 'Ownership, UBO & Control',
    geography_jurisdiction_risk: 'Geography & Jurisdiction Risk',
    sanctions_pep_adverse_media: 'Sanctions, PEP & Adverse Media',
    transaction_patterns_expected_behavior: 'Transaction Patterns & Expected Behavior',
  },
  prompt_role: 'KYC analyst',
  prompt_instructions: 'Analyze ALL documents below as a SET and produce a consolidated content summary for EACH of the 8 KYC topics.',
  max_bullets: 6,
  max_evidence: 2,
};

/**
 * IT Bulletin Impact Analysis Configuration (5 topics)
 * Cross-bulletin impact analysis for IT change management
 */
export const IT_BULLETIN_CONFIG: TopicSummaryConfig = {
  template_id: 'it_bulletin',
  panel_title: 'Topic Summary',
  panel_subtitle: 'IT Bulletin: LLM-generated impact analysis across all change bulletins',
  topic_ids: [
    'system_components_identifiers',
    'regions_environments_scope',
    'change_details_what_changed',
    'timeline_execution_windows',
    'actions_required_followups',
  ] as const,
  topic_titles: {
    system_components_identifiers: 'System / Component Information',
    regions_environments_scope: 'Region / Environment Scope',
    change_details_what_changed: 'Change Details (What Changed)',
    timeline_execution_windows: 'Timeline / Execution Window',
    actions_required_followups: 'Required Actions / Follow-ups',
  },
  prompt_role: 'IT change analyst',
  prompt_instructions: 'Analyze ALL IT bulletins/change documents below as a SET and produce a consolidated impact analysis for EACH of the 5 topics.',
  max_bullets: 4,
  max_evidence: 2,
};


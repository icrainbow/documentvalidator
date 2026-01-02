/**
 * Flow2: Risk-to-Topic Mapper (Deterministic Linking)
 * 
 * Maps risk issues to canonical KYC topic IDs for UI highlighting.
 * Uses keyword-based rules (no LLM, deterministic).
 * 
 * PURPOSE:
 * - Link risks to topics so topic cards can show "Related Risks (n)"
 * - Enable risk-aware topic highlighting (red for HIGH, yellow for MEDIUM)
 * 
 * APPROACH:
 * 1. Parse sectionId for explicit topic hints (e.g., "topic-source_of_funds")
 * 2. Map category field to topics (e.g., "sanctions" -> sanctions_pep_adverse_media)
 * 3. Keyword matching in title/description (fallback)
 */

import type { KYCTopicId, RiskInput } from './kycTopicsSchema';
import { normalizeSeverity, type CanonicalRiskSeverity } from './severityNormalizer';

/**
 * Linked risk metadata for UI display
 */
export interface LinkedRisk {
  risk_id: string;
  severity: CanonicalRiskSeverity; // Normalized canonical severity
  title: string;
}

/**
 * Deterministic risk-to-topic mapping rules
 * Priority: category > sectionId parsing > keyword matching
 */
const RISK_TO_TOPIC_RULES: Record<string, KYCTopicId | null> = {
  // Category-based mappings (from Flow2 risk assessment)
  'kyc_risk': null, // Generic - use keyword fallback
  'sanctions': 'sanctions_pep_adverse_media',
  'pep': 'sanctions_pep_adverse_media',
  'aml': 'transaction_patterns_expected_behavior',
  'ubo': 'ownership_ubo_control',
  'tax_evasion': 'geography_jurisdiction_risk',
  
  // Keyword-based mappings (lowercase for matching)
  'identity': 'customer_identity_profile',
  'customer': 'customer_identity_profile',
  'passport': 'customer_identity_profile',
  'profile': 'customer_identity_profile',
  
  'purpose': 'relationship_purpose',
  'relationship': 'relationship_purpose',
  'business purpose': 'relationship_purpose',
  
  'wealth': 'source_of_wealth',
  'source of wealth': 'source_of_wealth',
  
  'funds': 'source_of_funds',
  'source of funds': 'source_of_funds',
  'funding': 'source_of_funds',
  
  'ownership': 'ownership_ubo_control',
  'beneficial owner': 'ownership_ubo_control',
  'control': 'ownership_ubo_control',
  'structure': 'ownership_ubo_control',
  
  'geography': 'geography_jurisdiction_risk',
  'jurisdiction': 'geography_jurisdiction_risk',
  'country': 'geography_jurisdiction_risk',
  'region': 'geography_jurisdiction_risk',
  
  'transaction': 'transaction_patterns_expected_behavior',
  'pattern': 'transaction_patterns_expected_behavior',
  'behavior': 'transaction_patterns_expected_behavior',
  'activity': 'transaction_patterns_expected_behavior',
};

/**
 * Map a single risk to its most relevant KYC topic
 * 
 * Priority order:
 * 1. Explicit sectionId (e.g., "topic-source_of_funds")
 * 2. Category field (e.g., "sanctions" -> sanctions_pep_adverse_media)
 * 3. Keyword matching in title + description
 * 4. null (no clear mapping)
 * 
 * @param risk - Risk input from issue adapter
 * @returns KYC topic ID or null if no clear match
 */
export function mapRiskToTopic(risk: RiskInput): KYCTopicId | null {
  // Priority 1: Parse sectionId for explicit topic hints
  // (Repo issues may have sectionId like "topic-source_of_funds" or "gap-ownership_structure")
  const sectionIdMatch = extractTopicFromSectionId(risk.risk_id || '');
  if (sectionIdMatch) {
    return sectionIdMatch;
  }
  
  // Priority 2: Category-based mapping
  if (risk.category) {
    const categoryLower = risk.category.toLowerCase().trim();
    const topicFromCategory = RISK_TO_TOPIC_RULES[categoryLower];
    if (topicFromCategory) {
      return topicFromCategory;
    }
  }
  
  // Priority 3: Keyword matching in title + description
  const searchText = `${risk.title || ''} ${risk.description || ''}`.toLowerCase();
  
  for (const [keyword, topicId] of Object.entries(RISK_TO_TOPIC_RULES)) {
    if (topicId && searchText.includes(keyword)) {
      return topicId;
    }
  }
  
  // No clear mapping found
  return null;
}

/**
 * Extract topic ID from sectionId patterns
 * Examples:
 * - "topic-source_of_funds" -> "source_of_funds"
 * - "gap-ownership_ubo_control" -> "ownership_ubo_control"
 * 
 * @param sectionId - Issue sectionId or risk_id
 * @returns KYC topic ID or null
 */
function extractTopicFromSectionId(sectionId: string): KYCTopicId | null {
  if (!sectionId) return null;
  
  // Match patterns like "topic-TOPICID" or "gap-TOPICID"
  const match = sectionId.match(/^(topic|gap)-(.+)$/);
  if (!match) return null;
  
  const potentialTopicId = match[2];
  
  // Validate it's a known topic ID
  const validTopics = [
    'customer_identity_profile',
    'relationship_purpose',
    'source_of_wealth',
    'source_of_funds',
    'ownership_ubo_control',
    'geography_jurisdiction_risk',
    'sanctions_pep_adverse_media',
    'transaction_patterns_expected_behavior',
  ];
  
  if (validTopics.includes(potentialTopicId)) {
    return potentialTopicId as KYCTopicId;
  }
  
  return null;
}

/**
 * Build a map of topic_id -> linked risks for all topics
 * 
 * Used by API route to attach linked_risks to each TopicSummary.
 * Always returns a Map (empty if no risks link to any topics).
 * 
 * @param risks - Array of RiskInput objects (from issue adapter)
 * @returns Map of topic_id to array of LinkedRisk objects
 */
export function buildTopicRiskLinks(risks: RiskInput[]): Map<KYCTopicId, LinkedRisk[]> {
  const linkMap = new Map<KYCTopicId, LinkedRisk[]>();
  
  risks.forEach(risk => {
    const topicId = mapRiskToTopic(risk);
    
    // Skip risks that don't map to any topic
    if (!topicId) {
      console.log(`[RiskTopicMapper] No topic mapping for risk: ${risk.title || risk.risk_id}`);
      return;
    }
    
    // Initialize array for this topic if needed
    if (!linkMap.has(topicId)) {
      linkMap.set(topicId, []);
    }
    
    // Add normalized linked risk
    linkMap.get(topicId)!.push({
      risk_id: risk.risk_id || `risk-${Date.now()}-${Math.random()}`, // Fallback only if missing
      severity: normalizeSeverity(risk.severity), // ✅ PATCH 3: Normalized canonical severity
      title: risk.title || risk.description || 'Risk detected',
    });
  });
  
  console.log(`[RiskTopicMapper] Built links for ${linkMap.size} topic(s) from ${risks.length} risk(s)`);
  
  return linkMap;
}

/**
 * Get all risks linked to a specific topic
 * (Helper for UI components)
 * 
 * @param topicId - KYC topic ID
 * @param linkMap - Map from buildTopicRiskLinks()
 * @returns Array of linked risks (empty if none)
 */
export function getLinkedRisksForTopic(
  topicId: KYCTopicId,
  linkMap: Map<KYCTopicId, LinkedRisk[]>
): LinkedRisk[] {
  return linkMap.get(topicId) || [];
}

/**
 * Check if a topic has any high-severity linked risks
 * (Used for red highlighting)
 */
export function hasHighRiskForTopic(
  topicId: KYCTopicId,
  linkMap: Map<KYCTopicId, LinkedRisk[]>
): boolean {
  const risks = linkMap.get(topicId) || [];
  return risks.some(r => r.severity === 'high');
}

/**
 * Check if a topic has any medium-severity linked risks
 * (Used for yellow highlighting)
 */
export function hasMediumRiskForTopic(
  topicId: KYCTopicId,
  linkMap: Map<KYCTopicId, LinkedRisk[]>
): boolean {
  const risks = linkMap.get(topicId) || [];
  return risks.some(r => r.severity === 'medium') && !hasHighRiskForTopic(topicId, linkMap);
}


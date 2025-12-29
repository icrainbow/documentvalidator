/**
 * Review Profiles Registry
 * Defines review profiles with recommended agent configurations
 */

import type { AgentCategory } from './agentVariants';

export interface ReviewProfile {
  id: string;
  name: string;
  description: string;
  defaultAgents: Record<AgentCategory, string>;
  recommendedFor: {
    clientSegments: string[];
    jurisdictions: string[];
    riskAppetites: string[];
    productScopes: string[];
  };
  rules: {
    requiresEnhancedEvaluation?: boolean;
    minimumComplianceLevel?: string;
  };
}

export const REVIEW_PROFILES: Record<string, ReviewProfile> = {
  'retail-standard': {
    id: 'retail-standard',
    name: 'Retail Standard',
    description: 'Standard compliance for retail clients with simple products',
    defaultAgents: {
      compliance: 'compliance-standard',
      evaluation: 'evaluation-standard',
      rewrite: 'rewrite-standard'
    },
    recommendedFor: {
      clientSegments: ['Retail'],
      jurisdictions: ['SG', 'UK'],
      riskAppetites: ['Low', 'Medium'],
      productScopes: ['Equities']
    },
    rules: {}
  },
  
  'hnw-standard': {
    id: 'hnw-standard',
    name: 'HNW Standard',
    description: 'Standard compliance for high net worth clients',
    defaultAgents: {
      compliance: 'compliance-standard',
      evaluation: 'evaluation-enhanced',
      rewrite: 'rewrite-standard'
    },
    recommendedFor: {
      clientSegments: ['HNW'],
      jurisdictions: ['SG', 'UK', 'US'],
      riskAppetites: ['Medium', 'High'],
      productScopes: ['Equities', 'Derivatives']
    },
    rules: {}
  },
  
  'uhnw-enhanced': {
    id: 'uhnw-enhanced',
    name: 'UHNW Enhanced',
    description: 'Enhanced compliance for ultra high net worth and sophisticated clients',
    defaultAgents: {
      compliance: 'compliance-enhanced',
      evaluation: 'evaluation-enhanced',
      rewrite: 'rewrite-enhanced'
    },
    recommendedFor: {
      clientSegments: ['UHNW'],
      jurisdictions: ['SG', 'CH', 'EU', 'UK', 'US'],
      riskAppetites: ['Medium', 'High'],
      productScopes: ['Derivatives', 'Structured Products', 'Alternatives']
    },
    rules: {
      requiresEnhancedEvaluation: true,
      minimumComplianceLevel: 'enhanced'
    }
  },
  
  'institutional': {
    id: 'institutional',
    name: 'Institutional',
    description: 'Comprehensive compliance for institutional clients',
    defaultAgents: {
      compliance: 'compliance-enhanced',
      evaluation: 'evaluation-enhanced',
      rewrite: 'rewrite-enhanced'
    },
    recommendedFor: {
      clientSegments: ['Institutional'],
      jurisdictions: ['SG', 'CH', 'EU', 'UK', 'US'],
      riskAppetites: ['Low', 'Medium', 'High'],
      productScopes: ['Equities', 'Derivatives', 'Structured Products', 'Alternatives']
    },
    rules: {
      requiresEnhancedEvaluation: true,
      minimumComplianceLevel: 'enhanced'
    }
  }
};

export interface ClientContext {
  clientSegment: 'Retail' | 'HNW' | 'UHNW' | 'CIC' | 'Institutional';  // Added CIC
  jurisdiction: 'SG' | 'EU' | 'CH' | 'UK' | 'US';
  riskAppetite: 'Low' | 'Medium' | 'High';
  productScope: 'Equities' | 'Derivatives' | 'Structured Products' | 'Alternatives' | string[];  // Support both string and array
  notes?: string;
  contractNumber?: string;  // Optional contract identifier
}

/**
 * Get recommended profile based on client context
 */
export function getRecommendedProfile(context: ClientContext): ReviewProfile {
  // Priority matching logic
  if (context.clientSegment === 'Institutional') {
    return REVIEW_PROFILES['institutional'];
  }
  
  if (context.clientSegment === 'UHNW') {
    return REVIEW_PROFILES['uhnw-enhanced'];
  }
  
  if (context.clientSegment === 'HNW') {
    return REVIEW_PROFILES['hnw-standard'];
  }
  
  // Default to retail standard
  return REVIEW_PROFILES['retail-standard'];
}

/**
 * Get all available profiles
 */
export function getAllProfiles(): ReviewProfile[] {
  return Object.values(REVIEW_PROFILES);
}

/**
 * Get profile by ID
 */
export function getProfile(profileId: string): ReviewProfile | null {
  return REVIEW_PROFILES[profileId] || null;
}


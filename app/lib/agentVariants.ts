/**
 * Agent Variants Registry
 * Defines available agent variants for governed selection
 */

export type AgentCategory = 'compliance' | 'evaluation' | 'rewrite';

export interface AgentVariant {
  id: string;
  category: AgentCategory;
  name: string;
  version: string;
  description: string;
  bestFor: string[];
  skills: string[];
  constraints: string[];
  compatibleWith: string[]; // IDs of compatible agents in other categories
  requires?: string[]; // Required agents in other categories
  prohibitedTerms?: string[]; // For compliance agents
  applicableTo?: {  // NEW - optional metadata for UI display
    segments: string[];
    jurisdictions: string[];
    note: string;
  };
}

export const AGENT_VARIANTS: Record<string, AgentVariant> = {
  // ===== COMPLIANCE AGENTS (REQUIRED CATEGORY) =====
  'compliance-standard': {
    id: 'compliance-standard',
    category: 'compliance',
    name: 'Standard Compliance',
    version: 'v1.0',
    description: 'Core regulatory compliance checks for retail and HNW clients',
    bestFor: ['Retail', 'HNW', 'Standard risk products'],
    skills: [
      'Prohibited term detection',
      'Policy violation identification',
      'Regulatory cross-referencing',
      'Basic risk disclosures'
    ],
    constraints: [
      'Zero tolerance for restricted content',
      'Must reference specific policy rules'
    ],
    compatibleWith: ['evaluation-standard', 'evaluation-enhanced', 'rewrite-standard'],
    prohibitedTerms: ['tobacco', 'weapons', 'gambling', 'adult entertainment']
  },
  
  'compliance-enhanced': {
    id: 'compliance-enhanced',
    category: 'compliance',
    name: 'Enhanced Compliance',
    version: 'v2.0',
    description: 'Stringent compliance for UHNW, institutional clients, and complex products',
    bestFor: ['UHNW', 'Institutional', 'Derivatives', 'Structured products'],
    skills: [
      'Advanced regulatory analysis',
      'Jurisdiction-specific rules',
      'Enhanced due diligence',
      'Sophisticated product disclosures',
      'AML/KYC deep checks'
    ],
    constraints: [
      'Zero tolerance for restricted content',
      'Jurisdiction-aware validation',
      'Enhanced documentation requirements'
    ],
    compatibleWith: ['evaluation-enhanced', 'rewrite-enhanced'],
    requires: ['evaluation-enhanced'], // Enhanced compliance requires enhanced evaluation
    prohibitedTerms: [
      'tobacco', 'weapons', 'gambling', 'adult entertainment',
      'guaranteed returns', 'risk-free', 'insider'
    ]
  },
  
  // ===== EVALUATION AGENTS (RECOMMENDED CATEGORY) =====
  'evaluation-standard': {
    id: 'evaluation-standard',
    category: 'evaluation',
    name: 'Standard Evaluation',
    version: 'v1.0',
    description: 'Basic quality and completeness checks for standard documents',
    bestFor: ['Retail', 'HNW', 'Simple products'],
    skills: [
      'Content completeness',
      'Disclaimer detection',
      'Structural validation',
      'Length checks'
    ],
    constraints: [
      'Cannot modify content',
      'Must provide actionable feedback'
    ],
    compatibleWith: ['compliance-standard', 'compliance-enhanced', 'rewrite-standard', 'rewrite-enhanced']
  },
  
  'evaluation-enhanced': {
    id: 'evaluation-enhanced',
    category: 'evaluation',
    name: 'Enhanced Evaluation',
    version: 'v2.0',
    description: 'Comprehensive quality assessment for sophisticated clients and complex products',
    bestFor: ['UHNW', 'Institutional', 'Complex structures'],
    skills: [
      'Advanced completeness analysis',
      'Multi-level disclaimer validation',
      'Suitability assessment',
      'Sophisticated product disclosures',
      'Conflict of interest detection'
    ],
    constraints: [
      'Cannot modify content',
      'Must align with client sophistication level',
      'Enforces enhanced documentation standards'
    ],
    compatibleWith: ['compliance-enhanced', 'rewrite-enhanced']
  },
  
  // ===== REWRITE AGENTS (CONDITIONAL CATEGORY) =====
  'rewrite-standard': {
    id: 'rewrite-standard',
    category: 'rewrite',
    name: 'Standard Rewrite',
    version: 'v1.0',
    description: 'Basic compliant text generation for common issues',
    bestFor: ['Retail', 'HNW', 'Standard fixes'],
    skills: [
      'Policy-aware text generation',
      'Intent preservation',
      'Simple substitutions',
      'Tone consistency'
    ],
    constraints: [
      'Must preserve factual accuracy',
      'Cannot introduce new violations',
      'Maintains similar structure'
    ],
    compatibleWith: ['compliance-standard', 'compliance-enhanced', 'evaluation-standard', 'evaluation-enhanced']
  },
  
  'rewrite-enhanced': {
    id: 'rewrite-enhanced',
    category: 'rewrite',
    name: 'Enhanced Rewrite',
    version: 'v2.0',
    description: 'Sophisticated rewrites for complex products and jurisdictions',
    bestFor: ['UHNW', 'Institutional', 'Multi-jurisdictional'],
    skills: [
      'Advanced policy-aware generation',
      'Jurisdiction-specific language',
      'Complex product descriptions',
      'Multi-paragraph restructuring',
      'Regulatory language adaptation'
    ],
    constraints: [
      'Must preserve factual accuracy',
      'Jurisdiction-compliant phrasing',
      'Enhanced disclosure preservation'
    ],
    compatibleWith: ['compliance-enhanced', 'evaluation-enhanced']
  },

  // ===== NEW DEMO VARIANTS (Revision 2) =====
  // COMPLIANCE VARIANTS
  'compliance_standard_v1': {
    id: 'compliance_standard_v1',
    category: 'compliance',
    name: 'Standard Compliance',
    version: 'v1',
    description: 'Retail/HNW compliance checks',
    bestFor: ['Retail', 'HNW', 'Standard products'],
    skills: [
      'Prohibited terms detection (tobacco)',
      'Basic policy checks',
      'Risk disclosure validation',
      'Standard regulatory framework'
    ],
    constraints: [
      'Zero tolerance for restricted content'
    ],
    compatibleWith: ['evaluation_standard_v1', 'rewrite_standard_v1'],
    prohibitedTerms: ['tobacco'],  // MINIMAL - demo focus
    applicableTo: {
      segments: ['Retail', 'HNW'],
      jurisdictions: ['SG', 'EU', 'UK', 'US'],
      note: 'Standard compliance for simple products'
    }
  },

  'compliance_enhanced_uhnw_v1': {
    id: 'compliance_enhanced_uhnw_v1',
    category: 'compliance',
    name: 'Enhanced Compliance (UHNW)',
    version: 'v1',
    description: 'Stringent UHNW compliance',
    bestFor: ['UHNW'],
    skills: [
      'Advanced regulatory checks',
      'Enhanced due diligence',
      'UHNW-specific disclosures',
      'Sophisticated product validation'
    ],
    constraints: [
      'Mandatory for UHNW segment'
    ],
    compatibleWith: ['evaluation_standard_v1', 'evaluation_strict_v1', 'rewrite_policy_safe_v1'],
    prohibitedTerms: ['tobacco'],  // MINIMAL - demo focus
    applicableTo: {
      segments: ['UHNW'],
      jurisdictions: ['SG', 'CH', 'EU', 'UK', 'US'],
      note: 'Required for UHNW clients'
    }
  },

  'compliance_enhanced_ch_cic_v1': {
    id: 'compliance_enhanced_ch_cic_v1',
    category: 'compliance',
    name: 'Enhanced Compliance (CH/CIC)',
    version: 'v1',
    description: 'Switzerland/CIC jurisdiction compliance',
    bestFor: ['CIC', 'CH jurisdiction'],
    skills: [
      'CH regulatory framework',
      'CIC-specific rules',
      'Cross-border compliance',
      'Enhanced documentation requirements'
    ],
    constraints: [
      'Mandatory for CH jurisdiction',
      'Mandatory for CIC segment'
    ],
    compatibleWith: ['evaluation_strict_v1', 'rewrite_policy_safe_v1'],
    prohibitedTerms: ['tobacco'],  // MINIMAL - demo focus
    applicableTo: {
      segments: ['CIC', 'UHNW', 'Institutional'],
      jurisdictions: ['CH'],
      note: 'Required for CH jurisdiction or CIC segment'
    }
  },

  // EVALUATION VARIANTS
  'evaluation_standard_v1': {
    id: 'evaluation_standard_v1',
    category: 'evaluation',
    name: 'Standard Evaluation',
    version: 'v1',
    description: 'Basic quality and completeness checks',
    bestFor: ['Retail', 'HNW', 'UHNW', 'Simple to moderate products'],
    skills: [
      'Inconsistency detection',
      'Basic disclosure checks',
      'Clarity validation',
      'Completeness assessment'
    ],
    constraints: [],
    compatibleWith: ['compliance_standard_v1', 'compliance_enhanced_uhnw_v1', 'rewrite_standard_v1'],
    applicableTo: {
      segments: ['Retail', 'HNW', 'UHNW'],
      jurisdictions: ['SG', 'EU', 'UK', 'US'],
      note: 'Standard evaluation for most contexts'
    }
  },

  'evaluation_strict_v1': {
    id: 'evaluation_strict_v1',
    category: 'evaluation',
    name: 'Strict Evaluation',
    version: 'v1',
    description: 'Enhanced quality checks for complex products and jurisdictions',
    bestFor: ['CIC', 'CH', 'Complex products'],
    skills: [
      'Deep logical analysis',
      'Advanced disclosure validation',
      'Regulatory compliance verification',
      'Sophisticated product suitability checks'
    ],
    constraints: [
      'Required for CH/CIC contexts'
    ],
    compatibleWith: ['compliance_enhanced_uhnw_v1', 'compliance_enhanced_ch_cic_v1', 'rewrite_policy_safe_v1'],
    applicableTo: {
      segments: ['CIC', 'UHNW', 'Institutional'],
      jurisdictions: ['CH'],
      note: 'Required for CH jurisdiction or CIC segment'
    }
  },

  // REWRITE VARIANTS
  'rewrite_standard_v1': {
    id: 'rewrite_standard_v1',
    category: 'rewrite',
    name: 'Standard Rewrite',
    version: 'v1',
    description: 'Basic compliant text generation',
    bestFor: ['Retail', 'HNW', 'Standard products'],
    skills: [
      'Basic compliant rewrites',
      'Simple language improvements',
      'Disclosure insertion'
    ],
    constraints: [
      'Preserve original meaning'
    ],
    compatibleWith: ['compliance_standard_v1', 'evaluation_standard_v1'],
    applicableTo: {
      segments: ['Retail', 'HNW'],
      jurisdictions: ['SG', 'EU', 'UK', 'US'],
      note: 'Standard rewrite for simple products'
    }
  },

  'rewrite_policy_safe_v1': {
    id: 'rewrite_policy_safe_v1',
    category: 'rewrite',
    name: 'Policy-Safe Rewrite',
    version: 'v1',
    description: 'Policy-aware rewrites for complex contexts',
    bestFor: ['UHNW', 'CIC', 'Institutional', 'Complex products'],
    skills: [
      'Policy-aware text generation',
      'Regulatory language adaptation',
      'Sophisticated disclosure integration',
      'Jurisdiction-specific phrasing'
    ],
    constraints: [
      'Must preserve all regulatory requirements',
      'Enhanced accuracy validation'
    ],
    compatibleWith: ['compliance_enhanced_uhnw_v1', 'compliance_enhanced_ch_cic_v1', 'evaluation_standard_v1', 'evaluation_strict_v1'],
    applicableTo: {
      segments: ['UHNW', 'CIC', 'Institutional'],
      jurisdictions: ['SG', 'CH', 'EU', 'UK', 'US'],
      note: 'Policy-safe rewrite for high-value clients'
    }
  }
};

/**
 * Get all agents for a specific category
 */
export function getAgentsByCategory(category: AgentCategory): AgentVariant[] {
  return Object.values(AGENT_VARIANTS).filter(agent => agent.category === category);
}

/**
 * Get agent variant by ID
 */
export function getAgentVariant(agentId: string): AgentVariant | null {
  return AGENT_VARIANTS[agentId] || null;
}

/**
 * Check if two agents are compatible
 */
export function areAgentsCompatible(agentId1: string, agentId2: string): boolean {
  const agent1 = AGENT_VARIANTS[agentId1];
  const agent2 = AGENT_VARIANTS[agentId2];
  
  if (!agent1 || !agent2) return false;
  
  return agent1.compatibleWith.includes(agentId2) || agent2.compatibleWith.includes(agentId1);
}

/**
 * Validate agent selection and return errors if any
 */
export function validateAgentSelection(selectedAgents: Record<AgentCategory, string | undefined>): string[] {
  const errors: string[] = [];
  
  // Compliance is required
  if (!selectedAgents.compliance) {
    errors.push('Compliance agent is required');
  }
  
  // Check required dependencies
  Object.entries(selectedAgents).forEach(([category, agentId]) => {
    if (!agentId) return;
    
    const agent = AGENT_VARIANTS[agentId];
    if (!agent) return;
    
    if (agent.requires) {
      agent.requires.forEach(requiredAgentId => {
        const requiredAgent = AGENT_VARIANTS[requiredAgentId];
        if (!requiredAgent) return;
        
        const selectedInCategory = selectedAgents[requiredAgent.category];
        if (selectedInCategory !== requiredAgentId) {
          errors.push(
            `${agent.name} requires ${requiredAgent.name} but ${selectedInCategory ? AGENT_VARIANTS[selectedInCategory]?.name : 'no agent'} is selected`
          );
        }
      });
    }
  });
  
  // Check compatibility
  const selectedIds = Object.values(selectedAgents).filter(Boolean) as string[];
  for (let i = 0; i < selectedIds.length; i++) {
    for (let j = i + 1; j < selectedIds.length; j++) {
      if (!areAgentsCompatible(selectedIds[i], selectedIds[j])) {
        const agent1 = AGENT_VARIANTS[selectedIds[i]];
        const agent2 = AGENT_VARIANTS[selectedIds[j]];
        errors.push(`${agent1.name} is not compatible with ${agent2.name}`);
      }
    }
  }
  
  return errors;
}


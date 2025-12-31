/**
 * Static Agent Registry
 * Defines all available agents with their capabilities and metadata
 */

export type RoleType = 'orchestration' | 'compliance' | 'evaluation' | 'optimization' | 'client-facing';

export interface AgentMetadata {
  id: string;
  displayName: string;
  roleType: RoleType;
  description: string;
  inputs: string[];
  outputs: string[];
  constraints: string[];
  skills: string[];
}

export const AGENT_REGISTRY: Record<string, AgentMetadata> = {
  orchestrator: {
    id: 'orchestrator',
    displayName: 'Orchestrator',
    roleType: 'orchestration',
    description: 'Coordinates multi-agent workflows and manages execution flow based on runtime conditions.',
    inputs: [
      'Document sections',
      'Flow configuration',
      'Execution context'
    ],
    outputs: [
      'Execution plan',
      'Agent coordination timeline',
      'Decision recommendations',
      'Aggregated artifacts'
    ],
    constraints: [
      'Must preserve agent traceability',
      'Cannot modify agent outputs',
      'Enforces flow-specific branching logic'
    ],
    skills: [
      'Dynamic workflow branching',
      'Agent dependency resolution',
      'Failure recovery and retry logic',
      'Parent-child trace management',
      'Decision synthesis from multiple agent outputs',
      'Runtime policy enforcement'
    ]
  },
  
  compliance: {
    id: 'compliance',
    displayName: 'Compliance Agent',
    roleType: 'compliance',
    description: 'Validates content against regulatory requirements and internal policies. Detects prohibited terms and policy violations.',
    inputs: [
      'Section content',
      'Policy corpus',
      'Regulatory guidelines'
    ],
    outputs: [
      'Policy violation issues (CRITICAL/HIGH severity)',
      'Compliance warnings',
      'Prohibited term alerts'
    ],
    constraints: [
      'Zero tolerance for restricted content',
      'Must reference specific policy rules',
      'Operates in read-only mode'
    ],
    skills: [
      'Keyword-based compliance detection',
      'Policy corpus mapping',
      'Regulatory cross-referencing',
      'Severity classification',
      'Real-time violation alerts'
    ]
  },
  
  evaluation: {
    id: 'evaluation',
    displayName: 'Evaluation Agent',
    roleType: 'evaluation',
    description: 'Assesses document quality, completeness, and adherence to standards. Identifies missing disclaimers, insufficient content, and structural issues.',
    inputs: [
      'Section content',
      'Section metadata (title, type)',
      'Quality standards'
    ],
    outputs: [
      'Quality assessment issues (HIGH/MEDIUM severity)',
      'Completeness warnings',
      'Structural recommendations'
    ],
    constraints: [
      'Cannot modify content',
      'Must provide actionable feedback',
      'Focuses on form and structure, not legal compliance'
    ],
    skills: [
      'Content completeness analysis',
      'Disclaimer detection',
      'Structural validation',
      'Length and format checks',
      'Best practice enforcement'
    ]
  },
  
  rewrite: {
    id: 'rewrite',
    displayName: 'Rewrite Agent',
    roleType: 'optimization',
    description: 'Generates compliant alternative text that addresses identified issues while preserving intent. Produces proposed fixes for policy violations.',
    inputs: [
      'Original section content',
      'Identified issues',
      'Compliance requirements',
      'Tone/style preferences'
    ],
    outputs: [
      'Proposed compliant versions',
      'Rewrite rationale',
      'Change summaries'
    ],
    constraints: [
      'Must preserve factual accuracy',
      'Cannot introduce new policy violations',
      'Maintains similar length and structure'
    ],
    skills: [
      'Policy-aware text generation',
      'Intent preservation',
      'Regulatory language adaptation',
      'Tone consistency',
      'Multi-paragraph rewriting',
      'Context-aware substitution'
    ]
  },
  
  clientInfo: {
    id: 'clientInfo',
    displayName: 'Client Info Agent',
    roleType: 'client-facing',
    description: 'Identifies missing evidence and generates client communication checklists. Produces questions for information gathering.',
    inputs: [
      'Document issues',
      'Evidence requirements',
      'Client context'
    ],
    outputs: [
      'Evidence request checklists',
      'Client communication drafts',
      'Information gap analysis'
    ],
    constraints: [
      'Must be client-appropriate language',
      'Cannot make legal judgments',
      'Focuses on information gathering only'
    ],
    skills: [
      'Evidence gap identification',
      'Client-friendly question generation',
      'Checklist prioritization',
      'Communication clarity optimization',
      'Follow-up request structuring'
    ]
  }
};

/**
 * Normalize agent label to agent ID
 * Handles various string formats from issue.agent or issue.agentId
 */
export function normalizeAgentId(agentLabel: string | undefined): string | null {
  if (!agentLabel || typeof agentLabel !== 'string') return null;
  
  const normalized = agentLabel.toLowerCase().trim();
  
  // Direct matches
  if (AGENT_REGISTRY[normalized]) return normalized;
  
  // Common aliases
  const aliasMap: Record<string, string> = {
    'compliance agent': 'compliance',
    'evaluation agent': 'evaluation',
    'evaluate agent': 'evaluation',
    'optimize agent': 'rewrite',
    'rewrite agent': 'rewrite',
    'system': 'orchestrator',
    'orchestrator agent': 'orchestrator',
    'client info agent': 'clientInfo',
    'evidence agent': 'clientInfo'
  };
  
  return aliasMap[normalized] || null;
}

/**
 * Get agent metadata by ID
 */
export function getAgentMetadata(agentId: string): AgentMetadata | null {
  return AGENT_REGISTRY[agentId] || null;
}

/**
 * Get all agents as array
 */
export function getAllAgents(): AgentMetadata[] {
  return Object.values(AGENT_REGISTRY);
}



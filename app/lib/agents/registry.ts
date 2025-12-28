// Agent registry - central catalog of all agents

import { AgentId, AgentDefinition } from './types';
import { validateHandler } from './handlers/validate';
import { synthesizeHandler } from './handlers/synthesize';
import { optimizeHandler } from './handlers/optimize';
import { mergeHandler } from './handlers/merge';
import { evaluateHandler } from './handlers/evaluate';
import { complianceHandler } from './handlers/compliance';
import { extractFactsHandler } from './handlers/extract-facts';
import { mapPolicyHandler } from './handlers/map-policy';
import { redteamReviewHandler } from './handlers/redteam-review';
import { requestEvidenceHandler } from './handlers/request-evidence';
import { draftClientCommsHandler } from './handlers/draft-client-comms';
import { writeAuditHandler } from './handlers/write-audit';

export const AGENT_REGISTRY: Record<AgentId, AgentDefinition> = {
  'validate-agent': {
    config: {
      id: 'validate-agent',
      name: 'Validate Agent',
      description: 'Validates user input relevance for profile topics',
      capabilities: ['validate', 'extract', 'guide']
    },
    handler: validateHandler
  },
  
  'synthesize-agent': {
    config: {
      id: 'synthesize-agent',
      name: 'Synthesize Agent',
      description: 'Synthesizes multiple user responses into coherent paragraphs',
      capabilities: ['synthesize', 'summarize', 'combine']
    },
    handler: synthesizeHandler
  },
  
  'optimize-agent': {
    config: {
      id: 'optimize-agent',
      name: 'Optimize Agent',
      description: 'Optimizes section content based on user requests',
      capabilities: ['optimize', 'revise', 'enhance']
    },
    handler: optimizeHandler
  },
  
  'merge-agent': {
    config: {
      id: 'merge-agent',
      name: 'Merge Agent',
      description: 'Merges chat content with document context',
      capabilities: ['merge', 'enrich', 'combine']
    },
    handler: mergeHandler
  },
  
  'evaluate-agent': {
    config: {
      id: 'evaluate-agent',
      name: 'Evaluate Agent',
      description: 'Evaluates section content for compliance and quality',
      capabilities: ['evaluate', 'assess', 'validate']
    },
    handler: evaluateHandler
  },
  
  'compliance-agent': {
    config: {
      id: 'compliance-agent',
      name: 'Compliance Agent',
      description: 'Checks content for policy violations',
      capabilities: ['compliance', 'policy', 'validate']
    },
    handler: complianceHandler
  },
  
  'extract-facts-agent': {
    config: {
      id: 'extract-facts-agent',
      name: 'Extract Facts Agent',
      description: 'Extracts structured facts from document sections with evidence anchors',
      capabilities: ['extract', 'parse', 'structure', 'evidence-tracking']
    },
    handler: extractFactsHandler
  },
  
  'map-policy-agent': {
    config: {
      id: 'map-policy-agent',
      name: 'Map Policy Agent',
      description: 'Maps extracted facts to relevant policy rules using corpus',
      capabilities: ['policy-mapping', 'risk-assessment', 'compliance-check']
    },
    handler: mapPolicyHandler
  },
  
  'redteam-review-agent': {
    config: {
      id: 'redteam-review-agent',
      name: 'Red Team Review Agent',
      description: 'Adversarial review to find edge cases and policy violations',
      capabilities: ['adversarial-review', 'edge-case-detection', 'critical-analysis']
    },
    handler: redteamReviewHandler
  },
  
  'request-evidence-agent': {
    config: {
      id: 'request-evidence-agent',
      name: 'Request Evidence Agent',
      description: 'Generates specific evidence requests based on compliance issues',
      capabilities: ['evidence-request', 'gap-analysis', 'prioritization']
    },
    handler: requestEvidenceHandler
  },
  
  'draft-client-comms-agent': {
    config: {
      id: 'draft-client-comms-agent',
      name: 'Draft Client Communications Agent',
      description: 'Drafts professional client-facing communications based on review results',
      capabilities: ['communication', 'multilingual', 'tone-adjustment']
    },
    handler: draftClientCommsHandler
  },
  
  'write-audit-agent': {
    config: {
      id: 'write-audit-agent',
      name: 'Write Audit Agent',
      description: 'Generates structured audit log entries for compliance records',
      capabilities: ['audit-logging', 'compliance-trail', 'documentation']
    },
    handler: writeAuditHandler
  }
};

export function getAgent(agentId: AgentId): AgentDefinition | undefined {
  return AGENT_REGISTRY[agentId];
}

export function listAgents(): AgentDefinition[] {
  return Object.values(AGENT_REGISTRY);
}


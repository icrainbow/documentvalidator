// Agent registry - central catalog of all agents

import { AgentId, AgentDefinition } from './types';
import { validateHandler } from './handlers/validate';
import { synthesizeHandler } from './handlers/synthesize';
import { optimizeHandler } from './handlers/optimize';
import { mergeHandler } from './handlers/merge';

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
    // Placeholder - not yet implemented
    handler: async (input) => ({ status: 'pass', issues: [] })
  },
  
  'compliance-agent': {
    config: {
      id: 'compliance-agent',
      name: 'Compliance Agent',
      description: 'Checks content for policy violations',
      capabilities: ['compliance', 'policy', 'validate']
    },
    // Placeholder - not yet implemented
    handler: async (input) => ({ compliant: true, violations: [] })
  }
};

export function getAgent(agentId: AgentId): AgentDefinition | undefined {
  return AGENT_REGISTRY[agentId];
}

export function listAgents(): AgentDefinition[] {
  return Object.values(AGENT_REGISTRY);
}


/**
 * Skills Framework - Skill Catalog
 * 
 * Hardcoded catalog of available skills for Phase A demo.
 */

import type { SkillDef } from './types';

/**
 * Global Skill Catalog
 * 
 * Phase A: 2 hardcoded skills for Flow2 KYC review.
 * Future: Could be dynamically loaded from a registry.
 */
export const SKILL_CATALOG: SkillDef[] = [
  {
    name: 'kyc.topic_assemble',
    description: 'Organizes uploaded documents into KYC topic sections (client_identity, source_of_wealth, beneficial_ownership, etc.)',
    ownerAgent: 'topic_assembler',
    version: '1.0.0',
    tags: ['kyc', 'structuring', 'fast'],
    inputSchemaSummary: 'documents: Array<{ name: string, content: string }>',
    outputSchemaSummary: 'topicSections: Array<{ id: string, title: string, content: string, ... }>',
  },
  {
    name: 'risk.triage',
    description: 'Scores KYC documents for risk level and routes to appropriate review path (fast/crosscheck/escalate/human_gate)',
    ownerAgent: 'risk_triage_agent',
    version: '1.0.0',
    tags: ['risk', 'routing', 'decision'],
    inputSchemaSummary: 'topicSections: Array<{ id: string, content: string, ... }>',
    outputSchemaSummary: '{ riskScore: number, path: string, reasoning: string }',
  },
];

/**
 * Get skill definition by name
 */
export function getSkillDef(name: string): SkillDef | undefined {
  return SKILL_CATALOG.find(skill => skill.name === name);
}


/**
 * Agent Display Name Mapping (UI Layer)
 * 
 * Provides business-friendly display names for agents while keeping
 * system identifiers stable for engineering/debug purposes.
 * 
 * Usage:
 * - UI: Always show getAgentDisplayName(systemName)
 * - Debug: Show systemName in collapsed "Details" section
 * - Code: Continue using system IDs (compliance, evaluation, etc.)
 */

import { getAgentMetadata } from './agentRegistry';

/**
 * Business-oriented display names for agents
 * Maps system_name -> user-facing display name
 */
const AGENT_DISPLAY_NAME_MAP: Record<string, string> = {
  // Orchestration
  orchestrator: 'Workflow Coordinator',
  
  // Core Review Agents
  compliance: 'Policy & Compliance Scan',
  compliance_standard_v1: 'Policy & Compliance Scan',
  compliance_enhanced_uhnw_v1: 'Policy & Compliance Scan (Enhanced)',
  compliance_enhanced_ch_cic_v1: 'Policy & Compliance Scan (CH/CIC)',
  
  evaluation: 'Risk Summary & Recommendation',
  evaluation_standard_v1: 'Risk Summary & Recommendation',
  evaluation_strict_v1: 'Risk Summary & Recommendation (Strict)',
  
  rewrite: 'Suggested Wording Improvements',
  rewrite_standard_v1: 'Suggested Wording Improvements',
  rewrite_policy_safe_v1: 'Suggested Wording Improvements (Policy-Safe)',
  
  // Client-facing
  clientInfo: 'Evidence & Information Requests',
  
  // Document Structuring
  doc_structuring_v1: 'Document Structuring Agent',
  doc_structuring_llm_v1: 'Document Structuring Agent (Agentic)',
  structure_quality_evaluator: 'Structure Quality Evaluator',
  
  // Legacy/aliases
  'Compliance Agent': 'Policy & Compliance Scan',
  'Evaluation Agent': 'Risk Summary & Recommendation',
  'Rewrite Agent': 'Suggested Wording Improvements',
  'Client Info Agent': 'Evidence & Information Requests',
};

/**
 * Get business-friendly display name for an agent
 * @param systemName - Agent system identifier (e.g., "compliance", "evaluation")
 * @returns User-facing display name (e.g., "Policy & Compliance Scan")
 */
export function getAgentDisplayName(systemName: string | undefined): string {
  if (!systemName) return 'Unknown Agent';
  
  // Check mapping first
  const mappedName = AGENT_DISPLAY_NAME_MAP[systemName];
  if (mappedName) return mappedName;
  
  // Check mapping with normalized key
  const normalizedKey = systemName.toLowerCase().trim();
  const normalizedMapped = AGENT_DISPLAY_NAME_MAP[normalizedKey];
  if (normalizedMapped) return normalizedMapped;
  
  // Fallback to registry displayName
  const metadata = getAgentMetadata(normalizedKey);
  if (metadata?.displayName) return metadata.displayName;
  
  // Last resort: return system name with capitalization
  return systemName.charAt(0).toUpperCase() + systemName.slice(1);
}

/**
 * Get system identifier for an agent (for debug/engineering use)
 * @param systemName - Agent system identifier
 * @returns Stable system ID (unchanged from input, just validated)
 */
export function getAgentSystemName(systemName: string | undefined): string {
  if (!systemName) return 'unknown';
  return systemName;
}

/**
 * Check if an agent has a custom display name mapping
 * @param systemName - Agent system identifier
 * @returns True if custom mapping exists
 */
export function hasCustomDisplayName(systemName: string): boolean {
  return !!AGENT_DISPLAY_NAME_MAP[systemName] || !!AGENT_DISPLAY_NAME_MAP[systemName.toLowerCase()];
}


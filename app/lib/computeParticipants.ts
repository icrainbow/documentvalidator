/**
 * Runtime Participation Attribution
 * Computes which agents participated in the current review based on actual outputs
 */

import { normalizeAgentId, getAgentMetadata, type AgentMetadata } from './agentRegistry';

export interface ParticipantCounts {
  issuesTotal: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  proposedTexts: number;
  checklists: number;
}

export interface AgentParticipant {
  agentId: string;
  displayName: string;
  roleType: string;
  counts: ParticipantCounts;
}

interface SectionBundle {
  proposedText: string | null;
  hasChecklist: boolean;
  issues: any[];
}

/**
 * Compute participating agents from review outputs
 * @param issues - Array of issues from orchestration result
 * @param sectionBundles - Array of section bundles with remediations (optional)
 * @returns Array of participating agents with attribution counts
 */
export function computeParticipants(
  issues: any[] = [],
  sectionBundles: SectionBundle[] = []
): AgentParticipant[] {
  
  // Track agent contributions
  const agentMap = new Map<string, {
    agentId: string;
    displayName: string;
    roleType: string;
    issuesTotal: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    proposedTexts: number;
    checklists: number;
  }>();
  
  // Process issues
  issues.forEach(issue => {
    // Determine agent ID from issue
    let agentId = issue.agentId;
    
    if (!agentId && issue.agent) {
      agentId = normalizeAgentId(issue.agent);
    }
    
    // Fallback: infer from issue type
    if (!agentId) {
      if (issue.type === 'policy_violation' || issue.severity === 'critical') {
        agentId = 'compliance';
      } else if (issue.type === 'missing_disclaimer' || issue.type === 'missing_signature') {
        agentId = 'evaluation';
      } else if (issue.type === 'missing_evidence' || issue.type === 'unclear_wording') {
        agentId = 'clientInfo';
      } else {
        agentId = 'evaluation'; // default
      }
    }
    
    // Get or create agent entry
    if (!agentMap.has(agentId)) {
      const meta = getAgentMetadata(agentId);
      agentMap.set(agentId, {
        agentId,
        displayName: meta?.displayName || agentId,
        roleType: meta?.roleType || 'unknown',
        issuesTotal: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        proposedTexts: 0,
        checklists: 0
      });
    }
    
    const agent = agentMap.get(agentId)!;
    agent.issuesTotal++;
    
    // Count by severity
    const severity = (issue.severity || 'medium').toLowerCase();
    if (severity === 'critical') agent.critical++;
    else if (severity === 'high') agent.high++;
    else if (severity === 'medium') agent.medium++;
    else if (severity === 'low') agent.low++;
  });
  
  // Process section bundles for remediations
  sectionBundles.forEach(bundle => {
    // Proposed texts are produced by rewrite agent
    if (bundle.proposedText) {
      if (!agentMap.has('rewrite')) {
        const meta = getAgentMetadata('rewrite');
        agentMap.set('rewrite', {
          agentId: 'rewrite',
          displayName: meta?.displayName || 'Rewrite Agent',
          roleType: meta?.roleType || 'optimization',
          issuesTotal: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          proposedTexts: 0,
          checklists: 0
        });
      }
      agentMap.get('rewrite')!.proposedTexts++;
    }
    
    // Checklists are produced by clientInfo agent
    if (bundle.hasChecklist) {
      if (!agentMap.has('clientInfo')) {
        const meta = getAgentMetadata('clientInfo');
        agentMap.set('clientInfo', {
          agentId: 'clientInfo',
          displayName: meta?.displayName || 'Client Info Agent',
          roleType: meta?.roleType || 'client-facing',
          issuesTotal: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          proposedTexts: 0,
          checklists: 0
        });
      }
      agentMap.get('clientInfo')!.checklists++;
    }
  });
  
  // If we have any activity, orchestrator was involved
  if (agentMap.size > 0) {
    const meta = getAgentMetadata('orchestrator');
    agentMap.set('orchestrator', {
      agentId: 'orchestrator',
      displayName: meta?.displayName || 'Orchestrator',
      roleType: meta?.roleType || 'orchestration',
      issuesTotal: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      proposedTexts: 0,
      checklists: 0
    });
  }
  
  // Convert to array and sort by role importance
  const roleOrder: Record<string, number> = {
    'orchestration': 0,
    'compliance': 1,
    'evaluation': 2,
    'optimization': 3,
    'client-facing': 4,
    'unknown': 5
  };
  
  const participants: AgentParticipant[] = Array.from(agentMap.values()).map(agent => ({
    agentId: agent.agentId,
    displayName: agent.displayName,
    roleType: agent.roleType,
    counts: {
      issuesTotal: agent.issuesTotal,
      critical: agent.critical,
      high: agent.high,
      medium: agent.medium,
      low: agent.low,
      proposedTexts: agent.proposedTexts,
      checklists: agent.checklists
    }
  }));
  
  participants.sort((a, b) => {
    const orderA = roleOrder[a.roleType] ?? 5;
    const orderB = roleOrder[b.roleType] ?? 5;
    return orderA - orderB;
  });
  
  return participants;
}



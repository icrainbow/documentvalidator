/**
 * Flow2: Graph Executor
 * 
 * Executes parallel risk checks based on triage path.
 * Deterministic checks (no LLM in MVP).
 */

import type { TopicSection, Conflict, Coverage, GraphPath, GraphTraceEvent } from './types';

export interface ExecutionResult {
  conflicts: Conflict[];
  coverageGaps: Coverage[];
  policyFlags: string[];
  events: GraphTraceEvent[];
}

/**
 * Execute parallel risk checks
 * 
 * Nodes:
 * - conflict_sweep: Find contradictions between topics
 * - gap_collector: Identify missing/partial coverage
 * - policy_flags_check: Detect policy violations
 */
export async function executeParallelChecks(
  topicSections: TopicSection[],
  routePath: GraphPath
): Promise<ExecutionResult> {
  const events: GraphTraceEvent[] = [];
  const startTime = Date.now();
  
  // Determine which checks to run based on path
  const shouldRunConflictSweep = routePath !== 'fast';
  const shouldRunGapCollector = true; // Always run
  const shouldRunPolicyFlags = routePath === 'escalate' || routePath === 'human_gate';
  
  // Execute in parallel
  const checks = [];
  
  if (shouldRunConflictSweep) {
    checks.push(
      runConflictSweep(topicSections).then(result => {
        events.push({
          node: 'conflict_sweep',
          status: 'executed',
          decision: `Found ${result.length} conflicts`,
          startedAt: new Date(startTime).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          outputsSummary: `${result.length} conflicts detected`
        });
        return { conflicts: result };
      })
    );
  } else {
    events.push({
      node: 'conflict_sweep',
      status: 'skipped',
      reason: 'Fast path - skip conflict check'
    });
  }
  
  if (shouldRunGapCollector) {
    checks.push(
      runGapCollector(topicSections).then(result => {
        events.push({
          node: 'gap_collector',
          status: 'executed',
          decision: `Found ${result.length} coverage gaps`,
          startedAt: new Date(startTime).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          outputsSummary: `${result.length} gaps identified`
        });
        return { coverageGaps: result };
      })
    );
  }
  
  if (shouldRunPolicyFlags) {
    checks.push(
      runPolicyFlagsCheck(topicSections).then(result => {
        events.push({
          node: 'policy_flags_check',
          status: 'executed',
          decision: `Found ${result.length} policy flags`,
          startedAt: new Date(startTime).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          outputsSummary: `${result.length} flags raised`
        });
        return { policyFlags: result };
      })
    );
  } else {
    events.push({
      node: 'policy_flags_check',
      status: 'skipped',
      reason: 'Not escalate/human_gate path'
    });
  }
  
  // Wait for all checks
  const results = await Promise.all(checks);
  
  // Merge results
  const merged: ExecutionResult = {
    conflicts: [],
    coverageGaps: [],
    policyFlags: [],
    events
  };
  
  results.forEach(r => {
    if ('conflicts' in r) merged.conflicts = r.conflicts;
    if ('coverageGaps' in r) merged.coverageGaps = r.coverageGaps;
    if ('policyFlags' in r) merged.policyFlags = r.policyFlags;
  });
  
  return merged;
}

/**
 * Conflict sweep: Find contradictions
 */
async function runConflictSweep(topicSections: TopicSection[]): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  
  // Simple heuristic: Check for contradicting statements
  // Example: "high risk" in one topic, "low risk" in another
  
  const riskTopics = topicSections.filter(s => 
    s.content.toLowerCase().includes('risk')
  );
  
  if (riskTopics.length > 1) {
    const hasHighRisk = riskTopics.some(t => t.content.toLowerCase().includes('high risk'));
    const hasLowRisk = riskTopics.some(t => t.content.toLowerCase().includes('low risk'));
    
    if (hasHighRisk && hasLowRisk) {
      conflicts.push({
        topicIds: riskTopics.map(t => t.topicId),
        description: 'Contradicting risk assessments found across topics',
        severity: 'high',
        evidenceRefs: riskTopics.flatMap(t => t.evidenceRefs.slice(0, 1))
      });
    }
  }
  
  return conflicts;
}

/**
 * Gap collector: Identify missing/partial coverage
 */
async function runGapCollector(topicSections: TopicSection[]): Promise<Coverage[]> {
  return topicSections
    .filter(s => s.coverage !== 'complete')
    .map(s => ({
      topicId: s.topicId,
      status: s.coverage,
      reason: s.coverage === 'missing' 
        ? 'No information found in documents' 
        : 'Insufficient detail provided'
    }));
}

/**
 * Policy flags check: Detect violations
 */
async function runPolicyFlagsCheck(topicSections: TopicSection[]): Promise<string[]> {
  const flags: string[] = [];
  const allContent = topicSections.map(s => s.content).join(' ').toLowerCase();
  
  const POLICY_VIOLATIONS = [
    { keyword: 'sanctions', flag: 'SANCTIONS_EXPOSURE' },
    { keyword: 'pep', flag: 'PEP_DETECTED' },
    { keyword: 'shell company', flag: 'SHELL_COMPANY_RISK' },
    { keyword: 'cash intensive', flag: 'CASH_INTENSIVE_BUSINESS' },
    { keyword: 'high risk jurisdiction', flag: 'HIGH_RISK_JURISDICTION' }
  ];
  
  POLICY_VIOLATIONS.forEach(({ keyword, flag }) => {
    if (allContent.includes(keyword)) {
      flags.push(flag);
    }
  });
  
  return flags;
}



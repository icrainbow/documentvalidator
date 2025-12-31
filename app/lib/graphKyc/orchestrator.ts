/**
 * Flow2: LangGraph KYC Orchestrator
 * 
 * Main entry point for Flow2 graph execution.
 * Coordinates: topic assembly → triage → execution → reflection (Phase 1) → human gate + resume.
 */

import type { GraphState, GraphReviewResponse, GraphTraceEvent, TopicSection } from './types';
import { assembleTopics } from './topicAssembler';
import { triageRisk } from './riskTriage';
import { executeParallelChecks } from './executor';
import { graphResumeStore } from './resumeStore';
import { createDefaultFlow2State, addTrace, type Flow2State } from './flow2State';
import { reflectAndReplan } from './reflect';
import { invokeSkill } from '../skills/skillDispatcher';
import type { SkillInvocation } from '../skills/types';

/**
 * Run LangGraph KYC review
 * 
 * Flow:
 * 1. Check if resuming (humanDecision + resumeToken present)
 * 2. If resuming: fetch stored state, continue execution
 * 3. If first run: assemble topics → triage → check human gate
 * 4. If gate required: save state and return gate prompt
 * 5. Execute parallel checks → PHASE 1: reflection node → return issues + trace
 */
export async function runGraphKycReview(
  state: GraphState,
  runId?: string,
  resumeToken?: string,
  features?: { reflection?: boolean; negotiation?: boolean; memory?: boolean; remote_skills?: boolean }
): Promise<GraphReviewResponse> {
  const events: GraphTraceEvent[] = [];
  const skillInvocations: SkillInvocation[] = []; // Phase A: Initialize skill invocations array
  const startTime = Date.now();
  
  // Phase 0: Initialize Flow2 state with feature flags
  const flow2State = createDefaultFlow2State(state.documents);
  flow2State.features.reflection = features?.reflection || false;
  flow2State.features.negotiation = features?.negotiation || false;
  flow2State.features.memory = features?.memory || false;
  flow2State.features.remote_skills = features?.remote_skills || false; // Phase 2
  flow2State.humanDecision = state.humanDecision;
  flow2State.dirtyTopics = state.dirtyTopics as any;
  
  console.log('[Flow2] Features:', flow2State.features);
  
  // Create skill invocation context (single source for trace)
  const skillContext = {
    trace: { skillInvocations },
    runId: runId || 'flow2-run',
    transport: 'local' as const,
    features: flow2State.features // Phase 2: Pass features for transport selection
  };
  
  try {
    // ============================================================
    // RESUME PATH: If humanDecision + resumeToken present
    // ============================================================
    if (state.humanDecision && resumeToken) {
      console.log('[Flow2] RESUME: Parsing resume token');
      
      // Parse token (JSON string)
      let tokenData: { runId: string; gateId: string; createdAt: number };
      try {
        tokenData = JSON.parse(resumeToken);
      } catch (parseError) {
        throw new Error('Invalid resume token format');
      }
      
      // Fetch stored state
      const storedState = graphResumeStore.get(tokenData.runId);
      if (!storedState) {
        throw new Error('Resume state expired or not found. Please restart review.');
      }
      
      console.log('[Flow2] RESUME: Found stored state for runId:', tokenData.runId);
      
      // Restore previous events
      events.push(...storedState.previousEvents);
      
      // Add human gate executed event
      events.push({
        node: 'human_gate',
        status: 'executed',
        decision: `User selected: ${state.humanDecision.decision}`,
        reason: `Decision by: ${state.humanDecision.signer || 'Unknown'}`,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: 0
      });
      
      // Continue execution with stored state
      console.log('[Flow2] RESUME: Continuing with path:', storedState.triageResult.routePath);
      const execution = await executeParallelChecks(
        storedState.topicSections,
        storedState.triageResult.routePath as any
      );
      
      events.push(...execution.events);
      
      // Convert to issues
      const issues = convertToIssues(execution, storedState.topicSections);
      
      events.push({
        node: 'finalize',
        status: 'executed',
        decision: `Generated ${issues.length} issues after human decision`,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: 2
      });
      
      // Clean up stored state
      graphResumeStore.delete(tokenData.runId);
      
      return {
        issues,
        topicSections: storedState.topicSections,
        conflicts: execution.conflicts,
        coverageGaps: execution.coverageGaps,
        graphReviewTrace: {
          events,
          summary: {
            path: storedState.triageResult.routePath as any,
            riskScore: storedState.triageResult.riskScore,
            riskBreakdown: storedState.triageResult.riskBreakdown as any,
            coverageMissingCount: execution.coverageGaps.filter(g => g.status === 'missing').length,
            conflictCount: execution.conflicts.length
          },
          skillInvocations // Phase A: Include skill invocations in trace
        }
      };
    }
    
    // ============================================================
    // FIRST RUN PATH: Normal flow
    // ============================================================
    
    // Step 1: Assemble topics
    console.log('[Flow2] Step 1: Assembling topics from', state.documents.length, 'documents');
    
    // Phase A: Wrap with skill dispatcher
    const topicSections = await invokeSkill<TopicSection[]>(
      'kyc.topic_assemble',
      { __result: assembleTopics(state.documents) }, // Pass actual result for transparent wrapper
      skillContext
    );
    
    events.push({
      node: 'topic_assembler',
      status: 'executed',
      decision: `Assembled ${topicSections.length} topics`,
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      outputsSummary: `${topicSections.length} topics extracted`
    });
    
    // Step 2: Triage risk
    console.log('[Flow2] Step 2: Triaging risk');
    
    // Phase A: Wrap with skill dispatcher
    const triage = await invokeSkill(
      'risk.triage',
      { __result: triageRisk(topicSections) }, // Pass actual result for transparent wrapper
      skillContext
    );
    
    events.push({
      node: 'risk_triage',
      status: 'executed',
      decision: `Risk score: ${triage.riskScore}, Path: ${triage.routePath}`,
      reason: triage.triageReasons.join('; '),
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 5,
      outputsSummary: `Score ${triage.riskScore} → ${triage.routePath}`
    });
    
    // Step 3: Execute parallel checks
    console.log('[Flow2] Step 3: Executing parallel checks for path:', triage.routePath);
    const execution = await executeParallelChecks(topicSections, triage.routePath);
    
    events.push(...execution.events);
    
    // Phase 1: Reflect and replan node (inserted after parallel checks)
    flow2State.topicSections = topicSections;
    // Note: ExecutionResult has NO issues field (executor.ts lines 10-15)
    // Issues are generated later via convertToIssues()
    flow2State.conflicts = execution.conflicts;
    flow2State.coverageGaps = execution.coverageGaps;
    flow2State.riskScore = triage.riskScore;
    flow2State.triageReasons = triage.triageReasons;
    flow2State.routePath = triage.routePath;
    flow2State.dirtyQueue = (state.dirtyTopics || []) as string[];
    
    // Run reflection node
    const reflectedState = await reflectAndReplan(flow2State);
    
    // Merge reflection trace into events
    reflectedState.trace.forEach(t => {
      events.push({
        node: t.node,
        status: 'executed',
        decision: t.message,
        reason: JSON.stringify(t.data || {}),
        startedAt: t.ts,
        endedAt: t.ts,
        durationMs: 0
      });
    });
    
    // Phase 1.5: Route based on reflection decision
    const routingDecision = routeAfterReflection(reflectedState, triage, events);
    
    // Handle rerun_checks routing
    if (routingDecision === 'rerun_checks') {
      console.log('[Flow2/Routing] Reflection triggered rerun of parallel checks');
      
      // Add routing trace event
      events.push({
        node: 'routing_decision',
        status: 'executed',
        decision: 'Rerouting to parallel checks based on reflection',
        reason: `nextAction=${reflectedState.nextAction}, replanCount=${reflectedState.reflection?.replanCount ?? 0}`,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: 0
      });
      
      // Re-execute parallel checks (EXACTLY ONCE due to max 1 replan)
      const rerunExecution = await executeParallelChecks(topicSections, triage.routePath);
      
      // Merge rerun events into main trace
      events.push(...rerunExecution.events);
      
      // Update state with rerun results
      reflectedState.conflicts = rerunExecution.conflicts;
      reflectedState.coverageGaps = rerunExecution.coverageGaps;
      
      // VERIFIED: convertToIssues is defined in orchestrator.ts lines 312-364
      // ExecutionResult has NO issues field (executor.ts lines 10-15)
      const rerunIssues = convertToIssues(rerunExecution, topicSections);
      reflectedState.issues = rerunIssues;
      
      console.log(`[Flow2/Routing] Rerun complete: ${rerunIssues.length} issues`);
      
      // After rerun, NO second reflection - proceed to human gate check or finalize
    }
    
    // Determine if human gate required (after potential rerun)
    const requiresHumanGate = 
      triage.routePath === 'human_gate' ||  // Triage mandatory
      triage.riskScore > 80 ||              // High risk
      routingDecision === 'human_gate';     // Reflection requested human
    
    if (requiresHumanGate && !state.humanDecision) {
      // MILESTONE C: Enforce max 1 gate
      console.log('[Flow2] Human gate required (Milestone C: max 1 gate)');
      
      // Generate runId if not provided
      const currentRunId = runId || `kyc_run_${Date.now()}`;
      
      // Save state for resume
      graphResumeStore.save(currentRunId, {
        topicSections,
        triageResult: {
          routePath: triage.routePath,
          riskScore: triage.riskScore,
          riskBreakdown: triage.riskBreakdown,
          triageReasons: triage.triageReasons
        },
        previousEvents: events
      });
      
      console.log('[Flow2] Saved state for runId:', currentRunId);
      
      // Create resume token (JSON string, NOT base64)
      const resumeTokenStr = JSON.stringify({
        runId: currentRunId,
        gateId: 'human_gate',
        createdAt: Date.now()
      });
      
      // Add waiting event
      events.push({
        node: 'human_gate',
        status: 'waiting',
        decision: 'Human decision required',
        reason: `Risk score ${triage.riskScore} exceeds threshold`,
        startedAt: new Date().toISOString()
      });
      
      return {
        issues: [],
        topicSections,
        conflicts: [], // Empty until human decision
        coverageGaps: [], // Empty until human decision
        graphReviewTrace: {
          events,
          summary: {
            path: triage.routePath,
            riskScore: triage.riskScore,
            riskBreakdown: triage.riskBreakdown,
            coverageMissingCount: 0,
            conflictCount: 0
          },
          skillInvocations // Phase A: Include skill invocations in trace
        },
        humanGate: {
          required: true,
          prompt: `KYC review flagged high risk (score: ${triage.riskScore}). Please review and decide:`,
          options: ['approve_edd', 'request_docs', 'reject']
        },
        resumeToken: resumeTokenStr // NEW: Return token for frontend
      };
    }
    
    // Step 5: Convert to issues format (compatible with Flow1 UI)
    // Use rerun execution if rerouting occurred, otherwise use first execution
    const finalExecution = (routingDecision === 'rerun_checks') ? 
      { conflicts: reflectedState.conflicts, coverageGaps: reflectedState.coverageGaps, policyFlags: [] as string[], events: [] } :
      execution;
    
    const issues = (routingDecision === 'rerun_checks' && reflectedState.issues) ?
      reflectedState.issues : // Already generated during rerun
      convertToIssues(execution, topicSections); // Generate from first execution
    
    events.push({
      node: 'finalize',
      status: 'executed',
      decision: `Generated ${issues.length} issues`,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 2
    });
    
    return {
      issues,
      topicSections,
      conflicts: finalExecution.conflicts, // Use final (possibly rerun) conflicts
      coverageGaps: finalExecution.coverageGaps, // Use final (possibly rerun) gaps
      graphReviewTrace: {
        events,
        summary: {
          path: triage.routePath,
          riskScore: triage.riskScore,
          riskBreakdown: triage.riskBreakdown, // NEW: Breakdown
          coverageMissingCount: execution.coverageGaps.filter(g => g.status === 'missing').length,
          conflictCount: execution.conflicts.length
        },
        skillInvocations // Phase A: Include skill invocations in trace
      }
    };
  } catch (error) {
    console.error('[Flow2] Error during graph execution:', error);
    
    events.push({
      node: 'error_handler',
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      issues: [],
      graphReviewTrace: {
        events,
        summary: {
          path: 'fast',
          riskScore: 0,
          coverageMissingCount: 0,
          conflictCount: 0
        },
        degraded: true,
        skillInvocations // Phase A: Include skill invocations even in error case
      }
    };
  }
}

/**
 * Phase 1.5: Route after reflection based on nextAction
 */
type RoutingDecision = 'rerun_checks' | 'human_gate' | 'continue';

function routeAfterReflection(
  reflectedState: Flow2State,
  triage: { routePath: string; riskScore: number },
  events: GraphTraceEvent[]
): RoutingDecision {
  // If reflection disabled or no action, continue
  if (!reflectedState.features?.reflection || !reflectedState.nextAction) {
    return 'continue';
  }
  
  console.log(`[Flow2/Routing] nextAction=${reflectedState.nextAction}, replanCount=${reflectedState.reflection?.replanCount ?? 0}`);
  
  // Map nextAction to routing decision (using STORED values from reflect.ts line 204)
  switch (reflectedState.nextAction) {
    case 'rerun_batch_review':
      // Safety: Only allow rerun if replanCount <= 1
      if ((reflectedState.reflection?.replanCount ?? 0) > 1) {
        console.error('[Flow2/Routing] SAFETY: Prevented second rerun (replanCount>1); forcing continue');
        return 'continue';
      }
      return 'rerun_checks';
    
    case 'ask_human_for_scope':
      return 'human_gate';
    
    case 'section_review':
      // Section review not implemented; fallback to human gate
      console.warn('[Flow2/Routing] section_review not implemented; routing to human_gate');
      events.push({
        node: 'routing_decision',
        status: 'executed',
        decision: 'Section review requested but not implemented',
        reason: 'Fallback to human gate for manual scope decision',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: 0
      });
      return 'human_gate';
    
    case 'tighten_policy':
      // Policy tightening not implemented; continue with current results
      console.warn('[Flow2/Routing] tighten_policy not implemented; continuing with current results');
      events.push({
        node: 'routing_decision',
        status: 'executed',
        decision: 'Policy tightening requested but not implemented',
        reason: 'Continuing with current policy settings',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: 0
      });
      return 'continue';
    
    case 'skip':
    default:
      return 'continue';
  }
}

/**
 * Convert execution results to issues format (Flow1 compatible)
 */
function convertToIssues(execution: any, topicSections: any[]): any[] {
  const issues: any[] = [];
  
  // Coverage gaps → FAIL issues
  execution.coverageGaps.forEach((gap: any) => {
    if (gap.status === 'missing') {
      issues.push({
        id: `gap-${gap.topicId}`,
        sectionId: `topic-${gap.topicId}`,
        severity: 'FAIL',
        title: `Missing KYC Topic: ${gap.topicId}`,
        message: gap.reason || 'Required information not found in documents',
        agent: { id: 'gap_collector', name: 'Coverage Analyzer' }
      });
    } else if (gap.status === 'partial') {
      issues.push({
        id: `gap-${gap.topicId}`,
        sectionId: `topic-${gap.topicId}`,
        severity: 'WARNING',
        title: `Incomplete KYC Topic: ${gap.topicId}`,
        message: gap.reason || 'Insufficient detail provided',
        agent: { id: 'gap_collector', name: 'Coverage Analyzer' }
      });
    }
  });
  
  // Conflicts → FAIL issues
  execution.conflicts.forEach((conflict: any, idx: number) => {
    issues.push({
      id: `conflict-${idx}`,
      sectionId: `topic-${conflict.topicIds[0]}`,
      severity: 'FAIL',
      title: 'Contradicting Information Detected',
      message: conflict.description,
      evidence: conflict.evidenceRefs.map((ref: any) => ref.snippet).join('\n\n'),
      agent: { id: 'conflict_sweep', name: 'Conflict Detector' }
    });
  });
  
  // Policy flags → WARNING issues
  execution.policyFlags.forEach((flag: string) => {
    issues.push({
      id: `flag-${flag}`,
      sectionId: 'topic-risk_profile',
      severity: 'WARNING',
      title: `Policy Flag: ${flag}`,
      message: `This case has been flagged for: ${flag.replace(/_/g, ' ').toLowerCase()}`,
      agent: { id: 'policy_flags_check', name: 'Policy Compliance' }
    });
  });
  
  return issues;
}


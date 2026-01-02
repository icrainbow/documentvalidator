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
// Phase 3: Import graph artifacts and utilities
import { flow2GraphV1 } from '../graphs/flow2GraphV1';
import { flow2GraphV1_0_1 } from '../graphs/flow2GraphV1_0_1';
import { computeGraphDiff } from '../graphs/graphUtils';
// Phase 2 HITL: Import checkpoint infrastructure
import { saveCheckpoint, loadCheckpoint } from '../flow2/checkpointStore';
import { executeHumanReviewNode } from './nodes/humanReviewNode';
import type { Flow2Checkpoint } from '../flow2/checkpointTypes';
import { randomUUID } from 'crypto';
// Phase 7-9: Import risk assessment module
import { assessKYCRisks, type RiskSignal } from './riskAssessment';

/**
 * Phase 3: Attach graph metadata to response
 * 
 * Always includes: graph metadata (graphId, version, checksum)
 * Conditionally includes: graphDefinition, graphDiff
 * 
 * Gating logic: Include definition when NODE_ENV !== 'production' OR INCLUDE_GRAPH_DEFINITION='true'
 */
function attachGraphMetadata(baseTrace: any): any {
  // Always include graph metadata (minimal overhead)
  const graphMetadata: any = {
    graph: {
      graphId: flow2GraphV1.graphId,
      version: flow2GraphV1.version,
      checksum: flow2GraphV1.checksum // Use precomputed checksum (Constraint #2)
    }
  };
  
  // Include full definition when not in production
  const shouldIncludeDefinition = 
    process.env.NODE_ENV !== 'production' || 
    process.env.INCLUDE_GRAPH_DEFINITION === 'true';
  
  if (shouldIncludeDefinition) {
    graphMetadata.graphDefinition = flow2GraphV1;
    
    // Demo: Include diff if comparing versions
    if (process.env.DEMO_GRAPH_DIFF === 'true') {
      graphMetadata.graphDiff = computeGraphDiff(flow2GraphV1, flow2GraphV1_0_1);
    }
  }
  
  return {
    ...baseTrace,
    ...graphMetadata
  };
}

/**
 * Run LangGraph KYC review
 * 
 * Phase 2 HITL: Support pause/resume with checkpoints
 * 
 * Modes:
 * - 'run': Start fresh execution (generates new run_id)
 * - 'resume': Continue from checkpoint (requires checkpoint_run_id)
 * 
 * Flow:
 * 1. If mode='resume': load checkpoint, inject human decision, resume from paused node
 * 2. If mode='run': assemble topics → triage → parallel checks → human review (may pause)
 * 3. If human_review pauses: save checkpoint, return {status: 'waiting_human'}
 * 4. Continue: reflection → finalize → return issues + trace
 */
export async function runGraphKycReview(
  state: GraphState,
  runId?: string,
  resumeToken?: string,
  features?: { reflection?: boolean; negotiation?: boolean; memory?: boolean; remote_skills?: boolean },
  mode?: 'run' | 'resume',
  checkpoint_run_id?: string
): Promise<GraphReviewResponse> {
  const events: GraphTraceEvent[] = [];
  const skillInvocations: SkillInvocation[] = []; // Phase A: Initialize skill invocations array
  const startTime = Date.now();
  
  // Phase 2 HITL: Determine execution mode
  const executionMode = mode || 'run';
  let currentRunId = runId || randomUUID();
  let checkpoint: Flow2Checkpoint | null = null;
  let resumedFromCheckpoint = false;
  
  // Phase 2 HITL: Resume from checkpoint if mode === 'resume'
  if (executionMode === 'resume' && checkpoint_run_id) {
    console.log(`[Flow2/HITL] RESUME mode: loading checkpoint ${checkpoint_run_id}`);
    
    checkpoint = await loadCheckpoint(checkpoint_run_id);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpoint_run_id}`);
    }
    
    if (checkpoint.status !== 'paused') {
      throw new Error(`Cannot resume checkpoint with status: ${checkpoint.status}`);
    }
    
    // Restore state from checkpoint
    currentRunId = checkpoint.run_id;
    resumedFromCheckpoint = true;
    
    // Inject human decision into state
    if (state.humanDecision) {
      console.log(`[Flow2/HITL] Injecting human decision from checkpoint API`);
      (checkpoint.graph_state as any).checkpoint_human_decision = state.humanDecision;
    }
    
    // Add resume event to trace
    events.push({
      node: 'execution_resumed',
      status: 'executed',
      reason: `Resumed from checkpoint at ${checkpoint.paused_at_node_id}`,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 0
    });
  }
  
  // Phase 0: Initialize Flow2 state with feature flags
  const flow2State = resumedFromCheckpoint && checkpoint 
    ? (checkpoint.graph_state as any as Flow2State)
    : createDefaultFlow2State(state.documents);
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
        reason: `Decision by human reviewer`,
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
        graphReviewTrace: attachGraphMetadata({
          events,
          summary: {
            path: storedState.triageResult.routePath as any,
            riskScore: storedState.triageResult.riskScore,
            riskBreakdown: storedState.triageResult.riskBreakdown as any,
            coverageMissingCount: execution.coverageGaps.filter(g => g.status === 'missing').length,
            conflictCount: execution.conflicts.length
          },
          skillInvocations // Phase A: Include skill invocations in trace
        })
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
    
    // Step 3.5: Assess KYC Risks (LLM-first + fallback guardrail)
    console.log('[Flow2] Step 3.5: Assessing KYC risks (LLM-first + fallback)');
    const riskAssessmentStart = Date.now();
    
    const riskAssessment = await assessKYCRisks(
      state.documents,
      topicSections,
      { 
        enableFallback: process.env.FLOW2_DEMO_GUARDRAIL === '1' || 
                       process.env.NODE_ENV === 'development' || 
                       process.env.NODE_ENV === 'test'
      }
    );
    
    console.log(`[Flow2/Risk] Assessment complete: ${riskAssessment.signals.length} signal(s), ` +
                `requires_human_review=${riskAssessment.requires_human_review}, ` +
                `source=${riskAssessment.source}`);
    
    // Add risk assessment trace event
    events.push({
      node: 'risk_assessment',
      status: 'executed',
      decision: `Found ${riskAssessment.signals.length} risk signal(s) via ${riskAssessment.source}`,
      reason: riskAssessment.execution_path,
      startedAt: new Date(riskAssessmentStart).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - riskAssessmentStart,
      outputsSummary: `${riskAssessment.signals.length} signals, human_review=${riskAssessment.requires_human_review}`
    });
    
    // Convert risk signals to issues (BEFORE humanReviewNode sees them)
    const riskIssues = riskAssessment.signals.map((signal, idx) => ({
      id: `kyc-risk-${idx}`,
      sectionId: 'topic-risk_profile',
      category: signal.category,
      severity: signal.severity === 'HIGH' ? 'FAIL' : 'WARNING',
      title: signal.title,
      message: signal.description,
      evidence: signal.evidence.join('\n\n'),
      agent: { 
        id: 'risk_assessor', 
        name: 'KYC Risk Analyzer',
        source: signal.source 
      }
    }));
    
    console.log(`[Flow2/Risk] Generated ${riskIssues.length} issue(s) from risk signals`);
    
    // Inject into state for humanReviewNode gating
    flow2State.requires_human_review = riskAssessment.requires_human_review;
    flow2State.kyc_risk_signals = riskAssessment.signals as any;
    
    // Phase 2 HITL: Human Review Node (after parallel checks, before reflection)
    // Skip if resuming from checkpoint (already completed this node)
    if (!resumedFromCheckpoint || (checkpoint && checkpoint.paused_at_node_id === 'human_review')) {
      console.log('[Flow2/HITL] Executing human_review node');
      
      // Prepare state with risk issues for gating logic
      const stateForHumanReview = {
        ...state,
        ...flow2State,
        issues: riskIssues, // Include risk issues for gating
        requires_human_review: riskAssessment.requires_human_review
      } as any as GraphState;
      
      const humanReviewResult = executeHumanReviewNode({
        state: stateForHumanReview
      });
      
      if (humanReviewResult.pauseExecution) {
        // PAUSE: Save checkpoint and return waiting_human status
        console.log(`[Flow2/HITL] PAUSE at human_review: ${humanReviewResult.reason}`);
        
        // Phase 4: Generate approval token FIRST
        const { randomBytes } = await import('crypto');
        const approval_token = randomBytes(16).toString('hex'); // 32 chars
        const approval_email_to = process.env.FLOW2_APPROVER_EMAIL || 'admin@example.com';
        const base_url = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        // Create checkpoint with token (BEFORE email send)
        const pauseCheckpoint: Flow2Checkpoint = {
          run_id: currentRunId,
          graph_id: flow2GraphV1.graphId,
          flow: 'flow2',
          current_node_id: 'parallel_checks', // Last completed
          paused_at_node_id: 'human_review',
          graph_state: {
            ...state,
            ...flow2State,
            conflicts: execution.conflicts,
            coverageGaps: execution.coverageGaps,
            topicSections
          } as any as GraphState,
          documents: state.documents.map((d, idx) => ({
            doc_id: `doc-${idx}`,
            filename: d.name,
            text: d.content,
            doc_type_hint: 'kyc_form' as any
          })),
          created_at: new Date().toISOString(),
          paused_at: new Date().toISOString(),
          status: 'paused',
          
          // Phase 4: Approval metadata (set before email)
          approval_token,
          approval_email_to,
          approval_email_sent: false, // Will be set true after successful send
          reminder_email_sent: false,
        };
        
        // Save checkpoint FIRST (critical for web approval links to work)
        await saveCheckpoint(pauseCheckpoint);
        console.log(`[Flow2/HITL] Checkpoint saved: ${currentRunId}`);
        
        // Phase 4: Send approval email (with attachment)
        let emailSent = false;
        let messageId: string | undefined;
        let emailSubject: string | undefined;
        
        try {
          const { sendApprovalEmail } = await import('../email/smtpAdapter');
          
          const emailResult = await sendApprovalEmail({
            run_id: currentRunId,
            approval_token,
            recipient: approval_email_to,
            checkpoint: pauseCheckpoint,
            base_url,
          });
          
          emailSent = true;
          messageId = emailResult.messageId;
          emailSubject = `[Flow2 Approval] Review Required - Run ${currentRunId.slice(0, 8)}`;
          
          console.log(`[Flow2/HITL] Approval email sent to ${approval_email_to} (${messageId})`);
        } catch (error: any) {
          console.error('[Flow2/HITL] Failed to send approval email:', error.message);
          // Non-critical: user can still approve via web UI or manual trigger
          // Continue execution to return waiting_human status
        }
        
        // Phase 4: Update checkpoint with email metadata (if sent successfully)
        if (emailSent) {
          const now = new Date().toISOString();
          const reminderDueAt = new Date(Date.now() + 180000).toISOString(); // +3 minutes
          
          pauseCheckpoint.approval_email_sent = true;
          pauseCheckpoint.approval_sent_at = now;
          pauseCheckpoint.approval_message_id = messageId;
          pauseCheckpoint.approval_email_subject = emailSubject;
          pauseCheckpoint.reminder_due_at = reminderDueAt;
          
          try {
            await saveCheckpoint(pauseCheckpoint); // Overwrite with email metadata
            console.log(`[Flow2/HITL] Checkpoint updated with email metadata`);
          } catch (error: any) {
            console.error('[Flow2/HITL] Failed to update checkpoint with email metadata:', error);
            // Non-critical: checkpoint exists with token, email was sent
          }
        }
        
        // Add pause event to trace
        events.push({
          node: 'human_review',
          status: 'waiting',
          reason: humanReviewResult.reason,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: 0
        });
        
        // Return waiting_human response (with proper graphReviewTrace structure)
        // Phase 7-9: Include risk issues in response
        const allIssuesForPause = convertToIssues(execution, topicSections, riskIssues);
        
        return {
          status: 'waiting_human' as const,
          run_id: currentRunId,
          paused_at_node: 'human_review',
          reason: humanReviewResult.reason,
          issues: allIssuesForPause, // Phase 7-9: Include all issues (risk + gaps + conflicts + flags)
          topicSections: flow2State.topicSections || [],
          conflicts: execution.conflicts,
          coverageGaps: execution.coverageGaps,
          checkpoint_metadata: {
            run_id: currentRunId,
            status: 'paused' as const,
            paused_at_node_id: 'human_review',
            paused_reason: humanReviewResult.reason,
            document_count: state.documents.length,
            created_at: pauseCheckpoint.created_at,
            paused_at: pauseCheckpoint.paused_at,
            // Phase 4: Include email metadata in response
            approval_email_sent: pauseCheckpoint.approval_email_sent,
            approval_sent_at: pauseCheckpoint.approval_sent_at,
            approval_email_to: pauseCheckpoint.approval_email_to,
            reminder_due_at: pauseCheckpoint.reminder_due_at,
          } as any,
          graphReviewTrace: attachGraphMetadata({
            events,
            summary: {
              path: triage.routePath,
              riskScore: triage.riskScore,
              riskBreakdown: triage.riskBreakdown,
              coverageMissingCount: 0, // Not yet calculated
              conflictCount: execution.conflicts.length
            },
            skillInvocations
          })
        };
      }
      
      // Continue: human decision approved/rejected
      console.log(`[Flow2/HITL] human_review node: ${state.humanDecision?.decision}`);
      
      // Add completion event
      events.push({
        node: 'human_review',
        status: 'executed',
        decision: (state as any).checkpoint_human_decision?.decision,
        reason: (state as any).checkpoint_human_decision?.comment || 'Human decision received',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: 0
      });
      
      // Check if rejected
      if (humanReviewResult.state.execution_terminated) {
        console.log('[Flow2/HITL] Execution terminated by human rejection');
        
        const issues = convertToIssues(execution, topicSections, riskIssues);
        
        return attachGraphMetadata({
          status: 'terminated' as const,
          run_id: currentRunId,
          reason: 'Rejected by human reviewer',
          issues,
          trace: events,
          conflicts: execution.conflicts,
          coverageGaps: execution.coverageGaps,
          skillInvocations
        });
      }
    }
    
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
      
      // Generate runId if not provided (use proper UUID format)
      const legacyRunId = runId || randomUUID();
      
      // Save state for resume
      graphResumeStore.save(legacyRunId, {
        topicSections,
        triageResult: {
          routePath: triage.routePath,
          riskScore: triage.riskScore,
          riskBreakdown: triage.riskBreakdown,
          triageReasons: triage.triageReasons
        },
        previousEvents: events
      });
      
      console.log('[Flow2] Saved state for runId:', legacyRunId);
      
      // Create resume token (JSON string, NOT base64)
      const resumeTokenStr = JSON.stringify({
        runId: legacyRunId,
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
        graphReviewTrace: attachGraphMetadata({
          events,
          summary: {
            path: triage.routePath,
            riskScore: triage.riskScore,
            riskBreakdown: triage.riskBreakdown,
            coverageMissingCount: 0,
            conflictCount: 0
          },
          skillInvocations // Phase A: Include skill invocations in trace
        }),
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
      convertToIssues(execution, topicSections, riskIssues); // Generate from first execution
    
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
      graphReviewTrace: attachGraphMetadata({
        events,
        summary: {
          path: triage.routePath,
          riskScore: triage.riskScore,
          riskBreakdown: triage.riskBreakdown, // NEW: Breakdown
          coverageMissingCount: execution.coverageGaps.filter(g => g.status === 'missing').length,
          conflictCount: execution.conflicts.length
        },
        skillInvocations // Phase A: Include skill invocations in trace
      })
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
      graphReviewTrace: attachGraphMetadata({
        events,
        summary: {
          path: 'fast',
          riskScore: 0,
          coverageMissingCount: 0,
          conflictCount: 0
        },
        degraded: true,
        skillInvocations // Phase A: Include skill invocations even in error case
      })
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
function convertToIssues(execution: any, topicSections: any[], riskIssues?: any[]): any[] {
  const issues: any[] = [];
  
  // NEW Phase 7-9: KYC risk issues (from risk assessment node) - HIGHEST PRIORITY
  if (riskIssues && riskIssues.length > 0) {
    issues.push(...riskIssues);
    console.log(`[Flow2/Issues] Added ${riskIssues.length} KYC risk issue(s)`);
  }
  
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


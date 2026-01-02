/**
 * Orchestrate API Endpoint
 * POST /api/orchestrate - Execute multi-agent compliance review workflow
 * 
 * Stage 3.5: Enhanced with batch_review mode
 * Flow2: Added langgraph_kyc mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { orchestrate } from '../../lib/orchestrator/orchestrate';
import { OrchestrateRequest } from '../../lib/orchestrator/types';
import { planReviewScope, validateScopePlan } from '../../lib/scopePlanner';
import { runGlobalChecks, getGlobalChecksSummary } from '../../lib/globalChecks';
import { callClaudeForReview } from '../../lib/llmReviewExecutor';
import {
  validateSectionIds,
  sectionsToScopePlannerFormat,
  normalizeScopePlanForApi,
  type ScopePlanApi,
} from '../../lib/sectionIdNormalizer';
import type {
  DirtyQueue,
  ScopePlan,
  GlobalCheckResult,
} from '../../lib/types/scopePlanning';
import type { Section, Issue, Remediation } from '../../lib/types/review';
import type { ReviewConfig } from '../../lib/reviewConfig';

// Flow2 imports
import { runGraphKycReview } from '../../lib/graphKyc/orchestrator';
import type { GraphState } from '../../lib/graphKyc/types';

/**
 * Request for batch review mode
 */
interface BatchReviewRequest {
  mode: 'batch_review';
  documentId: string;
  dirtyQueue: DirtyQueue;
  sections: Section[];
  config?: ReviewConfig;
}

/**
 * Response for batch review mode
 */
interface BatchReviewResponse {
  issues: Issue[];
  remediations?: Remediation[];
  reviewedAt: string;
  runId: string;
  scopePlan?: ScopePlanApi;
  globalCheckResults?: GlobalCheckResult[];
  timing?: {
    scopePlanningMs: number;
    reviewMs: number;
    globalChecksMs: number;
    totalMs: number;
    llmAttempted: boolean;
    llmSucceeded: boolean;
  };
  fallbacks?: string[];
  degraded?: boolean;
}

/**
 * Create minimal fallback scope plan (section-only, dirty sections only, compliance only)
 * NEVER escalates scope.
 */
function createFallbackScopePlan(sanitizedQueue: DirtyQueue, sections: Section[]): ScopePlan {
  const dirtySectionIds = sanitizedQueue.entries.map(e => e.sectionId).sort((a, b) => a - b);
  
  return {
    reviewMode: 'section-only',
    reasoning: 'Fallback: reviewing only dirty sections with minimal agents (scope planning unavailable)',
    sectionsToReview: dirtySectionIds,
    relatedSectionsToCheck: [],
    agentsToInvoke: ['compliance'], // Minimal: compliance only
    globalChecks: [], // No global checks in fallback (fail-safe)
    estimatedDuration: `${dirtySectionIds.length * 5}-${dirtySectionIds.length * 10} seconds`,
    confidence: 0.5, // Low confidence for fallback
  };
}

/**
 * Handle batch_review mode with scope planning and fallbacks
 */
async function handleBatchReview(
  request: NextRequest,
  body: BatchReviewRequest
): Promise<NextResponse> {
  const startTime = Date.now();
  const fallbacks: string[] = [];
  let degraded = false;
  
  try {
    // ============================================================
    // STEP 1: VALIDATE INPUT
    // ============================================================
    if (!body.documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }
    
    if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
      return NextResponse.json(
        { error: 'sections array is required and must not be empty' },
        { status: 400 }
      );
    }
    
    if (!body.dirtyQueue) {
      return NextResponse.json(
        { error: 'dirtyQueue is required for batch_review mode' },
        { status: 400 }
      );
    }
    
    console.log(`[orchestrate/batch] Starting batch review for document ${body.documentId}`);
    console.log(`[orchestrate/batch] Dirty sections:`, body.dirtyQueue.entries.map(e => e.sectionId));
    
    // ============================================================
    // STEP 2: VALIDATE AND SANITIZE SECTION IDS
    // ============================================================
    const idValidation = validateSectionIds(body.dirtyQueue, body.sections);
    if (!idValidation.valid) {
      console.warn('[orchestrate/batch] Invalid section IDs detected:', idValidation.errors);
      fallbacks.push(`Sanitized dirtyQueue: ${idValidation.errors.join('; ')}`);
      degraded = true;
    }
    
    // Use sanitized queue (invalid entries removed)
    const sanitizedQueue = idValidation.sanitizedQueue;
    
    if (sanitizedQueue.entries.length === 0) {
      console.warn('[orchestrate/batch] No valid dirty sections after sanitization');
      return NextResponse.json({
        issues: [],
        remediations: [],
        reviewedAt: new Date().toISOString(),
        runId: `batch-empty-${Date.now()}`,
        scopePlan: {
          reviewMode: 'section-only',
          reasoning: 'No valid dirty sections to review',
          sectionsToReview: [],
          relatedSectionsToCheck: [],
          agentsToInvoke: [],
          globalChecks: [],
          estimatedDuration: '0s',
          confidence: 1.0,
        } as ScopePlanApi,
        globalCheckResults: [],
        timing: {
          scopePlanningMs: 0,
          reviewMs: 0,
          globalChecksMs: 0,
          totalMs: Date.now() - startTime,
          llmAttempted: false,
          llmSucceeded: false,
        },
        fallbacks: [`All dirty sections invalid: ${idValidation.errors.join('; ')}`],
        degraded: true,
      } as BatchReviewResponse);
    }
    
    // ============================================================
    // STEP 3: PLAN REVIEW SCOPE
    // ============================================================
    const scopeStart = Date.now();
    let scopePlan: ScopePlan;
    
    try {
      const scopePlanningResult = planReviewScope({
        dirtyQueue: sanitizedQueue,
        allSections: sectionsToScopePlannerFormat(body.sections),
      });
      scopePlan = scopePlanningResult.scopePlan;
      
      // Validate scope plan
      const validation = validateScopePlan(scopePlan, body.sections.length);
      if (!validation.valid) {
        console.error('[orchestrate/batch] Invalid scope plan:', validation.errors);
        fallbacks.push(`Invalid scope plan: ${validation.errors.join('; ')}. Using fallback.`);
        degraded = true;
        
        // FALLBACK: minimal conservative scope (section-only, dirty sections only)
        scopePlan = createFallbackScopePlan(sanitizedQueue, body.sections);
      }
    } catch (error) {
      console.error('[orchestrate/batch] Scope planning failed:', error);
      fallbacks.push(`Scope planning failed: ${error instanceof Error ? error.message : 'Unknown error'}. Using fallback.`);
      degraded = true;
      
      // FALLBACK: minimal conservative scope
      scopePlan = createFallbackScopePlan(sanitizedQueue, body.sections);
    }
    
    const scopePlanningMs = Date.now() - scopeStart;
    
    console.log('[orchestrate/batch] Scope plan:', scopePlan.reviewMode);
    console.log('[orchestrate/batch] Sections to review:', scopePlan.sectionsToReview);
    console.log('[orchestrate/batch] Global checks:', scopePlan.globalChecks);
    
    // ============================================================
    // STEP 4: EXECUTE LLM REVIEW
    // ============================================================
    const reviewStart = Date.now();
    let agentResult: { issues: Issue[]; remediations?: Remediation[] };
    let llmAttempted = false;
    let llmSucceeded = false;
    
    try {
      // Determine executor mode based on scope plan
      let executorMode: 'section' | 'document';
      if (scopePlan.reviewMode === 'section-only') {
        executorMode = 'section';
      } else {
        // cross-section or full-document → use document mode
        executorMode = 'document';
      }
      
      // Build sections array for review
      let sectionsToReview: Section[];
      if (scopePlan.reviewMode === 'full-document') {
        sectionsToReview = body.sections;
      } else {
        // section-only or cross-section
        const allTargetIds = [
          ...scopePlan.sectionsToReview,
          ...scopePlan.relatedSectionsToCheck,
        ];
        const targetStringIds = allTargetIds.map(id => `section-${id}`);
        sectionsToReview = body.sections.filter(s => targetStringIds.includes(s.id));
      }
      
      console.log('[orchestrate/batch] Calling LLM executor:', executorMode, 'mode');
      llmAttempted = true;
      
      agentResult = await callClaudeForReview(
        sectionsToReview,
        executorMode,
        undefined, // no single sectionId for batch
        body.config
      );
      
      llmSucceeded = true;
      console.log('[orchestrate/batch] LLM review succeeded:', agentResult.issues.length, 'issues');
    } catch (error) {
      console.error('[orchestrate/batch] LLM review failed:', error);
      fallbacks.push(`LLM review failed: ${error instanceof Error ? error.message : 'Unknown error'}. Returning empty issues.`);
      degraded = true;
      
      // FALLBACK: empty issues (fail-safe, still run global checks)
      agentResult = { issues: [], remediations: [] };
    }
    
    const reviewMs = Date.now() - reviewStart;
    
    // ============================================================
    // STEP 5: RUN GLOBAL CHECKS
    // ============================================================
    let globalCheckResults: GlobalCheckResult[] = [];
    let checksStart = Date.now();
    let globalChecksMs = 0;
    
    if (scopePlan.globalChecks && scopePlan.globalChecks.length > 0) {
      console.log('[orchestrate/batch] Running', scopePlan.globalChecks.length, 'global check(s)');
      
      const { results, failedChecks } = runGlobalChecks(
        scopePlan.globalChecks,
        sectionsToScopePlannerFormat(body.sections)
      );
      
      globalCheckResults = results;
      globalChecksMs = Date.now() - checksStart;
      
      if (failedChecks.length > 0) {
        fallbacks.push(`Some global checks failed: ${failedChecks.join(', ')}`);
        degraded = true;
      }
      
      const checksSummary = getGlobalChecksSummary(globalCheckResults);
      console.log('[orchestrate/batch] Global checks:', checksSummary.overallStatus);
    }
    
    // ============================================================
    // STEP 6: ASSEMBLE RESPONSE
    // ============================================================
    const totalMs = Date.now() - startTime;
    
    const response: BatchReviewResponse = {
      issues: agentResult.issues,
      remediations: agentResult.remediations,
      reviewedAt: new Date().toISOString(),
      runId: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      scopePlan: normalizeScopePlanForApi(scopePlan),
      globalCheckResults,
      timing: {
        scopePlanningMs,
        reviewMs,
        globalChecksMs,
        totalMs,
        llmAttempted,
        llmSucceeded,
      },
      fallbacks: fallbacks.length > 0 ? fallbacks : undefined,
      degraded: degraded || undefined,
    };
    
    console.log(`[orchestrate/batch] Batch review completed: ${response.issues.length} issues, ${totalMs}ms total`);
    if (degraded) {
      console.warn('[orchestrate/batch] Response includes fallback behavior:', fallbacks);
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[orchestrate/batch] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Batch review failed',
        details: error.message || 'Unknown error',
        issues: [],
        remediations: [],
        reviewedAt: new Date().toISOString(),
        runId: `error-${Date.now()}`,
        fallbacks: ['Fatal error during batch review'],
        degraded: true,
      } as BatchReviewResponse,
      { status: 500 }
    );
  }
}

/**
 * Flow2: Handle LangGraph KYC mode
 */
async function handleLangGraphKyc(
  request: NextRequest,
  body: LangGraphKycRequest
): Promise<NextResponse> {
  console.log('[Flow2/API] Handling LangGraph KYC request');
  
  try {
    // Phase 3 HITL: Handle checkpoint resume mode
    const executionMode = body.execution_mode || 'run';
    
    if (executionMode === 'resume') {
      // Validate resume requirements
      if (!body.checkpoint_run_id) {
        return NextResponse.json(
          { error: 'checkpoint_run_id is required for resume mode' },
          { status: 400 }
        );
      }
      
      if (!body.checkpoint_human_decision) {
        return NextResponse.json(
          { error: 'checkpoint_human_decision is required for resume mode' },
          { status: 400 }
        );
      }
      
      console.log(`[Flow2/API] RESUME mode: checkpoint_run_id=${body.checkpoint_run_id}`);
    }
    
    // Validate documents for run mode
    if (executionMode === 'run') {
      if (!body.documents || body.documents.length === 0) {
        return NextResponse.json(
          { 
            error: 'documents array is required for run mode',
            error_code: 'MISSING_DOCUMENTS'
          },
          { status: 400 }
        );
      }
      
      // CRITICAL: Validate document content (堵死空跑路径)
      for (let i = 0; i < body.documents.length; i++) {
        const doc = body.documents[i];
        
        if (!doc.name || typeof doc.name !== 'string') {
          return NextResponse.json(
            {
              error: `Document at index ${i} is missing 'name' field`,
              error_code: 'INVALID_DOCUMENT_NAME'
            },
            { status: 400 }
          );
        }
        
        if (typeof doc.content !== 'string') {
      return NextResponse.json(
            {
              error: `Document "${doc.name}" is missing 'content' field or content is not a string`,
              error_code: 'MISSING_DOCUMENT_CONTENT'
            },
        { status: 400 }
      );
        }
        
        const trimmedContent = doc.content.trim();
        if (trimmedContent.length < 20) {
          return NextResponse.json(
            {
              error: `Document "${doc.name}" has empty or insufficient content (length: ${trimmedContent.length}, minimum: 20 characters)`,
              error_code: 'EMPTY_DOCUMENT_CONTENT',
              document_name: doc.name,
              content_length: trimmedContent.length
            },
            { status: 400 }
          );
        }
      }
      
      // DEBUG logging (controlled by env)
      if (process.env.FLOW2_DEBUG === '1') {
        console.log(`[Flow2/DEBUG] Documents received: ${body.documents.length}`);
        body.documents.forEach((doc, idx) => {
          console.log(`[Flow2/DEBUG] Doc[${idx}] name: "${doc.name}"`);
          console.log(`[Flow2/DEBUG] Doc[${idx}] content length: ${doc.content.length}`);
          console.log(`[Flow2/DEBUG] Doc[${idx}] content preview (first 120 chars):`, 
            doc.content.substring(0, 120).replace(/\n/g, '\\n'));
        });
      }
    }
    
    // Build graph state
    const graphState: GraphState = {
      documents: body.documents || [],
      dirtyTopics: body.dirtyTopics as any,
      humanDecision: body.humanDecision || body.checkpoint_human_decision as any
    };
    
    // Phase 0 + 1: Parse features (default OFF)
    const features = {
      reflection: body.features?.reflection || false,
      negotiation: body.features?.negotiation || false,
      memory: body.features?.memory || false,
    };
    
    console.log('[Flow2/API] Features:', features);
    
    // Execute graph with checkpoint support
    const result = await runGraphKycReview(
      graphState,
      body.runId,
      body.resumeToken,
      features,
      executionMode,
      body.checkpoint_run_id
    );
    
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Flow2/API] LangGraph KYC error:', error);
    
    // MILESTONE C: Return proper non-2xx on failure (NOT 200 with degraded flag)
    return NextResponse.json(
      {
        error: 'Graph execution failed',
        message: error.message || 'Unknown error',
        degraded: true // Optional flag for debugging
      },
      { status: 500 } // Proper error status
    );
  }
}

/**
 * Flow1: Handle legacy orchestration mode
 */
async function handleLegacyOrchestration(
  request: NextRequest,
  body: any
): Promise<NextResponse> {
  // Validate required fields for Flow1
  if (!body.flow_id) {
    return NextResponse.json(
      { error: 'flow_id is required' },
        { status: 400 }
      );
    }
    
    if (!body.document_id) {
      return NextResponse.json(
        { error: 'document_id is required' },
        { status: 400 }
      );
    }
    
    if (!body.sections || !Array.isArray(body.sections)) {
      return NextResponse.json(
        { error: 'sections array is required' },
        { status: 400 }
      );
    }
    
    if (body.sections.length === 0) {
      return NextResponse.json(
        { error: 'sections array must contain at least 1 section' },
        { status: 400 }
      );
    }
    
    // Validate section structure
    for (const section of body.sections) {
      if (!section.id || !section.title || !section.content) {
        return NextResponse.json(
          { error: 'Each section must have id, title, and content' },
          { status: 400 }
        );
      }
    }
    
    // Execute orchestration
  const response = await orchestrate(body as OrchestrateRequest);
    
    return NextResponse.json(response, {
      status: response.ok ? 200 : 500,
    });
}

/**
 * STRICT MODE DISPATCH
 * 
 * Uses switch statement to ensure no handler ordering dependencies.
 * Each case returns immediately (no fallthrough).
 */
export async function POST(request: NextRequest) {
  try {
    const body: any = await request.json();
    
    // Determine mode (with backward compatibility for legacy)
    let mode = body.mode;
    if (!mode) {
      // Legacy: infer mode from presence of flow_id/document_id
      if (body.flow_id && body.document_id) {
        mode = 'legacy';
      } else {
        return NextResponse.json(
          { error: 'mode field is required. Valid modes: langgraph_kyc, batch_review, or provide flow_id for legacy mode' },
          { status: 400 }
        );
      }
    }
    
    // STRICT SWITCH: Each case returns immediately
    switch (mode) {
      case 'langgraph_kyc':
        return await handleLangGraphKyc(request, body as LangGraphKycRequest);
      
      case 'batch_review':
        // Flow1 batch review - UNCHANGED
        return await handleBatchReview(request, body as BatchReviewRequest);
      
      case 'legacy':
        // Flow1 legacy orchestration - UNCHANGED
        return await handleLegacyOrchestration(request, body);
      
      default:
        return NextResponse.json(
          { error: `Unknown mode: ${mode}. Valid modes: langgraph_kyc, batch_review, legacy` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error in /api/orchestrate POST:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to list available flows
export async function GET() {
  return NextResponse.json({
    flows: [
      {
        id: 'compliance-review-v1',
        name: 'Compliance Review Workflow',
        version: '1.0.0',
        description: 'Full compliance review: Extract → Map → Review → Branch → Evidence → Comms → Audit',
        steps: [
          'extract-facts-agent',
          'map-policy-agent',
          'redteam-review-agent',
          '[conditional] request-evidence-agent',
          'draft-client-comms-agent',
          'write-audit-agent',
        ],
        decision_outcomes: ['rejected', 'request_more_info', 'ready_to_send'],
      },
      {
        id: 'contract-risk-review-v1',
        name: 'Contract Risk Review Workflow',
        version: '1.0.0',
        description: 'Contract risk assessment: Extract → Map to Standards → Adversarial Review → Branch → Evidence → Risk Summary → Audit',
        steps: [
          'extract-facts-agent',
          'map-policy-agent',
          'redteam-review-agent',
          '[conditional] request-evidence-agent',
          'draft-client-comms-agent',
          'write-audit-agent',
        ],
        decision_outcomes: ['escalate_legal', 'negotiate_terms', 'acceptable_risk', 'ready_to_sign'],
      },
    ],
    endpoint: '/api/orchestrate',
    method: 'POST',
  });
}

/*
 * INTEGRATION TEST EXAMPLE
 * 
 * Test 1: Document with critical violation (tobacco industry)
 * Expected: decision.next_action = "rejected"
 * 
 * curl -X POST http://localhost:3001/api/orchestrate \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "flow_id": "compliance-review-v1",
 *     "document_id": "DOC-TEST-001",
 *     "sections": [
 *       {
 *         "id": "sec-1",
 *         "title": "Investment Strategy",
 *         "content": "Client wishes to invest $100,000 in tobacco industry stocks for high returns."
 *       }
 *     ],
 *     "options": {
 *       "language": "english",
 *       "tone": "formal",
 *       "client_name": "John Smith",
 *       "mode": "fake"
 *     }
 *   }'
 * 
 * Expected Response:
 * {
 *   "ok": true,
 *   "parent_trace_id": "orch_...",
 *   "execution": {
 *     "steps": [ 6-7 steps ],
 *     "total_latency_ms": ~50ms
 *   },
 *   "artifacts": {
 *     "facts": [ tobacco entity, $100,000 amount ],
 *     "policy_mappings": [ COND-008 critical ],
 *     "review_issues": [ RT-1 critical tobacco violation ],
 *     "client_communication": { subject: "...Action Required" }
 *   },
 *   "decision": {
 *     "next_action": "rejected",
 *     "reason": "1 critical issue(s)...",
 *     "blocking_issues": ["Prohibited industry reference..."]
 *   }
 * }
 * 
 * ---
 * 
 * Test 2: Clean document (no violations)
 * Expected: decision.next_action = "ready_to_send"
 * 
 * curl -X POST http://localhost:3001/api/orchestrate \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "flow_id": "compliance-review-v1",
 *     "document_id": "DOC-TEST-002",
 *     "sections": [
 *       {
 *         "id": "sec-1",
 *         "title": "Investment Strategy",
 *         "content": "Diversified portfolio across technology and healthcare sectors with comprehensive risk assessment and disclosure statements. Client acknowledges all risks."
 *       }
 *     ],
 *     "options": {
 *       "language": "english",
 *       "mode": "fake"
 *     }
 *   }'
 * 
 * Expected Response:
 * {
 *   "ok": true,
 *   "decision": {
 *     "next_action": "ready_to_send",
 *     "reason": "All compliance checks passed successfully"
 *   },
 *   "signals": {
 *     "critical_count": 0,
 *     "high_count": 0,
 *     "branch_triggers": ["all_checks_passed"]
 *   }
 * }
 * 
 * ---
 * 
 * Test 3: Document with high issues (missing risk disclosure)
 * Expected: decision.next_action = "request_more_info", evidence requests generated
 * 
 * curl -X POST http://localhost:3001/api/orchestrate \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "flow_id": "compliance-review-v1",
 *     "document_id": "DOC-TEST-003",
 *     "sections": [
 *       {
 *         "id": "sec-1",
 *         "title": "Investment Proposal",
 *         "content": "Invest in growth stocks with expected 20% returns."
 *       }
 *     ]
 *   }'
 * 
 * Expected Response:
 * {
 *   "ok": true,
 *   "decision": {
 *     "next_action": "request_more_info",
 *     "reason": "...high-priority issue(s)..."
 *   },
 *   "artifacts": {
 *     "evidence_requests": [ { id: "EVR-0001", ... } ]
 *   },
 *   "signals": {
 *     "evidence_requests_count": 2
 *   }
 * }
 */

/**
 * Flow2: LangGraph KYC Request
 * Phase 3 HITL: Extended with checkpoint resume support
 */
interface LangGraphKycRequest {
  mode: 'langgraph_kyc';
  documents: { name: string; content: string }[];
  dirtyTopics?: string[];
  humanDecision?: any;
  runId?: string; // For legacy resume (old human gate)
  resumeToken?: string; // For legacy resume (old human gate)
  features?: { // Phase 0: Feature flags (default OFF)
    reflection?: boolean;
    negotiation?: boolean;
    memory?: boolean;
  };
  // Phase 3 HITL: New checkpoint-based resume
  execution_mode?: 'run' | 'resume';
  checkpoint_run_id?: string; // Required if execution_mode === 'resume'
  checkpoint_human_decision?: {
    node_id: string;
    decision: 'approve' | 'reject';
    comment?: string;
  };
}


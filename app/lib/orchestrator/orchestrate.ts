/**
 * Orchestrator Core
 * Single-file MVP: Plan → Execute → Branch → Finalize
 */

import { runAgent } from '../agents/runner';
import {
  OrchestrateRequest,
  OrchestrateResponse,
  OrchestrationContext,
  StepExecutionResult,
  PlanStep,
  FlowDefinition,
} from './types';
import { COMPLIANCE_REVIEW_FLOW } from './flows/compliance-review';
import { CONTRACT_RISK_REVIEW_FLOW } from './flows/contract-risk-review';
import { analyzeComplianceAndDecide } from './analyzers/compliance-analyzer';

// Flow registry
const FLOW_REGISTRY: Record<string, FlowDefinition> = {
  'compliance-review-v1': COMPLIANCE_REVIEW_FLOW,
  'contract-risk-review-v1': CONTRACT_RISK_REVIEW_FLOW,
};

/**
 * Generate parent trace ID for orchestration
 */
function generateParentTraceId(): string {
  return `orch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Structured logging for orchestrator
 */
function logOrchestrator(event: string, data: any) {
  console.log(
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...data,
    })
  );
}

/**
 * Summarize input for logging (first 100 chars)
 */
function summarizeInput(input: any): string {
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  return str.substring(0, 100) + (str.length > 100 ? '...' : '');
}

/**
 * Summarize output for logging
 */
function summarizeOutput(output: any): string {
  if (!output) return 'No output';
  
  if (output.facts) return `Extracted ${output.facts.length} facts`;
  if (output.mappings) return `Mapped ${output.mappings.length} policy rules`;
  if (output.issues) return `Found ${output.issues.length} issues`;
  if (output.requests) return `Generated ${output.requests.length} evidence requests`;
  if (output.subject) return `Communication: ${output.subject}`;
  if (output.audit_id) return `Audit: ${output.audit_id}`;
  if (output.summary) return output.summary;
  
  return 'Output generated';
}

/**
 * Execute a single step
 */
async function executeStep(
  step: PlanStep,
  context: OrchestrationContext
): Promise<StepExecutionResult> {
  const startTime = Date.now();
  
  try {
    // Prepare input based on step definition
    const input = step.prepareInput(context);
    
    logOrchestrator('step_started', {
      parent_trace_id: context.parent_trace_id,
      step_id: step.id,
      agent_id: step.agent_id,
      input_summary: summarizeInput(input),
    });
    
    // Call agent via existing runner
    const agentResponse = await runAgent(step.agent_id, input, context.options?.mode || 'fake');
    
    const latency = Date.now() - startTime;
    
    const result: StepExecutionResult = {
      step_id: step.id,
      agent_id: step.agent_id,
      trace_id: agentResponse.trace_id,
      status: agentResponse.ok ? 'success' : 'error',
      latency_ms: latency,
      tokens: agentResponse.metadata.tokens,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      input_summary: summarizeInput(input),
      output_summary: summarizeOutput(agentResponse.output),
      output: agentResponse.output,
      ok: agentResponse.ok,
      error: agentResponse.error,
    };
    
    logOrchestrator('step_completed', {
      parent_trace_id: context.parent_trace_id,
      step_id: step.id,
      agent_id: step.agent_id,
      trace_id: agentResponse.trace_id,
      status: result.status,
      latency_ms: latency,
      output_summary: result.output_summary,
    });
    
    return result;
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    logOrchestrator('step_error', {
      parent_trace_id: context.parent_trace_id,
      step_id: step.id,
      agent_id: step.agent_id,
      error: error.message,
      latency_ms: latency,
    });
    
    return {
      step_id: step.id,
      agent_id: step.agent_id,
      trace_id: `error_${Date.now()}`,
      status: 'error',
      latency_ms: latency,
      tokens: 0,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      input_summary: 'Error preparing input',
      output_summary: `Error: ${error.message}`,
      ok: false,
      error: error.message,
    };
  }
}

/**
 * Main orchestration function
 */
export async function orchestrate(
  request: OrchestrateRequest
): Promise<OrchestrateResponse> {
  // 1. INIT
  const parentTraceId = generateParentTraceId();
  const mode = request.options?.mode || 'fake';
  
  logOrchestrator('orchestration_started', {
    parent_trace_id: parentTraceId,
    flow_id: request.flow_id,
    document_id: request.document_id,
    sections_count: request.sections.length,
    mode,
  });
  
  const startTime = Date.now();
  
  try {
    // 2. LOAD FLOW
    const flow = FLOW_REGISTRY[request.flow_id];
    if (!flow) {
      throw new Error(
        `Flow "${request.flow_id}" not found. Available: ${Object.keys(FLOW_REGISTRY).join(', ')}`
      );
    }
    
    // 3. VALIDATE REQUEST
    if (request.sections.length !== 1) {
      throw new Error(
        `This version supports exactly 1 section, got ${request.sections.length}. Multi-section support coming soon.`
      );
    }
    
    // 4. INITIALIZE CONTEXT
    const context: OrchestrationContext = {
      parent_trace_id: parentTraceId,
      document_id: request.document_id,
      sections: request.sections,
      options: {
        language: request.options?.language || 'english',
        tone: request.options?.tone || 'formal',
        client_name: request.options?.client_name || 'Valued Client',
        reviewer: request.options?.reviewer || 'Automated Compliance System',
        mode,
        skip_steps: request.options?.skip_steps || [],
      },
      artifacts: {},
      execution: {
        steps: [],
        errors: [],
      },
      signals: {
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        flagged_policy_count: 0,
        evidence_requests_count: 0,
        branch_triggers: [],
      },
    };
    
    // 5. EXECUTE MAIN SEQUENCE
    for (const step of flow.mainSequence) {
      if (context.options?.skip_steps?.includes(step.id)) {
        logOrchestrator('step_skipped', {
          parent_trace_id: parentTraceId,
          step_id: step.id,
          reason: 'In skip_steps list',
        });
        continue;
      }
      
      const result = await executeStep(step, context);
      context.execution.steps.push(result);
      
      // Store artifact
      if (result.ok && result.output) {
        context.artifacts[step.artifact_key] = result.output;
      }
      
      // Handle errors
      if (!result.ok) {
        context.execution.errors.push(result.error || 'Unknown error');
        if (step.critical) {
          throw new Error(`Critical step "${step.id}" failed: ${result.error}`);
        }
      }
    }
    
    // 6. BRANCH (state machine decision)
    // Use flow-specific decision analyzer if provided, otherwise use default
    const decision = flow.decisionAnalyzer
      ? flow.decisionAnalyzer(context)
      : analyzeComplianceAndDecide(context); // default fallback
    context.decision = decision;
    
    logOrchestrator('branching_decision', {
      parent_trace_id: parentTraceId,
      next_action: decision.next_action,
      reason: decision.reason,
      confidence: decision.confidence,
      branch_triggers: context.signals.branch_triggers,
    });
    
    // 7. EXECUTE CONDITIONAL STEPS
    for (const step of flow.conditionalSteps) {
      if (context.options?.skip_steps?.includes(step.id)) continue;
      
      if (step.condition && step.condition(context)) {
        const result = await executeStep(step, context);
        context.execution.steps.push(result);
        
        if (result.ok && result.output) {
          context.artifacts[step.artifact_key] = result.output;
          
          // Update signals
          if (step.id === 'request-evidence' && result.output.requests) {
            context.signals.evidence_requests_count = result.output.requests.length;
          }
        }
        
        if (!result.ok && step.critical) {
          throw new Error(`Critical conditional step "${step.id}" failed: ${result.error}`);
        }
      }
    }
    
    // 8. FINALIZE (always run comms + audit)
    for (const step of flow.finalizationSteps) {
      if (context.options?.skip_steps?.includes(step.id)) continue;
      
      const result = await executeStep(step, context);
      context.execution.steps.push(result);
      
      if (result.ok && result.output) {
        context.artifacts[step.artifact_key] = result.output;
      }
      
      if (!result.ok) {
        context.execution.errors.push(result.error || 'Unknown error');
        // Finalization failures are not critical
      }
    }
    
    // 9. BUILD RESPONSE
    const totalLatency = Date.now() - startTime;
    const totalTokens = context.execution.steps.reduce((sum, s) => sum + s.tokens, 0);
    
    const response: OrchestrateResponse = {
      ok: true,
      parent_trace_id: parentTraceId,
      mode,
      
      plan: {
        flow_id: flow.id,
        flow_name: flow.name,
        flow_version: flow.version,
        steps: [
          ...flow.mainSequence.map((s) => ({
            step_id: s.id,
            step_name: s.name,
            agent_id: s.agent_id,
            status: (context.execution.steps.find((es) => es.step_id === s.id)
              ? 'completed'
              : 'pending') as 'pending' | 'completed' | 'failed' | 'skipped',
          })),
          ...flow.conditionalSteps.map((s) => ({
            step_id: s.id,
            step_name: s.name,
            agent_id: s.agent_id,
            status: (context.execution.steps.find((es) => es.step_id === s.id)
              ? 'completed'
              : 'skipped') as 'pending' | 'completed' | 'failed' | 'skipped',
          })),
          ...flow.finalizationSteps.map((s) => ({
            step_id: s.id,
            step_name: s.name,
            agent_id: s.agent_id,
            status: (context.execution.steps.find((es) => es.step_id === s.id)
              ? 'completed'
              : 'pending') as 'pending' | 'completed' | 'failed' | 'skipped',
          })),
        ],
        branching_points: context.signals.branch_triggers.map((trigger) => ({
          after_step: 'redteam-review',
          condition: trigger,
          branch_taken: true,
        })),
      },
      
      execution: {
        steps: context.execution.steps,
        total_latency_ms: totalLatency,
        total_tokens: totalTokens,
        errors: context.execution.errors,
      },
      
      artifacts: context.artifacts,
      
      decision: context.decision!,
      
      signals: context.signals,
      
      metadata: {
        orchestrator_version: '1.0.0',
        timestamp: new Date().toISOString(),
        document_id: request.document_id,
        sections_processed: request.sections.length,
      },
    };
    
    logOrchestrator('orchestration_completed', {
      parent_trace_id: parentTraceId,
      flow_id: request.flow_id,
      total_latency_ms: totalLatency,
      total_tokens: totalTokens,
      steps_executed: context.execution.steps.length,
      decision: decision.next_action,
    });
    
    return response;
  } catch (error: any) {
    const totalLatency = Date.now() - startTime;
    
    logOrchestrator('orchestration_error', {
      parent_trace_id: parentTraceId,
      error: error.message,
      total_latency_ms: totalLatency,
    });
    
    // Return error response
    return {
      ok: false,
      error: error.message,
      parent_trace_id: parentTraceId,
      mode,
      plan: {
        flow_id: request.flow_id,
        flow_name: 'Error',
        flow_version: '0.0.0',
        steps: [],
        branching_points: [],
      },
      execution: {
        steps: [],
        total_latency_ms: totalLatency,
        total_tokens: 0,
        errors: [error.message],
      },
      artifacts: {},
      decision: {
        next_action: 'rejected',
        reason: `Orchestration failed: ${error.message}`,
        confidence: 0,
        recommended_actions: ['Fix errors and retry'],
        blocking_issues: [error.message],
      },
      signals: {
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        flagged_policy_count: 0,
        evidence_requests_count: 0,
        branch_triggers: [],
      },
      metadata: {
        orchestrator_version: '1.0.0',
        timestamp: new Date().toISOString(),
        document_id: request.document_id,
        sections_processed: 0,
      },
    };
  }
}


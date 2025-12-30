/**
 * Phase 1: Reflect and Replan Node
 * 
 * Self-reflection node that reads recent trace/dirty_queue/issues
 * and sets state.nextAction with strict JSON output parser.
 * 
 * Enforces max 1 replan to prevent infinite loops.
 */

import { z } from 'zod';
import type { Flow2State, TraceEvent } from './flow2State';
import { summarizeForReflection, addTrace } from './flow2State';
import { createReflectionProvider } from './reflectionProvider';

// Strict Zod schema for LLM output
const PlanActionSchema = z.enum([
  'skip',
  'rerun_batch_review',
  'switch_to_section_review',
  'ask_human_for_scope',
  'tighten_policy',
]);

const ReflectionOutputSchema = z.object({
  should_replan: z.boolean(),
  reason: z.string().min(1).max(240),
  new_plan: z.array(PlanActionSchema).default([]),
  confidence: z.number().min(0).max(1),
});

type ReflectionOutput = z.infer<typeof ReflectionOutputSchema>;

/**
 * Default no-replan output
 */
function defaultNoReplan(reason: string): ReflectionOutput {
  return {
    should_replan: false,
    reason,
    new_plan: ['skip'],
    confidence: 0.6,
  };
}

// Initialize reflection provider once (module-level)
const reflectionProvider = createReflectionProvider();

/**
 * Run reflection LLM call via pluggable provider
 */
async function runReflectionLLM(payload: Record<string, any>): Promise<string> {
  const prompt = `
You are a workflow self-reflection controller for a governed banking document review agent.

You will be given a compact JSON payload containing:
- recent trace events
- dirty queue summary
- issues summary
- current next action
- replan count

Task:
Decide whether the agent should re-plan the next step.

Rules:
- Output MUST be valid JSON only (no markdown).
- Use this exact schema:
  {
    "should_replan": boolean,
    "reason": string,
    "new_plan": ["skip"|"rerun_batch_review"|"switch_to_section_review"|"ask_human_for_scope"|"tighten_policy"],
    "confidence": number (0..1)
  }
- If replan_count >= 1, you must NOT propose further replans. Set should_replan=false and new_plan=["ask_human_for_scope"].
- Keep reason concise and non-emotional.
- Prefer "ask_human_for_scope" if there is repeated conflict, rejection, or ambiguity.

Payload:
${JSON.stringify(payload, null, 2)}
`.trim();

  console.log(`[Flow2/Reflection] Using provider: ${reflectionProvider.name}`);
  console.log('[Flow2/Reflection] LLM Prompt:', prompt.substring(0, 200) + '...');
  
  try {
    const result = await reflectionProvider.run(payload, prompt);
    return result;
  } catch (error: any) {
    console.error(`[Flow2/Reflection] Provider ${reflectionProvider.name} failed:`, error.message);
    
    // Safe fallback: return deterministic skip decision
    return JSON.stringify({
      should_replan: false,
      reason: `Provider ${reflectionProvider.name} failed; continuing with current plan.`,
      new_plan: ['skip'],
      confidence: 0.5,
    });
  }
}

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
function extractJSON(raw: string): string {
  let s = raw.trim();
  
  // Remove markdown code fences if present
  if (s.startsWith('```')) {
    const lines = s.split('\n');
    // Remove first line (```json or ```)
    lines.shift();
    // Remove last line if it's just ```
    if (lines[lines.length - 1].trim() === '```') {
      lines.pop();
    }
    s = lines.join('\n').trim();
  }
  
  // Find JSON object boundaries
  if (!s.startsWith('{')) {
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      s = s.substring(first, last + 1);
    }
  }
  
  return s;
}

/**
 * Main reflect_and_replan node
 */
export async function reflectAndReplan(state: Flow2State): Promise<Flow2State> {
  // Enable reflection based on feature flag
  state.reflection.enabled = state.features.reflection;
  
  if (!state.features.reflection) {
    addTrace(
      state,
      'reflection',
      'reflect_and_replan',
      'Reflection disabled; skipping.',
      { enabled: false }
    );
    return state;
  }
  
  console.log('[Flow2/Reflection] Running reflection node');
  
  // Enforce max 1 replan
  if (state.reflection.replanCount >= 1) {
    const out = defaultNoReplan('Replan limit reached; require human scope decision.');
    state.nextAction = 'ask_human_for_scope';
    state.reflection.lastShouldReplan = out.should_replan;
    state.reflection.lastConfidence = out.confidence;
    state.reflection.lastNewPlan = [...out.new_plan];
    
    addTrace(
      state,
      'reflection',
      'reflect_and_replan',
      out.reason,
      {
        should_replan: out.should_replan,
        new_plan: out.new_plan,
        confidence: out.confidence,
        next_action: state.nextAction,
      }
    );
    
    return state;
  }
  
  // Prepare payload for LLM
  const payload = summarizeForReflection(state);
  
  try {
    // Call LLM
    const raw = await runReflectionLLM(payload);
    const jsonStr = extractJSON(raw);
    
    // Parse with Zod
    const parsed = JSON.parse(jsonStr);
    const out = ReflectionOutputSchema.parse(parsed);
    
    // Map plan action to next_action
    const chosen = out.new_plan[0] || 'skip';
    const nextActionMap: Record<string, string> = {
      skip: state.nextAction || 'skip',
      rerun_batch_review: 'rerun_batch_review',
      switch_to_section_review: 'section_review',
      ask_human_for_scope: 'ask_human_for_scope',
      tighten_policy: 'tighten_policy',
    };
    
    const nextAction = nextActionMap[chosen] || state.nextAction || 'skip';
    
    // Update replan count if replanning
    if (out.should_replan) {
      state.reflection.replanCount += 1;
    }
    
    // Update reflection state
    state.reflection.lastShouldReplan = out.should_replan;
    state.reflection.lastConfidence = out.confidence;
    state.reflection.lastNewPlan = [...out.new_plan];
    state.nextAction = nextAction;
    
    addTrace(
      state,
      'reflection',
      'reflect_and_replan',
      out.reason,
      {
        should_replan: out.should_replan,
        new_plan: out.new_plan,
        confidence: out.confidence,
        next_action: nextAction,
      }
    );
    
    console.log('[Flow2/Reflection] Completed:', {
      should_replan: out.should_replan,
      next_action: nextAction,
      confidence: out.confidence,
    });
    
  } catch (error: any) {
    console.error('[Flow2/Reflection] Error:', error.message);
    
    const out = defaultNoReplan(
      `Reflection parsing failed; keep current plan. (${error.name || 'Error'})`
    );
    
    state.reflection.lastShouldReplan = out.should_replan;
    state.reflection.lastConfidence = out.confidence;
    state.reflection.lastNewPlan = [...out.new_plan];
    
    addTrace(
      state,
      'reflection',
      'reflect_and_replan',
      out.reason,
      {
        error: error.message,
        should_replan: out.should_replan,
        new_plan: out.new_plan,
        confidence: out.confidence,
      }
    );
  }
  
  return state;
}


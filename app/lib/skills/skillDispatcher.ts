/**
 * Skills Framework - Skill Dispatcher
 * 
 * Central entrypoint for skill invocation with pluggable transport (local/remote).
 * Phase 2: Remote transport support with feature flags.
 */

import type { SkillInvocation } from './types';
import { getSkillDef } from './skillCatalog';
import { executeLocalSkill } from './transports/local';
import { executeRemoteSkill } from './transports/remote';

/**
 * Skill Invocation Context
 * 
 * Provides runtime context for skill execution.
 */
export interface SkillInvocationContext {
  trace?: {
    skillInvocations: SkillInvocation[];
  };
  runId?: string;
  transport?: 'local' | 'remote';
  features?: {
    remote_skills?: boolean;
    [key: string]: any;
  };
}

/**
 * Determine transport based on feature flags and env vars
 * 
 * Precedence (as per Plan Patch v1):
 * 1. IF ENABLE_REMOTE_SKILLS !== "true" → local (master kill switch)
 * 2. ELSE IF ctx.features?.remote_skills === true → remote (user opt-in)
 * 3. ELSE → local (default safe)
 */
function selectTransport(ctx: SkillInvocationContext): 'local' | 'remote' {
  // Master kill switch
  if (process.env.ENABLE_REMOTE_SKILLS !== 'true') {
    return 'local';
  }
  
  // User opt-in
  if (ctx.features?.remote_skills === true) {
    return 'remote';
  }
  
  // Default safe
  return 'local';
}

/**
 * Invoke Skill
 * 
 * Central entrypoint for skill-based dispatch.
 * Records invocation metadata and routes to appropriate executor (local or remote).
 * 
 * @param skillName - Skill identifier (e.g., "kyc.topic_assemble")
 * @param input - Skill input (Phase A: wrapped with __result; Phase 2 remote: actual data)
 * @param ctx - Invocation context (trace, runId, features)
 * @returns Skill output
 */
export async function invokeSkill<T = any>(
  skillName: string,
  input: any,
  ctx: SkillInvocationContext = {}
): Promise<T> {
  const skillDef = getSkillDef(skillName);
  if (!skillDef) {
    throw new Error(`Skill not found in catalog: ${skillName}`);
  }
  
  const invocationId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const correlationId = ctx.runId || crypto.randomUUID();
  const transport = selectTransport(ctx);
  
  let result: any;
  let invocationMeta: Omit<SkillInvocation, 'id' | 'startedAt' | 'endedAt'> | undefined;
  let endedAt: string;
  
  try {
    // Route to transport executor
    if (transport === 'remote') {
      const remoteResult = await executeRemoteSkill(skillName, input, correlationId, ctx.features);
      result = remoteResult.output;
      invocationMeta = remoteResult.invocation;
    } else {
      const localResult = await executeLocalSkill(skillName, input, correlationId);
      result = localResult.output;
      invocationMeta = localResult.invocation;
    }
    
  } catch (e: any) {
    // For local transport, re-throw to preserve Phase A behavior
    // For remote transport, error is already handled and returned as ok=false
    console.error(`[SkillDispatcher] Skill ${skillName} threw error:`, e.message);
    throw e;
  } finally {
    endedAt = new Date().toISOString();
    
    // Create full invocation record only if we have metadata
    if (invocationMeta) {
      const invocation: SkillInvocation = {
        id: invocationId,
        startedAt,
        endedAt,
        ...invocationMeta,
      };
      
      // Record in trace if provided
      if (ctx.trace?.skillInvocations) {
        ctx.trace.skillInvocations.push(invocation);
      }
      
      console.log(`[Skill] ${skillName} completed in ${invocation.durationMs}ms (transport=${transport}, ok=${invocation.ok})`);
    }
  }
  
  return result;
}

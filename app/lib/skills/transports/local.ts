/**
 * Local Skills Transport
 * 
 * Executes skills in-process (Phase A default behavior).
 */

import type { SkillInvocation } from '../types';

/**
 * Execute skill locally (in-process)
 * 
 * For Phase A compatibility, the skill wrapper is transparent—
 * caller provides the actual result via __result field.
 */
export async function executeLocalSkill(
  skillName: string,
  input: any,
  correlationId: string
): Promise<{ output: any; invocation: Omit<SkillInvocation, 'id' | 'startedAt' | 'endedAt'> }> {
  const startTime = performance.now();
  
  let ok = true;
  let error: string | undefined;
  let result: any;
  
  try {
    // Phase A: Transparent wrapper - actual result provided by caller
    switch (skillName) {
      case 'kyc.topic_assemble':
      case 'risk.triage':
        result = input.__result;
        break;
      
      default:
        throw new Error(`Unknown skill: ${skillName}`);
    }
  } catch (e: any) {
    ok = false;
    error = truncateAndSanitize(e.message || String(e), 200);
    throw e;
  } finally {
    const endTime = performance.now();
    const durationMs = Math.max(1, Math.round(endTime - startTime));
    
    // Return output + partial invocation metadata
    return {
      output: result,
      invocation: {
        skillName,
        ownerAgent: getOwnerAgent(skillName),
        durationMs,
        ok,
        error,
        inputSummary: truncateAndSanitize(input, 300),
        outputSummary: ok ? truncateAndSanitize(result, 300) : '[error]',
        correlationId,
        transport: 'local',
        target: 'in-process',
      }
    };
  }
  
  return { output: result, invocation: {} as any }; // unreachable
}

/**
 * Get owner agent for a skill
 */
function getOwnerAgent(skillName: string): string {
  const ownerMap: Record<string, string> = {
    'kyc.topic_assemble': 'Topic Assembler',
    'risk.triage': 'Risk Triage'
  };
  return ownerMap[skillName] || 'Unknown';
}

/**
 * Truncate and sanitize for safe logging
 */
function truncateAndSanitize(value: any, maxLength: number): string {
  try {
    let str = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Redact PII
    str = str.replace(/\b[\w._%+-]+@[\w.-]+\.\w{2,}\b/gi, '[EMAIL_REDACTED]');
    str = str.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');
    str = str.replace(/\b\d{16}\b/g, '[CARD_REDACTED]');
    
    // Truncate
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '... [truncated]';
    }
    return str;
  } catch (e) {
    return `[serialization error: ${e}]`;
  }
}


/**
 * Remote Skills Transport
 * 
 * Executes skills via HTTP to remote server (Phase 2).
 */

import type { SkillInvocation } from '../types';
import { z } from 'zod';

// Duplicate schema here to avoid cross-boundary imports
// (remote server schemas are in a separate package)
const RemoteSkillResponseSchema = z.object({
  ok: z.boolean(),
  skill_name: z.string(),
  output_summary: z.record(z.any()),
  duration_ms: z.number().int().nonnegative(),
  error: z.string().optional(),
  metadata: z.object({
    server_version: z.string(),
    executed_at: z.string()
  }).optional()
});

/**
 * Build safe payload (PII protection + full_content gating)
 */
function buildSafePayload(input: any, testMode: string, serverUrl: string): any {
  // SECURITY: full_content ONLY allowed for localhost
  const isLocalhost = serverUrl.includes('127.0.0.1') || serverUrl.includes('localhost');
  const envAllowsFullContent = process.env.SKILL_TRANSPORT_TEST_MODE === 'full_content';
  
  if (testMode === 'full_content') {
    if (!isLocalhost) {
      console.error('[RemoteSkill] SECURITY VIOLATION: full_content blocked for non-localhost');
      console.error(`[RemoteSkill] Requested URL: ${serverUrl}`);
      testMode = 'summary'; // Force downgrade
    } else if (!envAllowsFullContent) {
      console.warn('[RemoteSkill] full_content requested but SKILL_TRANSPORT_TEST_MODE not set');
      testMode = 'summary'; // Force downgrade
    } else {
      console.warn('[RemoteSkill] SECURITY: Sending full content to localhost for testing');
      // Pass through full payload
      return input;
    }
  }
  
  // Default: redact sensitive fields (summary mode)
  if (input.__result) {
    // Phase A compatibility: unwrap __result
    input = input.__result;
  }
  
  if (input.documents && Array.isArray(input.documents)) {
    return {
      documents: input.documents.map((doc: any) => ({
        name: doc.name || 'unknown',
        filename: doc.filename || doc.name || 'unknown',
        doc_type_hint: doc.doc_type_hint || 'unknown',
        length: doc.content?.length || doc.text?.length || 0,
        // content/text field OMITTED for PII safety
      }))
    };
  }
  
  if (input.topicSections && Array.isArray(input.topicSections)) {
    return {
      topicSections: input.topicSections.map((sec: any) => ({
        topicId: sec.topicId || 'unknown',
        coverage: sec.coverage || 'unknown',
        length: sec.content?.length || 0,
        // content field OMITTED for PII safety
      }))
    };
  }
  
  // Unknown shape: return minimal metadata
  return { _summary: 'redacted', _type: typeof input };
}

/**
 * Execute skill remotely via HTTP
 */
export async function executeRemoteSkill(
  skillName: string,
  input: any,
  correlationId: string,
  features: any = {}
): Promise<{ output: any; invocation: Omit<SkillInvocation, 'id' | 'startedAt' | 'endedAt'> }> {
  const serverUrl = process.env.REMOTE_SKILL_SERVER_URL || 'http://127.0.0.1:4010';
  const testMode = process.env.SKILL_TRANSPORT_TEST_MODE || 'summary';
  const endpoint = `${serverUrl}/skills/execute`;
  
  const startTime = performance.now();
  
  let ok = true;
  let error: string | undefined;
  let output: any = {};
  let durationMs = 0;
  
  try {
    // Build safe payload
    const safePayload = buildSafePayload(input, testMode, serverUrl);
    
    // Build request
    const requestBody = {
      skill_name: skillName,
      input_summary: safePayload,
      context_hint: 'Flow2 KYC review',
      correlation_id: correlationId,
      test_mode: testMode
    };
    
    console.log(`[RemoteSkill] Executing ${skillName} via ${endpoint}, correlationId: ${correlationId}`);
    
    // HTTP POST with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text().catch(() => 'unknown error')}`);
    }
    
    // Parse and validate response
    const rawResponse = await response.json();
    const parseResult = RemoteSkillResponseSchema.safeParse(rawResponse);
    
    if (!parseResult.success) {
      throw new Error(`Invalid response schema: ${parseResult.error.message}`);
    }
    
    const remoteResult = parseResult.data;
    ok = remoteResult.ok;
    durationMs = remoteResult.duration_ms;
    output = remoteResult.output_summary;
    error = remoteResult.error;
    
    console.log(`[RemoteSkill] ${skillName} completed in ${durationMs}ms, correlationId: ${correlationId}, ok: ${ok}`);
    
  } catch (e: any) {
    ok = false;
    const endTime = performance.now();
    durationMs = Math.max(1, Math.round(endTime - startTime));
    
    // Handle different error types
    if (e.name === 'AbortError') {
      error = 'Remote skill execution timeout (10s)';
    } else if (e.message?.includes('ECONNREFUSED') || e.message?.includes('fetch failed')) {
      error = `Remote server unreachable: ${serverUrl}`;
    } else {
      error = truncateError(e.message || String(e));
    }
    
    console.error(`[RemoteSkill] ${skillName} failed, correlationId: ${correlationId}, error: ${error}`);
    
    // Return safe fallback output for orchestrator to continue
    output = getSafeFallbackOutput(skillName);
  }
  
  return {
    output,
    invocation: {
      skillName,
      ownerAgent: getOwnerAgent(skillName),
      durationMs,
      ok,
      error,
      inputSummary: truncateError(JSON.stringify(input).substring(0, 200)),
      outputSummary: ok ? truncateError(JSON.stringify(output).substring(0, 200)) : '[error]',
      correlationId,
      transport: 'remote',
      target: endpoint,
    }
  };
}

/**
 * Get safe fallback output for orchestrator to continue
 */
function getSafeFallbackOutput(skillName: string): any {
  switch (skillName) {
    case 'kyc.topic_assemble':
      return { topicSections: [] }; // Empty topics (degraded)
    case 'risk.triage':
      return { riskScore: 0, routePath: 'fast', triageReasons: ['[degraded]'], riskBreakdown: { coveragePoints: 0, keywordPoints: 0, totalPoints: 0 } };
    default:
      return {};
  }
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
 * Truncate error message
 */
function truncateError(msg: string, maxLength: number = 200): string {
  if (msg.length > maxLength) {
    return msg.substring(0, maxLength) + '... [truncated]';
  }
  return msg;
}


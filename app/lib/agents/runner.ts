// Agent runner - executes agents with tracing and logging

import { AgentId, AgentContext, AgentResponse, AgentMode } from './types';
import { getAgent } from './registry';

// Generate unique trace ID
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Execute an agent with full observability
export async function runAgent<TInput = any, TOutput = any>(
  agentId: AgentId,
  input: TInput,
  mode: AgentMode = 'fake'
): Promise<AgentResponse<TOutput>> {
  const traceId = generateTraceId();
  const startTime = Date.now();
  
  try {
    // Get agent from registry
    const agent = getAgent(agentId);
    
    if (!agent) {
      const latency = Date.now() - startTime;
      
      // Log error
      console.log(JSON.stringify({
        trace_id: traceId,
        agent_id: agentId,
        mode,
        status: 'error',
        error: 'Agent not found',
        latency_ms: latency
      }));
      
      return {
        ok: false,
        agent_id: agentId,
        trace_id: traceId,
        mode,
        output: null as TOutput,
        metadata: {
          latency_ms: latency,
          tokens: 0,
          status: 'error'
        },
        error: 'Agent not found in registry'
      };
    }
    
    // Create context
    const context: AgentContext = {
      traceId,
      mode,
      timestamp: new Date(),
      input
    };
    
    // Execute handler
    const output = await agent.handler(input, context);
    
    const latency = Date.now() - startTime;
    
    // Log success (structured single line)
    console.log(JSON.stringify({
      trace_id: traceId,
      agent_id: agentId,
      mode,
      status: 'success',
      latency_ms: latency,
      tokens: 0, // Fake mode = 0 tokens
      input_summary: typeof input === 'string' ? input.substring(0, 50) : 'object'
    }));
    
    return {
      ok: true,
      agent_id: agentId,
      trace_id: traceId,
      mode,
      output,
      metadata: {
        latency_ms: latency,
        tokens: 0, // Fake mode always returns 0 tokens
        status: 'success'
      }
    };
    
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log error
    console.log(JSON.stringify({
      trace_id: traceId,
      agent_id: agentId,
      mode,
      status: 'error',
      error: errorMessage,
      latency_ms: latency
    }));
    
    return {
      ok: false,
      agent_id: agentId,
      trace_id: traceId,
      mode,
      output: null as TOutput,
      metadata: {
        latency_ms: latency,
        tokens: 0,
        status: 'error'
      },
      error: errorMessage
    };
  }
}


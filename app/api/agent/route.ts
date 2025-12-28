// Unified agent API endpoint
// Routes requests to appropriate agents via the agent system

import { NextRequest, NextResponse } from 'next/server';
import { AgentId } from '@/app/lib/agents/types';
import { runAgent } from '@/app/lib/agents/runner';

interface AgentRequest {
  agent_id: AgentId;
  input: any;
  mode?: 'fake' | 'real';
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentRequest = await request.json();
    const { agent_id, input, mode = 'fake' } = body;
    
    // Validate agent_id
    if (!agent_id) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'agent_id is required',
          trace_id: `error_${Date.now()}`
        },
        { status: 400 }
      );
    }
    
    // Run agent through agent system
    const response = await runAgent(agent_id, input, mode);
    
    // Return agent response with full observability
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in /api/agent:', error);
    
    return NextResponse.json(
      {
        ok: false,
        agent_id: 'unknown',
        trace_id: `error_${Date.now()}`,
        mode: 'fake',
        output: null,
        metadata: {
          latency_ms: 0,
          tokens: 0,
          status: 'error'
        },
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to list available agents
export async function GET() {
  const { listAgents } = await import('@/app/lib/agents/registry');
  const agents = listAgents();
  
  return NextResponse.json({
    agents: agents.map(a => ({
      id: a.config.id,
      name: a.config.name,
      description: a.config.description,
      capabilities: a.config.capabilities
    }))
  });
}


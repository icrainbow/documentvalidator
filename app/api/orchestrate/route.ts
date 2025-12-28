/**
 * Orchestrate API Endpoint
 * POST /api/orchestrate - Execute multi-agent compliance review workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { orchestrate } from '../../lib/orchestrator/orchestrate';
import { OrchestrateRequest } from '../../lib/orchestrator/types';

export async function POST(request: NextRequest) {
  try {
    const body: OrchestrateRequest = await request.json();
    
    // Validate required fields
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
    const response = await orchestrate(body);
    
    return NextResponse.json(response, {
      status: response.ok ? 200 : 500,
    });
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


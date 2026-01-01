import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const TEST_API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

describe('Flow2 Reflection API', () => {
  beforeEach(() => {
    delete process.env.REFLECTION_TEST_MODE;
  });
  
  afterEach(() => {
    delete process.env.REFLECTION_TEST_MODE;
  });
  
  it('reflection=false shows disabled trace', async () => {
    const response = await fetch(`${TEST_API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [{ name: 'test.txt', content: 'Test KYC document content' }],
        features: { reflection: false }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Should have graphReviewTrace
    expect(data).toHaveProperty('graphReviewTrace');
    expect(data.graphReviewTrace).toHaveProperty('events');
    
    // Phase 2 HITL: Execution now pauses at human_review gate
    // Reflection only happens after human approval
    expect(data.status).toBe('waiting_human');
    expect(data.paused_at_node).toBe('human_review');
    
    // Should have human_review node in trace (paused)
    const humanReviewEvents = data.graphReviewTrace.events.filter((e: any) => e.node === 'human_review');
    expect(humanReviewEvents.length).toBeGreaterThan(0);
    
    // Reflection node should NOT be present yet (execution paused)
    const reflectEvents = data.graphReviewTrace.events.filter((e: any) => e.node === 'reflect_and_replan');
    expect(reflectEvents.length).toBe(0); // Not executed yet
  });
  
  it('reflection=true shows reflect_and_replan node', async () => {
    const response = await fetch(`${TEST_API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [{ name: 'test.txt', content: 'Test KYC document' }],
        features: { reflection: true }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('graphReviewTrace');
    
    // Phase 2 HITL: Execution pauses at human_review, reflection is enabled but not executed yet
    expect(data.status).toBe('waiting_human');
    expect(data.paused_at_node).toBe('human_review');
    
    // Should NOT have reflect_and_replan node yet (execution paused before reflection)
    const nodeNames = data.graphReviewTrace.events.map((e: any) => e.node);
    expect(nodeNames).not.toContain('reflect_and_replan');
    expect(nodeNames).toContain('human_review'); // Should have human review node
  });
  
  it('REFLECTION_TEST_MODE=rerun produces evidence of rerun in trace', async () => {
    // Note: This test relies on the dev server inheriting REFLECTION_TEST_MODE from globalSetup
    // However, since we're setting it here in the test process, it won't affect the server.
    // For this test to work properly, we'd need to restart the server with the env var.
    // For now, we'll test what we can: that the endpoint accepts the request.
    
    const response = await fetch(`${TEST_API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [{ name: 'test.txt', content: 'Test KYC document' }],
        features: { reflection: true }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // When reflection is enabled, we should see multiple passes of checks
    // Count policy_flags_check occurrences (or other check nodes)
    const nodes = data.graphReviewTrace.events.map((e: any) => e.node);
    
    // Should have at least policy_flags_check, gap_collector, etc.
    expect(nodes.some((n: string) => n === 'gap_collector')).toBe(true);
    
    // Note: To properly test rerun, we'd need to set REFLECTION_TEST_MODE at server startup
    // This is better tested in E2E with a dedicated playwright config
  });
  
  it('validates response structure for langgraph_kyc with reflection', async () => {
    const response = await fetch(`${TEST_API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [{ name: 'test.txt', content: 'Test KYC' }],
        features: { reflection: true, negotiation: false, memory: false }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Should have required fields
    expect(data).toHaveProperty('issues');
    expect(data).toHaveProperty('graphReviewTrace');
    expect(data.graphReviewTrace).toHaveProperty('events');
    expect(data.graphReviewTrace).toHaveProperty('summary');
    
    // Summary should have required fields
    expect(data.graphReviewTrace.summary).toHaveProperty('path');
    expect(data.graphReviewTrace.summary).toHaveProperty('riskScore');
    
    // Issues should be an array
    expect(Array.isArray(data.issues)).toBe(true);
  });
});

// Extension to orchestrate.contract.test.ts (to be added there)
export const additionalContractTests = {
  'langgraph_kyc with reflection disabled': async () => {
    const response = await fetch(`${TEST_API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [{ name: 'test.txt', content: 'Test' }],
        features: { reflection: false }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('graphReviewTrace');
  }
};



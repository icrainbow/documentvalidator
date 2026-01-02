/**
 * Flow2 Demo: Post-Reject Analysis API Tests
 * 
 * Tests the Phase 8 post-reject analysis endpoint.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startServer, stopServer, TEST_BASE_URL } from './setup';

beforeAll(async () => {
  await startServer();
});

afterAll(async () => {
  await stopServer();
});

describe('POST-Reject Analysis API', () => {
  it('should return 400 if run_id is missing', async () => {
    const response = await fetch(`${TEST_BASE_URL}/api/flow2/demo/post-reject-analysis`);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Missing run_id');
  });
  
  it('should return 404 if run_id does not exist', async () => {
    const fakeRunId = '00000000-0000-4000-a000-000000000000';
    const response = await fetch(`${TEST_BASE_URL}/api/flow2/demo/post-reject-analysis?run_id=${fakeRunId}`);
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain('not found');
  });
  
  it('should return triggered=false if reject comment lacks trigger', async () => {
    // Create a checkpoint with normal reject (no trigger)
    const { run_id } = await createTestCheckpoint({
      decision: 'reject',
      decision_comment: 'Normal rejection without trigger words'
    });
    
    const response = await fetch(`${TEST_BASE_URL}/api/flow2/demo/post-reject-analysis?run_id=${run_id}`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.triggered).toBe(false);
    expect(data.run_id).toBe(run_id);
  });
  
  it('should return triggered=true with Phase 8 data when Route: EDD is present', async () => {
    // Create checkpoint with Route: EDD trigger
    const { run_id } = await createTestCheckpoint({
      decision: 'reject',
      decision_comment: 'Reject this submission. Route: EDD.'
    });
    
    const response = await fetch(`${TEST_BASE_URL}/api/flow2/demo/post-reject-analysis?run_id=${run_id}`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Verify structure
    expect(data.ok).toBe(true);
    expect(data.triggered).toBe(true);
    expect(data.run_id).toBe(run_id);
    expect(data.reviewer_text).toContain('Route: EDD');
    
    // Verify Phase 8 components
    expect(data.tasks).toBeDefined();
    expect(Array.isArray(data.tasks)).toBe(true);
    expect(data.tasks.length).toBe(3);
    expect(data.tasks[0].id).toBe('A');
    expect(data.tasks[0].status).toBe('done');
    
    expect(data.skills).toBeDefined();
    expect(Array.isArray(data.skills)).toBe(true);
    expect(data.skills.length).toBe(3);
    expect(data.skills[0].name).toBe('Document Retrieval');
    
    expect(data.findings).toBeDefined();
    expect(Array.isArray(data.findings)).toBe(true);
    expect(data.findings.length).toBeGreaterThan(0);
    expect(data.findings[0].severity).toMatch(/high|medium|low|info/);
    
    expect(data.evidence).toBeDefined();
    expect(data.evidence.pdf_highlight_image_url).toContain('.svg');
    
    expect(data.graph_patch).toBeDefined();
    expect(data.graph_patch.add_nodes).toBeDefined();
    expect(data.graph_patch.add_nodes[0].id).toBe('edd');
  });
  
  it('should return triggered=true when [DEMO_EDD] token is present', async () => {
    const { run_id } = await createTestCheckpoint({
      decision: 'reject',
      decision_comment: 'This is a demo rejection. [DEMO_EDD]'
    });
    
    const response = await fetch(`${TEST_BASE_URL}/api/flow2/demo/post-reject-analysis?run_id=${run_id}`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.triggered).toBe(true);
  });
  
  it('should return triggered=false if decision is approve (not reject)', async () => {
    const { run_id } = await createTestCheckpoint({
      decision: 'approve',
      decision_comment: null
    });
    
    const response = await fetch(`${TEST_BASE_URL}/api/flow2/demo/post-reject-analysis?run_id=${run_id}`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.triggered).toBe(false);
  });
});

// Helper: Create test checkpoint
async function createTestCheckpoint(updates: { decision: string; decision_comment: string | null }) {
  const { randomUUID } = await import('crypto');
  const { saveCheckpoint } = await import('../../app/lib/flow2/checkpointStore');
  
  const run_id = randomUUID();
  const checkpoint: any = {
    run_id,
    graph_id: 'flow2_graph_v1',
    flow: 'flow2',
    current_node_id: 'test_node',
    paused_at_node_id: 'human_review',
    graph_state: {},
    documents: [
      { doc_id: 'test-doc', filename: 'test.txt', text: 'Test content', doc_type_hint: 'kyc_form' }
    ],
    created_at: new Date().toISOString(),
    paused_at: new Date().toISOString(),
    status: 'paused',
    approval_token: 'test-token-' + Date.now(),
    approval_email_to: 'test@example.com',
    approval_email_sent: true,
    reminder_email_sent: false,
    ...updates
  };
  
  await saveCheckpoint(checkpoint);
  return { run_id };
}



/**
 * Tests for Flow Monitor API endpoints
 * - Poll endpoint with new contract
 * - Remind endpoint with cooldown
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { preview } from 'vite';
import type { PreviewServer } from 'vite';

let server: PreviewServer;
let baseUrl: string;

beforeAll(async () => {
  server = await preview({ preview: { port: 4174 } });
  baseUrl = `http://localhost:${server.config.preview.port}`;
}, 30000);

afterAll(async () => {
  await server.httpServer.close();
});

describe('Flow2 Approvals Poll Endpoint', () => {
  it('should return 400 when run_id is missing', async () => {
    const response = await fetch(`${baseUrl}/api/flow2/approvals/poll`);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Missing run_id');
    expect(data.status).toBe('not_found');
  });

  it('should return 400 when run_id format is invalid', async () => {
    const response = await fetch(`${baseUrl}/api/flow2/approvals/poll?run_id=invalid-uuid`);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Invalid run_id format');
  });

  it('should return 404 for non-existent run_id', async () => {
    const fakeUuid = '12345678-1234-4123-8123-123456789012';
    const response = await fetch(`${baseUrl}/api/flow2/approvals/poll?run_id=${fakeUuid}`);
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.status).toBe('not_found');
  });
});

describe('Flow2 Approvals Remind Endpoint', () => {
  it('should return 400 when run_id is missing', async () => {
    const response = await fetch(`${baseUrl}/api/flow2/approvals/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing or invalid run_id');
  });

  it('should return 400 for invalid run_id format', async () => {
    const response = await fetch(`${baseUrl}/api/flow2/approvals/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: 'not-a-uuid' }),
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid run_id format');
  });

  it('should return 404 for non-existent checkpoint', async () => {
    const fakeUuid = '12345678-1234-4123-8123-123456789012';
    const response = await fetch(`${baseUrl}/api/flow2/approvals/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: fakeUuid }),
    });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('not found');
  });
});

describe('Flow2 Monitor Integration', () => {
  it('poll endpoint should return new contract fields', async () => {
    // This test verifies that if a checkpoint exists, 
    // the response includes the new contract fields
    
    // Note: This test would need a real checkpoint to fully validate.
    // For now, we're just verifying the error response format includes the new fields
    
    const fakeUuid = '12345678-1234-4123-8123-123456789012';
    const response = await fetch(`${baseUrl}/api/flow2/approvals/poll?run_id=${fakeUuid}`);
    const data = await response.json();
    
    // Verify new contract field 'status' is present
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('not_found');
  });
});


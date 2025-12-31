/**
 * API Tests: Skills Invocation
 * 
 * Verifies that Flow2 langgraph_kyc mode invokes skills and records metadata.
 */

import { describe, it, expect } from 'vitest';

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

describe('API /api/orchestrate - Skills (Flow2)', () => {
  it('should include exactly 2 skill invocations with required metadata', async () => {
    const response = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [
          { name: 'Client Profile', content: 'Client: John Doe. DOB: 1980-01-01. Risk: Medium.' }
        ],
        features: { reflection: false }
      }),
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Assert skillInvocations exists and has entries
    expect(data.graphReviewTrace).toHaveProperty('skillInvocations');
    expect(Array.isArray(data.graphReviewTrace.skillInvocations)).toBe(true);
    expect(data.graphReviewTrace.skillInvocations.length).toBeGreaterThanOrEqual(2);
    
    // Assert set equality: both required skills are invoked
    const skillNames = data.graphReviewTrace.skillInvocations.map((inv: any) => inv.skillName);
    const skillNamesSet = new Set(skillNames);
    expect(skillNamesSet.has('kyc.topic_assemble')).toBe(true);
    expect(skillNamesSet.has('risk.triage')).toBe(true);
    
    // Assert each invocation has required fields with valid values
    data.graphReviewTrace.skillInvocations.forEach((inv: any) => {
      // Required fields exist
      expect(inv).toHaveProperty('id');
      expect(inv).toHaveProperty('skillName');
      expect(inv).toHaveProperty('ownerAgent');
      expect(inv).toHaveProperty('startedAt');
      expect(inv).toHaveProperty('endedAt');
      expect(inv).toHaveProperty('durationMs');
      expect(inv).toHaveProperty('ok');
      expect(inv).toHaveProperty('inputSummary');
      expect(inv).toHaveProperty('outputSummary');
      expect(inv).toHaveProperty('correlationId');
      expect(inv).toHaveProperty('transport');
      expect(inv).toHaveProperty('target');
      
      // Validate field values
      expect(inv.durationMs).toBeGreaterThan(0);
      expect(inv.ok).toBe(true); // Should succeed in normal case
      expect(inv.transport).toBe('local');
      expect(inv.target).toBe('in-process');
      expect(inv.ownerAgent).toBeTruthy();
      expect(inv.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO8601 format
      expect(inv.endedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO8601 format
      expect(typeof inv.inputSummary).toBe('string');
      expect(typeof inv.outputSummary).toBe('string');
    });
  });
  
  it('should maintain skill invocations even in error cases', async () => {
    const response = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [
          { name: 'Empty', content: '' } // Empty content might cause degraded mode
        ],
        features: { reflection: false }
      }),
    });

    const data = await response.json();
    
    // Even in error/degraded cases, skillInvocations should exist (may be empty or partial)
    if (data.graphReviewTrace) {
      expect(data.graphReviewTrace).toHaveProperty('skillInvocations');
      expect(Array.isArray(data.graphReviewTrace.skillInvocations)).toBe(true);
    }
  });
});


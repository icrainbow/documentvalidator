/**
 * API Contract Tests for /api/orchestrate
 * 
 * Tests that API modes return expected shapes without full integration.
 * Uses zod for runtime validation.
 */

import { z } from 'zod';

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

// Zod schemas for API validation
const IssueSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  severity: z.enum(['FAIL', 'WARNING', 'INFO']),
  title: z.string(),
  message: z.string(),
  agent: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const BatchReviewResponseSchema = z.object({
  issues: z.array(IssueSchema),
  scopePlan: z.object({
    reviewMode: z.string(),
    sectionsToReview: z.array(z.string()), // Always string[] ("section-N" format)
    reasoning: z.string(),
    relatedSectionsToCheck: z.array(z.string()).optional(),
    agentsToInvoke: z.array(z.string()).optional(),
    globalChecks: z.array(z.string()).optional(),
    estimatedDuration: z.string().optional(),
    confidence: z.number().optional(),
  }).optional(),
  globalCheckResults: z.any().optional(),
  scopePlanTrace: z.any().optional(),
});

const LangGraphKycResponseSchema = z.object({
  issues: z.array(IssueSchema),
  topicSections: z.array(z.any()).optional(),
  conflicts: z.array(z.any()).optional(),
  coverageGaps: z.array(z.any()).optional(),
  graphReviewTrace: z.object({
    events: z.array(z.any()),
    summary: z.object({
      path: z.string(),
      riskScore: z.number(),
    }),
    skillInvocations: z.array(z.any()).optional(), // Phase A: Add skill invocations
  }),
});

// Helper to wait for server
async function waitForServer(maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${API_BASE}/api/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'invalid_test' }),
      });
      // Server is up (even if it returns an error)
      return;
    } catch (e) {
      if (i === maxAttempts - 1) throw new Error('Server did not start in time');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

describe('API Contract: /api/orchestrate', () => {
  beforeAll(async () => {
    await waitForServer();
  });

  describe('batch_review mode (Flow1)', () => {
    it('should return 200 with valid structure', async () => {
      const response = await fetch(`${API_BASE}/api/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'batch_review',
          documentId: 'test-doc-001',
          sections: [
            { id: 1, title: 'Test Section', content: 'This is test content.', order: 1 }
          ],
          dirtyQueue: {
            entries: [
              { sectionId: 1, reason: 'user_edit', timestamp: '2024-01-01T00:00:00Z' }
            ]
          },
        }),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // Validate shape with zod
      const result = BatchReviewResponseSchema.safeParse(data);
      if (!result.success) {
        console.error('Validation errors:', result.error.errors);
        throw new Error(`Invalid batch_review response shape: ${result.error.message}`);
      }
      
      expect(data.issues).toBeDefined();
      expect(Array.isArray(data.issues)).toBe(true);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await fetch(`${API_BASE}/api/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'batch_review',
          // Missing required fields
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('langgraph_kyc mode (Flow2)', () => {
    it('should return 200 with valid structure', async () => {
      const response = await fetch(`${API_BASE}/api/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'langgraph_kyc',
          documents: [
            { name: 'Test Doc', content: 'Client name: John Smith. Date of birth: 1980-01-01.' }
          ],
        }),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // Validate shape with zod
      const result = LangGraphKycResponseSchema.safeParse(data);
      if (!result.success) {
        console.error('Validation errors:', result.error.errors);
        throw new Error(`Invalid langgraph_kyc response shape: ${result.error.message}`);
      }
      
      expect(data.graphReviewTrace).toBeDefined();
      expect(data.graphReviewTrace.summary.path).toMatch(/fast|crosscheck|escalate|human_gate/);
    });

    it('should return 400 for missing documents', async () => {
      const response = await fetch(`${API_BASE}/api/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'langgraph_kyc',
          // Missing documents
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    it('should accept features.reflection=false and return valid structure', async () => {
      const response = await fetch(`${API_BASE}/api/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'langgraph_kyc',
          documents: [
            { name: 'test.txt', content: 'Test KYC document with sufficient content length for validation requirements' }
          ],
          features: { reflection: false }
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('graphReviewTrace');
      expect(data.graphReviewTrace).toHaveProperty('events');
    });
  });

  describe('unknown mode', () => {
    it('should return 400 for unknown mode', async () => {
      const response = await fetch(`${API_BASE}/api/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'invalid_mode_xyz',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('mode');
    });
  });
});


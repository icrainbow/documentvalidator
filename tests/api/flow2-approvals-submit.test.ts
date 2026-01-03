/**
 * API Tests: Flow2 Approvals Submit Endpoint
 * 
 * Tests for /api/flow2/approvals/submit (Stage 1 human review)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    method: string;
    headers: Map<string, string>;
    body: any;
    
    constructor(url: string, init?: any) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.body = init?.body;
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
  },
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
    }),
  },
}));

// Mock checkpoint store
jest.mock('@/app/lib/flow2/checkpointStore', () => ({
  getTokenMetadata: jest.fn(),
  loadCheckpoint: jest.fn(),
  saveCheckpoint: jest.fn(),
}));

// Mock submitDecision
jest.mock('@/app/lib/flow2/submitDecision', () => ({
  finalizeDecision: jest.fn(),
}));

import { POST } from '@/app/api/flow2/approvals/submit/route';
import { getTokenMetadata } from '@/app/lib/flow2/checkpointStore';
import { finalizeDecision } from '@/app/lib/flow2/submitDecision';

describe('POST /api/flow2/approvals/submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Field name validation', () => {
    it('should reject request with "decision" instead of "action"', async () => {
      const mockRequest = new (require('next/server').NextRequest)('http://localhost/api/flow2/approvals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'test-token-1234567890123456',
          decision: 'approve',  // Wrong field name
          signer: 'Test User',
        }),
      });

      const response = await POST(mockRequest as any);
      const data = await response.json();

      // Should fail validation because 'action' is missing
      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error_code).toBe('INVALID_ACTION');
      expect(data.message).toContain('action must be "approve" or "reject"');
    });

    it('should accept request with correct "action" field', async () => {
      // Mock successful token resolution
      (getTokenMetadata as jest.Mock).mockResolvedValue({
        run_id: 'test-run-id-12345678',
        type: 'stage1',
      });

      // Mock successful decision finalization
      (finalizeDecision as jest.Mock).mockResolvedValue({
        ok: true,
        status: 'finalized',
        run_id: 'test-run-id-12345678',
        decision: 'approve',
        message: 'Decision finalized successfully',
      });

      const mockRequest = new (require('next/server').NextRequest)('http://localhost/api/flow2/approvals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'test-token-1234567890123456',
          action: 'approve',  // Correct field name
          signer: 'Test User',
        }),
      });

      const response = await POST(mockRequest as any);
      const data = await response.json();

      // Should succeed
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.decision).toBe('approve');
      expect(finalizeDecision).toHaveBeenCalledWith(
        'test-token-1234567890123456',
        'approve',
        undefined,
        expect.objectContaining({
          decided_by: 'Test User',
          finalized_via: 'web_form',
        })
      );
    });
  });

  describe('Token validation', () => {
    it('should return 400 for missing token', async () => {
      const mockRequest = new (require('next/server').NextRequest)('http://localhost/api/flow2/approvals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          signer: 'Test User',
        }),
      });

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error_code).toBe('MISSING_TOKEN');
    });

    it('should return 404 for invalid/expired token', async () => {
      // Mock token not found
      (getTokenMetadata as jest.Mock).mockResolvedValue(null);
      
      (finalizeDecision as jest.Mock).mockResolvedValue({
        ok: false,
        status: 'not_found',
        message: 'Token not found or expired',
      });

      const mockRequest = new (require('next/server').NextRequest)('http://localhost/api/flow2/approvals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'invalid-token-999',
          action: 'approve',
          signer: 'Test User',
        }),
      });

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.ok).toBe(false);
      expect(data.error_code).toBe('NOT_FOUND');
    });

    it('should reject EDD tokens with friendly message', async () => {
      // Mock EDD token detection
      (getTokenMetadata as jest.Mock).mockResolvedValue({
        run_id: 'test-edd-run-id',
        type: 'edd',
      });

      (finalizeDecision as jest.Mock).mockResolvedValue({
        ok: false,
        status: 'validation_failed',
        message: 'This is an EDD token. Please use the EDD approval page',
      });

      const mockRequest = new (require('next/server').NextRequest)('http://localhost/api/flow2/approvals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'edd-token-1234567890123456',
          action: 'approve',
          signer: 'Test User',
        }),
      });

      const response = await POST(mockRequest as any);
      const data = await response.json();

      // Should fail with validation error
      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
    });
  });

  describe('Action validation', () => {
    it('should accept "approve" action', async () => {
      (finalizeDecision as jest.Mock).mockResolvedValue({
        ok: true,
        status: 'finalized',
        run_id: 'test-run-id',
        decision: 'approve',
        message: 'Approved',
      });

      const mockRequest = new (require('next/server').NextRequest)('http://localhost/api/flow2/approvals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'test-token-1234567890123456',
          action: 'approve',
          signer: 'Test User',
        }),
      });

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(data.ok).toBe(true);
      expect(data.decision).toBe('approve');
    });

    it('should accept "reject" action with reason', async () => {
      (finalizeDecision as jest.Mock).mockResolvedValue({
        ok: true,
        status: 'finalized',
        run_id: 'test-run-id',
        decision: 'reject',
        message: 'Rejected',
      });

      const mockRequest = new (require('next/server').NextRequest)('http://localhost/api/flow2/approvals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'test-token-1234567890123456',
          action: 'reject',
          reason: 'Test rejection reason that is long enough',
          signer: 'Test User',
        }),
      });

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(data.ok).toBe(true);
      expect(data.decision).toBe('reject');
    });

    it('should reject "reject" action without reason', async () => {
      const mockRequest = new (require('next/server').NextRequest)('http://localhost/api/flow2/approvals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'test-token-1234567890123456',
          action: 'reject',
          signer: 'Test User',
          // Missing reason
        }),
      });

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error_code).toBe('MISSING_REASON');
    });

    it('should reject reason shorter than 10 characters', async () => {
      const mockRequest = new (require('next/server').NextRequest)('http://localhost/api/flow2/approvals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'test-token-1234567890123456',
          action: 'reject',
          reason: 'Too short',  // 9 chars
          signer: 'Test User',
        }),
      });

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error_code).toBe('INVALID_REASON');
    });
  });
});



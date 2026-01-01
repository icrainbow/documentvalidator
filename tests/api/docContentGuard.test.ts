/**
 * Document Content Guard Tests
 * 
 * Validates that empty/invalid document content is rejected at API layer
 * before entering orchestration logic (堵死空跑路径).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Flow2 Document Content Guard', () => {
  let serverUrl: string;
  
  beforeAll(async () => {
    serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000';
  });
  
  it('[GUARD-1] Rejects empty document content', async () => {
    const response = await fetch(`${serverUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [
          { name: 'empty.txt', content: '' }
        ],
        features: { reflection: false }
      })
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error_code).toBe('EMPTY_DOCUMENT_CONTENT');
    expect(data.error).toContain('empty.txt');
  });
  
  it('[GUARD-2] Rejects content shorter than 20 chars', async () => {
    const response = await fetch(`${serverUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [
          { name: 'short.txt', content: 'Too short' }
        ],
        features: { reflection: false }
      })
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error_code).toBe('EMPTY_DOCUMENT_CONTENT');
    expect(data.content_length).toBeLessThan(20);
  });
  
  it('[GUARD-3] Rejects document missing name', async () => {
    const response = await fetch(`${serverUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [
          { content: 'This document has no name field but has enough content to pass length check' }
        ],
        features: { reflection: false }
      })
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error_code).toBe('INVALID_DOCUMENT_NAME');
  });
  
  it('[GUARD-4] Rejects document missing content field', async () => {
    const response = await fetch(`${serverUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [
          { name: 'nocontent.txt' }
        ],
        features: { reflection: false }
      })
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error_code).toBe('MISSING_DOCUMENT_CONTENT');
    expect(data.error).toContain('nocontent.txt');
  });
  
  it('[GUARD-5] Accepts valid document with sufficient content', async () => {
    const validContent = 'This is a valid KYC document with more than 20 characters of content.';
    
    const response = await fetch(`${serverUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [
          { name: 'valid.txt', content: validContent }
        ],
        features: { reflection: false }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    // Should not have error_code (successful execution)
    expect(data.error_code).toBeUndefined();
    // Should have issues array (even if empty)
    expect(data.issues).toBeDefined();
  });
  
  it('[GUARD-6] Rejects empty documents array', async () => {
    const response = await fetch(`${serverUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [],
        features: { reflection: false }
      })
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error_code).toBe('MISSING_DOCUMENTS');
  });
});


/**
 * Phase 3: API Tests for Graph Definition Metadata
 * 
 * Tests that Flow2 API responses include graph metadata, definition, and diff.
 */

import { describe, it, expect } from 'vitest';

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

const sampleDocuments = [
  { name: 'Client KYC Document', content: 'Client: John Doe. DOB: 1980-01-01. Source of wealth: Salary from ABC Corp.' }
];

describe('Graph Definition Metadata (Flow2)', () => {
  it('includes graph metadata in graphReviewTrace', async () => {
    const response = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: sampleDocuments
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Graph metadata should always be present
    expect(data.graphReviewTrace).toBeDefined();
    expect(data.graphReviewTrace.graph).toBeDefined();
    expect(data.graphReviewTrace.graph.graphId).toBe('flow2_kyc_v1');
    expect(data.graphReviewTrace.graph.version).toMatch(/^\d+\.\d+\.\d+$/); // Semver pattern
    expect(data.graphReviewTrace.graph.checksum).toBeDefined();
    expect(data.graphReviewTrace.graph.checksum).toHaveLength(12);
  });
  
  it('checksum is stable across multiple runs', async () => {
    const body = JSON.stringify({
      mode: 'langgraph_kyc',
      documents: sampleDocuments
    });
    
    // Run 1
    const response1 = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data1 = await response1.json();
    
    // Run 2
    const response2 = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data2 = await response2.json();
    
    // Checksums should match (stable)
    expect(data1.graphReviewTrace.graph.checksum).toBe(data2.graphReviewTrace.graph.checksum);
  });
  
  it('includes graphDefinition in test environment', async () => {
    const response = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: sampleDocuments
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // In test environment (NODE_ENV !== 'production'), graphDefinition should be present
    expect(data.graphReviewTrace.graphDefinition).toBeDefined();
    expect(data.graphReviewTrace.graphDefinition.nodes).toBeDefined();
    expect(Array.isArray(data.graphReviewTrace.graphDefinition.nodes)).toBe(true);
    expect(data.graphReviewTrace.graphDefinition.nodes.length).toBe(8); // 8 top-level nodes
    expect(data.graphReviewTrace.graphDefinition.edges).toBeDefined();
    expect(Array.isArray(data.graphReviewTrace.graphDefinition.edges)).toBe(true);
    expect(data.graphReviewTrace.graphDefinition.edges.length).toBeGreaterThanOrEqual(12); // At least 12 edges
    expect(data.graphReviewTrace.graphDefinition.entryNodeId).toBe('topic_assembler');
  });
  
  it('graphDefinition has correct structure', async () => {
    const response = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: sampleDocuments
      }),
    });

    const data = await response.json();
    const definition = data.graphReviewTrace.graphDefinition;
    
    // Check all nodes have required fields
    definition.nodes.forEach((node: any) => {
      expect(node.id).toBeDefined();
      expect(typeof node.id).toBe('string');
      expect(node.type).toBeDefined();
      expect(['agent', 'skill', 'router', 'gate', 'system']).toContain(node.type);
      expect(node.label).toBeDefined();
      expect(node.description).toBeDefined();
    });
    
    // Check all edges have valid fromNodeId and toNodeId
    const nodeIds = new Set(definition.nodes.map((n: any) => n.id));
    definition.edges.forEach((edge: any) => {
      expect(edge.id).toBeDefined();
      expect(edge.fromNodeId).toBeDefined();
      expect(edge.toNodeId).toBeDefined();
      expect(nodeIds.has(edge.fromNodeId)).toBe(true); // fromNodeId must exist
      expect(nodeIds.has(edge.toNodeId)).toBe(true); // toNodeId must exist
    });
    
    // Check entryNodeId is a valid node
    expect(nodeIds.has(definition.entryNodeId)).toBe(true);
  });
  
  it('does not break existing Flow2 response structure', async () => {
    const response = await fetch(`${API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: sampleDocuments
      }),
    });

    const data = await response.json();
    
    // All existing fields should still be present
    expect(data.issues).toBeDefined();
    expect(Array.isArray(data.issues)).toBe(true);
    expect(data.graphReviewTrace).toBeDefined();
    expect(data.graphReviewTrace.events).toBeDefined();
    expect(data.graphReviewTrace.summary).toBeDefined();
    expect(data.graphReviewTrace.summary.path).toBeDefined();
    expect(data.graphReviewTrace.summary.riskScore).toBeDefined();
    
    // New fields are additive (optional)
    if (data.graphReviewTrace.graphDiff) {
      expect(data.graphReviewTrace.graphDiff.fromVersion).toBeDefined();
      expect(data.graphReviewTrace.graphDiff.toVersion).toBeDefined();
      expect(Array.isArray(data.graphReviewTrace.graphDiff.changes)).toBe(true);
    }
  });
});


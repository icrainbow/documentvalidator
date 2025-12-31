/**
 * Phase 4: API Tests for Graph Draft Validation and Saving
 */

import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

// Sample valid graph definition
const validDraft = {
  graphId: 'test_graph',
  version: '1.0.0',
  checksum: 'abc123def456',
  description: 'Test graph for validation',
  entryNodeId: 'node_a',
  nodes: [
    {
      id: 'node_a',
      type: 'skill',
      label: 'Node A',
      description: 'First test node'
    },
    {
      id: 'node_b',
      type: 'system',
      label: 'Node B',
      description: 'Second test node'
    }
  ],
  edges: [
    {
      id: 'edge_1',
      fromNodeId: 'node_a',
      toNodeId: 'node_b',
      label: 'test edge'
    }
  ]
};

describe('Graph Draft API', () => {
  // Track created draft files for cleanup
  const createdDrafts: string[] = [];

  afterAll(() => {
    // Clean up created draft files
    createdDrafts.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[Cleanup] Deleted: ${filePath}`);
        }
      } catch (error) {
        console.error(`[Cleanup] Failed to delete ${filePath}:`, error);
      }
    });
  });

  describe('POST /api/graphs/validate-draft', () => {
    it('validates a valid graph definition', async () => {
      const response = await fetch(`${API_BASE}/api/graphs/validate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphDraft: validDraft })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.parsed).toBeDefined();
      expect(data.parsed.graphId).toBe('test_graph');
    });

    it('rejects invalid JSON types', async () => {
      const response = await fetch(`${API_BASE}/api/graphs/validate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphDraft: 'not an object' })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.errors).toBeDefined();
      expect(Array.isArray(data.errors)).toBe(true);
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it('rejects graph with missing required fields', async () => {
      const incompleteDraft = {
        graphId: 'incomplete',
        // Missing: version, checksum, description, nodes, edges, entryNodeId
      };

      const response = await fetch(`${API_BASE}/api/graphs/validate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphDraft: incompleteDraft })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.errors).toBeDefined();
      expect(data.errors.some((e: any) => e.path.includes('version'))).toBe(true);
    });

    it('rejects graph with invalid node type', async () => {
      const invalidNodeDraft = {
        ...validDraft,
        nodes: [
          {
            id: 'bad_node',
            type: 'invalid_type', // Should be one of: agent, skill, router, gate, system
            label: 'Bad Node',
            description: 'Invalid type'
          }
        ]
      };

      const response = await fetch(`${API_BASE}/api/graphs/validate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphDraft: invalidNodeDraft })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.errors).toBeDefined();
      expect(data.errors.some((e: any) => e.path.includes('nodes'))).toBe(true);
    });
  });

  describe('POST /api/graphs/save-draft', () => {
    it('saves a valid draft to file system', async () => {
      const response = await fetch(`${API_BASE}/api/graphs/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphDraft: validDraft,
          base: { version: '1.0.0', checksum: 'baseline123' }
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.draftId).toBeDefined();
      expect(data.savedAt).toBeDefined();
      expect(data.filePath).toBeDefined();
      expect(data.filePath).toContain('.local/graph-drafts');
      expect(data.filePath).toContain('flow2GraphDraft');

      // Verify file exists
      const fullPath = path.join(process.cwd(), data.filePath);
      expect(fs.existsSync(fullPath)).toBe(true);

      // Track for cleanup
      createdDrafts.push(fullPath);

      // Verify file structure
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const draftFile = JSON.parse(fileContent);
      
      expect(draftFile.draft).toBeDefined();
      expect(draftFile.metadata).toBeDefined();
      expect(draftFile.metadata.draftId).toBe(data.draftId);
      expect(draftFile.metadata.baseVersion).toBe('1.0.0');
      expect(draftFile.metadata.baseChecksum).toBe('baseline123');
      expect(draftFile.metadata.createdBy).toBe('local-dev');
      
      // Verify draft content
      expect(draftFile.draft.graphId).toBe('test_graph');
      expect(draftFile.draft.version).toBe('1.0.0');
    });

    it('rejects invalid draft (validation failure)', async () => {
      const invalidDraft = {
        invalid: 'data',
        missing: 'required fields'
      };

      const response = await fetch(`${API_BASE}/api/graphs/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphDraft: invalidDraft,
          base: { version: '1.0.0', checksum: 'test' }
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('generates unique draft IDs for multiple saves', async () => {
      const draftIds = new Set<string>();
      
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${API_BASE}/api/graphs/save-draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            graphDraft: validDraft,
            base: { version: '1.0.0', checksum: 'test' }
          })
        });

        const data = await response.json();
        expect(data.ok).toBe(true);
        draftIds.add(data.draftId);
        
        // Track for cleanup
        const fullPath = path.join(process.cwd(), data.filePath);
        createdDrafts.push(fullPath);
      }
      
      // All IDs should be unique
      expect(draftIds.size).toBe(3);
    });
  });
});


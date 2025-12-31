/**
 * Phase 3: Unit Tests for Graph Utilities
 * 
 * Tests checksum computation and diff algorithm.
 */

import { describe, it, expect } from 'vitest';
import { computeChecksum, computeGraphDiff } from '../../app/lib/graphs/graphUtils';
import type { GraphDefinition } from '../../app/lib/graphs/types';

describe('computeChecksum', () => {
  it('produces consistent checksum for same definition', () => {
    const def: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test graph',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'First node' },
        { id: 'node_b', type: 'skill', label: 'Node B', description: 'Second node' }
      ],
      edges: [
        { id: 'edge_1', fromNodeId: 'node_a', toNodeId: 'node_b' }
      ]
    };
    
    const checksum1 = computeChecksum(def);
    const checksum2 = computeChecksum(def);
    
    expect(checksum1).toBe(checksum2);
    expect(checksum1).toHaveLength(12);
  });
  
  it('produces different checksum for different nodes', () => {
    const def1: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test graph',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'First node' }
      ],
      edges: []
    };
    
    const def2: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test graph',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'DIFFERENT description' }
      ],
      edges: []
    };
    
    const checksum1 = computeChecksum(def1);
    const checksum2 = computeChecksum(def2);
    
    expect(checksum1).not.toBe(checksum2);
  });
  
  it('excludes metadata from checksum', () => {
    const def1: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test graph',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'First node' }
      ],
      edges: [],
      metadata: {
        createdAt: '2025-12-31T00:00:00Z',
        author: 'Author 1',
        changelog: ['Initial']
      }
    };
    
    const def2: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test graph',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'First node' }
      ],
      edges: [],
      metadata: {
        createdAt: '2025-12-31T12:00:00Z', // DIFFERENT
        author: 'Author 2', // DIFFERENT
        changelog: ['Initial', 'Updated'] // DIFFERENT
      }
    };
    
    const checksum1 = computeChecksum(def1);
    const checksum2 = computeChecksum(def2);
    
    // Checksums should be identical because metadata is excluded
    expect(checksum1).toBe(checksum2);
  });
  
  it('handles node reordering (stable sort by ID)', () => {
    const def1: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test graph',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'First' },
        { id: 'node_b', type: 'skill', label: 'Node B', description: 'Second' }
      ],
      edges: []
    };
    
    const def2: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test graph',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_b', type: 'skill', label: 'Node B', description: 'Second' }, // REORDERED
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'First' }
      ],
      edges: []
    };
    
    const checksum1 = computeChecksum(def1);
    const checksum2 = computeChecksum(def2);
    
    // Checksums should be identical despite node reordering
    expect(checksum1).toBe(checksum2);
  });
});

describe('computeGraphDiff', () => {
  it('detects node config modification', () => {
    const v1: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'system', label: 'Node A', description: 'Test', config: { parallelism: 'unlimited' } }
      ],
      edges: []
    };
    
    const v2: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.1',
      checksum: '',
      description: 'Test',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'system', label: 'Node A', description: 'Test', config: { parallelism: '3' } }
      ],
      edges: []
    };
    
    const diff = computeGraphDiff(v1, v2);
    
    expect(diff.fromVersion).toBe('1.0.0');
    expect(diff.toVersion).toBe('1.0.1');
    expect(diff.changes.length).toBeGreaterThan(0);
    expect(diff.changes.some(c => c.type === 'node_modified' && c.path.includes('config'))).toBe(true);
  });
  
  it('detects node description modification', () => {
    const v1: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'system', label: 'Node A', description: 'Original description' }
      ],
      edges: []
    };
    
    const v2: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.1',
      checksum: '',
      description: 'Test',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'system', label: 'Node A', description: 'Modified description' }
      ],
      edges: []
    };
    
    const diff = computeGraphDiff(v1, v2);
    
    expect(diff.changes).toContainEqual(expect.objectContaining({
      type: 'node_modified',
      path: 'nodes[node_a].description',
      oldValue: 'Original description',
      newValue: 'Modified description'
    }));
  });
  
  it('detects edge label modification', () => {
    const v1: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'Test' },
        { id: 'node_b', type: 'skill', label: 'Node B', description: 'Test' }
      ],
      edges: [
        { id: 'edge_1', fromNodeId: 'node_a', toNodeId: 'node_b', label: 'if condition A' }
      ]
    };
    
    const v2: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.1',
      checksum: '',
      description: 'Test',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'Test' },
        { id: 'node_b', type: 'skill', label: 'Node B', description: 'Test' }
      ],
      edges: [
        { id: 'edge_1', fromNodeId: 'node_a', toNodeId: 'node_b', label: 'condition_path' }
      ]
    };
    
    const diff = computeGraphDiff(v1, v2);
    
    expect(diff.changes).toContainEqual(expect.objectContaining({
      type: 'edge_modified',
      path: 'edges[edge_1].label',
      oldValue: 'if condition A',
      newValue: 'condition_path'
    }));
  });
  
  it('returns empty changes for identical definitions', () => {
    const v1: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'Test' }
      ],
      edges: []
    };
    
    const v2: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'Test' }
      ],
      edges: []
    };
    
    const diff = computeGraphDiff(v1, v2);
    
    expect(diff.changes).toHaveLength(0);
  });
  
  it('generates human-readable descriptions', () => {
    const v1: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.0',
      checksum: '',
      description: 'Test',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'Test' }
      ],
      edges: []
    };
    
    const v2: GraphDefinition = {
      graphId: 'test_graph',
      version: '1.0.1',
      checksum: '',
      description: 'Test',
      entryNodeId: 'node_a',
      nodes: [
        { id: 'node_a', type: 'skill', label: 'Node A', description: 'Updated test' }
      ],
      edges: []
    };
    
    const diff = computeGraphDiff(v1, v2);
    
    expect(diff.changes[0].description).toBeTruthy();
    expect(typeof diff.changes[0].description).toBe('string');
    expect(diff.changes[0].description.length).toBeGreaterThan(0);
  });
});


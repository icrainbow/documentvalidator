/**
 * Phase 3: Graph Utilities - Checksum & Diff
 * 
 * Provides stable checksum computation and diff algorithm for graph definitions.
 */

import crypto from 'crypto';
import type { GraphDefinition, GraphDiff, GraphChange, GraphNode, GraphEdge } from './types';

/**
 * Compute stable SHA-256 checksum for a graph definition
 * 
 * CRITICAL CONSTRAINTS:
 * 1. EXCLUDES: metadata, checksum fields (avoid self-reference)
 * 2. Stable sorting: nodes and edges sorted by ID
 * 3. Normalized optional fields: binding || null, config || null
 * 
 * @param definition - Graph definition to hash
 * @returns First 12 characters of SHA-256 hash
 */
export function computeChecksum(definition: GraphDefinition): string {
  // Step 1: Build stable definition (sorted, normalized, excludes metadata & checksum)
  const stableDef = {
    graphId: definition.graphId,
    version: definition.version,
    description: definition.description,
    entryNodeId: definition.entryNodeId,
    nodes: definition.nodes
      .map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        description: n.description,
        binding: n.binding || null,
        config: n.config || null
      }))
      .sort((a, b) => a.id.localeCompare(b.id)), // Sort nodes by ID
    edges: definition.edges
      .map(e => ({
        id: e.id,
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
        condition: e.condition || null,
        label: e.label || null
      }))
      .sort((a, b) => a.id.localeCompare(b.id)) // Sort edges by ID
    // EXCLUDE: metadata (createdAt, author, changelog) - version metadata only
    // EXCLUDE: checksum (avoid self-reference)
  };
  
  // Step 2: Serialize to stable JSON (no whitespace)
  const stableJson = JSON.stringify(stableDef);
  
  // Step 3: Compute SHA-256 hash
  const hash = crypto.createHash('sha256').update(stableJson, 'utf8').digest('hex');
  
  // Step 4: Return first 12 characters
  return hash.substring(0, 12);
}

/**
 * Compute diff between two graph definitions
 * 
 * Detects changes at node and edge level:
 * - Node modifications: description, config, label, binding changes
 * - Edge modifications: label, condition changes
 * 
 * @param v1 - Source graph definition
 * @param v2 - Target graph definition
 * @returns Structured diff with change list
 */
export function computeGraphDiff(v1: GraphDefinition, v2: GraphDefinition): GraphDiff {
  const changes: GraphChange[] = [];
  
  // Create lookup maps for efficient comparison
  const v1NodesMap = new Map(v1.nodes.map(n => [n.id, n]));
  const v2NodesMap = new Map(v2.nodes.map(n => [n.id, n]));
  const v1EdgesMap = new Map(v1.edges.map(e => [e.id, e]));
  const v2EdgesMap = new Map(v2.edges.map(e => [e.id, e]));
  
  // Compare nodes
  for (const [nodeId, v2Node] of Array.from(v2NodesMap)) {
    const v1Node = v1NodesMap.get(nodeId);
    
    if (!v1Node) {
      // Node added
      changes.push({
        type: 'node_added',
        path: `nodes[${nodeId}]`,
        newValue: v2Node,
        description: `Added node: ${nodeId}`
      });
    } else {
      // Check for modifications
      if (v1Node.description !== v2Node.description) {
        changes.push({
          type: 'node_modified',
          path: `nodes[${nodeId}].description`,
          oldValue: v1Node.description,
          newValue: v2Node.description,
          description: `Modified ${nodeId} description`
        });
      }
      
      if (JSON.stringify(v1Node.config) !== JSON.stringify(v2Node.config)) {
        changes.push({
          type: 'node_modified',
          path: `nodes[${nodeId}].config`,
          oldValue: v1Node.config,
          newValue: v2Node.config,
          description: `Modified ${nodeId} config`
        });
      }
      
      if (v1Node.label !== v2Node.label) {
        changes.push({
          type: 'node_modified',
          path: `nodes[${nodeId}].label`,
          oldValue: v1Node.label,
          newValue: v2Node.label,
          description: `Modified ${nodeId} label`
        });
      }
      
      if (JSON.stringify(v1Node.binding) !== JSON.stringify(v2Node.binding)) {
        changes.push({
          type: 'node_modified',
          path: `nodes[${nodeId}].binding`,
          oldValue: v1Node.binding,
          newValue: v2Node.binding,
          description: `Modified ${nodeId} binding`
        });
      }
    }
  }
  
  // Check for removed nodes
  for (const nodeId of Array.from(v1NodesMap.keys())) {
    if (!v2NodesMap.has(nodeId)) {
      changes.push({
        type: 'node_removed',
        path: `nodes[${nodeId}]`,
        oldValue: v1NodesMap.get(nodeId),
        description: `Removed node: ${nodeId}`
      });
    }
  }
  
  // Compare edges
  for (const [edgeId, v2Edge] of Array.from(v2EdgesMap)) {
    const v1Edge = v1EdgesMap.get(edgeId);
    
    if (!v1Edge) {
      // Edge added
      changes.push({
        type: 'edge_added',
        path: `edges[${edgeId}]`,
        newValue: v2Edge,
        description: `Added edge: ${edgeId} (${v2Edge.fromNodeId} → ${v2Edge.toNodeId})`
      });
    } else {
      // Check for modifications
      if (v1Edge.label !== v2Edge.label) {
        changes.push({
          type: 'edge_modified',
          path: `edges[${edgeId}].label`,
          oldValue: v1Edge.label,
          newValue: v2Edge.label,
          description: `Modified ${edgeId} label`
        });
      }
      
      if (JSON.stringify(v1Edge.condition) !== JSON.stringify(v2Edge.condition)) {
        changes.push({
          type: 'edge_modified',
          path: `edges[${edgeId}].condition`,
          oldValue: v1Edge.condition,
          newValue: v2Edge.condition,
          description: `Modified ${edgeId} condition`
        });
      }
      
      if (v1Edge.fromNodeId !== v2Edge.fromNodeId || v1Edge.toNodeId !== v2Edge.toNodeId) {
        changes.push({
          type: 'edge_modified',
          path: `edges[${edgeId}]`,
          oldValue: { fromNodeId: v1Edge.fromNodeId, toNodeId: v1Edge.toNodeId },
          newValue: { fromNodeId: v2Edge.fromNodeId, toNodeId: v2Edge.toNodeId },
          description: `Modified ${edgeId} connection`
        });
      }
    }
  }
  
  // Check for removed edges
  for (const edgeId of Array.from(v1EdgesMap.keys())) {
    if (!v2EdgesMap.has(edgeId)) {
      const v1Edge = v1EdgesMap.get(edgeId)!;
      changes.push({
        type: 'edge_removed',
        path: `edges[${edgeId}]`,
        oldValue: v1Edge,
        description: `Removed edge: ${edgeId} (${v1Edge.fromNodeId} → ${v1Edge.toNodeId})`
      });
    }
  }
  
  return {
    fromVersion: v1.version,
    toVersion: v2.version,
    changes
  };
}


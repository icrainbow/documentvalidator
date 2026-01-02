#!/usr/bin/env node

/**
 * Flow2 to n8n Workflow Exporter
 * 
 * Exports Flow2 graph definition to n8n workflow JSON format.
 * 
 * Strategy:
 * 1. RUNTIME-FIRST: Fetch graph definition from running dev server
 * 2. STATIC FALLBACK: Parse flow2GraphV1.ts if server unavailable
 * 
 * Usage:
 *   npm run export:flow2:n8n
 *   BASE_URL=http://localhost:3001 npm run export:flow2:n8n
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_PATH = join(projectRoot, 'artifacts', 'flow2.n8n.json');

// Sample document for orchestrate API (minimal)
const SAMPLE_DOCUMENT = {
  name: 'export-test.txt',
  content: 'This is a minimal document for graph export. Client: Test User. Purpose: Export graph definition only.'
};

/**
 * Fetch graph definition from runtime (dev server)
 */
async function fetchGraphFromRuntime() {
  console.log(`[Runtime] Attempting to fetch graph from ${BASE_URL}/api/orchestrate...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [SAMPLE_DOCUMENT]
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.graphReviewTrace?.graphDefinition) {
      throw new Error('Response missing graphReviewTrace.graphDefinition (may be production mode)');
    }

    console.log(`[Runtime] ✓ Successfully fetched graph definition`);
    console.log(`[Runtime]   - graphId: ${data.graphReviewTrace.graphDefinition.graphId}`);
    console.log(`[Runtime]   - version: ${data.graphReviewTrace.graphDefinition.version}`);
    console.log(`[Runtime]   - nodes: ${data.graphReviewTrace.graphDefinition.nodes.length}`);
    console.log(`[Runtime]   - edges: ${data.graphReviewTrace.graphDefinition.edges.length}`);

    return {
      mode: 'runtime',
      endpoint: `${BASE_URL}/api/orchestrate`,
      graph: data.graphReviewTrace.graphDefinition
    };
  } catch (error) {
    console.warn(`[Runtime] ✗ Failed: ${error.message}`);
    return null;
  }
}

/**
 * Extract graph definition from static source code
 */
function extractGraphFromStatic() {
  console.log(`[Static] Falling back to static extraction from flow2GraphV1.ts...`);
  
  try {
    const filePath = join(projectRoot, 'app', 'lib', 'graphs', 'flow2GraphV1.ts');
    const sourceCode = readFileSync(filePath, 'utf-8');
    
    // Extract the graph definition object
    // This is a simple regex-based extraction - assumes flow2GraphV1 is well-formed
    const match = sourceCode.match(/export const flow2GraphV1[:\s]*GraphDefinition\s*=\s*({[\s\S]*?});/);
    
    if (!match) {
      throw new Error('Could not parse flow2GraphV1 export from source');
    }
    
    // Use eval to parse (safe in build scripts, avoid in production)
    // Alternative: use a proper TS parser like ts-morph
    const graphDefCode = match[1]
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
    
    // For simplicity, manually construct from known structure
    // (Proper implementation would use ts-morph or import the TS file)
    
    // Parse nodes
    const nodesMatch = sourceCode.match(/nodes:\s*\[([\s\S]*?)\]/);
    const edgesMatch = sourceCode.match(/edges:\s*\[([\s\S]*?)\]/);
    const entryMatch = sourceCode.match(/entryNodeId:\s*['"]([^'"]+)['"]/);
    const graphIdMatch = sourceCode.match(/graphId:\s*['"]([^'"]+)['"]/);
    const versionMatch = sourceCode.match(/version:\s*['"]([^'"]+)['"]/);
    
    // Simplified: extract node IDs
    const nodeIds = [];
    const nodeMatches = sourceCode.matchAll(/id:\s*['"]([^'"]+)['"]/g);
    for (const m of nodeMatches) {
      if (!nodeIds.includes(m[1])) {
        nodeIds.push(m[1]);
      }
    }
    
    // Simplified: extract edges
    const edges = [];
    const edgeMatches = sourceCode.matchAll(/fromNodeId:\s*['"]([^'"]+)['"],[\s\S]*?toNodeId:\s*['"]([^'"]+)['"]/g);
    for (const m of edgeMatches) {
      edges.push({ fromNodeId: m[1], toNodeId: m[2] });
    }
    
    console.log(`[Static] ✓ Extracted graph structure`);
    console.log(`[Static]   - graphId: ${graphIdMatch ? graphIdMatch[1] : 'unknown'}`);
    console.log(`[Static]   - version: ${versionMatch ? versionMatch[1] : 'unknown'}`);
    console.log(`[Static]   - nodes: ${nodeIds.length}`);
    console.log(`[Static]   - edges: ${edges.length}`);
    
    // Reconstruct minimal graph definition
    return {
      mode: 'static',
      source: filePath,
      graph: {
        graphId: graphIdMatch ? graphIdMatch[1] : 'flow2_kyc_v1',
        version: versionMatch ? versionMatch[1] : '1.0.0',
        entryNodeId: entryMatch ? entryMatch[1] : nodeIds[0],
        nodes: nodeIds.map(id => ({
          id,
          type: inferNodeType(id),
          label: formatLabel(id),
          description: `Flow2 node: ${id}`
        })),
        edges: edges.map((e, i) => ({
          id: `edge_${i + 1}`,
          fromNodeId: e.fromNodeId,
          toNodeId: e.toNodeId
        }))
      }
    };
  } catch (error) {
    console.error(`[Static] ✗ Failed: ${error.message}`);
    throw new Error('Both runtime and static extraction failed');
  }
}

/**
 * Infer node type from ID (for static fallback)
 */
function inferNodeType(nodeId) {
  if (nodeId.includes('human') || nodeId.includes('gate') || nodeId.includes('approval')) {
    return 'gate';
  }
  if (nodeId.includes('router') || nodeId.includes('routing')) {
    return 'router';
  }
  if (nodeId.includes('skill') || nodeId.includes('assemble') || nodeId.includes('triage')) {
    return 'skill';
  }
  return 'system';
}

/**
 * Format node ID to human-readable label
 */
function formatLabel(nodeId) {
  return nodeId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert Flow2 graph to n8n workflow JSON
 */
function convertToN8nWorkflow(graphDefinition) {
  console.log(`[Convert] Converting to n8n workflow format...`);
  
  const nodes = [];
  const connections = {};
  
  // Add synthetic Start node if not present
  const hasStartNode = graphDefinition.nodes.some(n => n.id === 'start' || n.type === 'start');
  if (!hasStartNode) {
    nodes.push({
      parameters: {},
      id: 'start-node',
      name: 'Start',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [250, 300]
    });
    
    // Connect Start to entry node
    connections['Start'] = {
      main: [[{
        node: formatLabel(graphDefinition.entryNodeId),
        type: 'main',
        index: 0
      }]]
    };
  }
  
  // Topological sort for left-to-right layout
  const topology = topologicalSort(graphDefinition.nodes, graphDefinition.edges);
  
  // Convert nodes
  graphDefinition.nodes.forEach((node, index) => {
    const n8nNodeType = mapToN8nNodeType(node);
    const topologyIndex = topology.indexOf(node.id);
    const xPos = 250 + (topologyIndex * 250);
    const yPos = 300 + (index % 3) * 150; // Stagger vertically to avoid overlaps
    
    nodes.push({
      parameters: {
        description: node.description || '',
        ...(node.config || {})
      },
      id: `node-${node.id}`,
      name: formatLabel(node.id),
      type: n8nNodeType,
      typeVersion: 1,
      position: [xPos, yPos]
    });
  });
  
  // Convert edges to connections
  graphDefinition.edges.forEach(edge => {
    const fromName = formatLabel(edge.fromNodeId);
    const toName = formatLabel(edge.toNodeId);
    
    if (!connections[fromName]) {
      connections[fromName] = { main: [] };
    }
    
    // n8n connections: connections[fromNode].main[outputIndex] = [{ node, type, index }]
    if (!connections[fromName].main[0]) {
      connections[fromName].main[0] = [];
    }
    
    connections[fromName].main[0].push({
      node: toName,
      type: 'main',
      index: 0
    });
  });
  
  const workflow = {
    name: `Flow2 KYC Graph - ${graphDefinition.graphId} v${graphDefinition.version}`,
    nodes,
    connections,
    active: false,
    settings: {
      executionOrder: 'v1'
    },
    tags: [
      { id: 'flow2', name: 'flow2' },
      { id: 'kyc', name: 'kyc' }
    ],
    meta: {
      templateCredsSetupCompleted: true,
      instanceId: graphDefinition.checksum || 'unknown'
    }
  };
  
  console.log(`[Convert] ✓ Created n8n workflow`);
  console.log(`[Convert]   - nodes: ${nodes.length}`);
  console.log(`[Convert]   - connections: ${Object.keys(connections).length}`);
  
  return workflow;
}

/**
 * Map Flow2 node type to n8n node type
 */
function mapToN8nNodeType(node) {
  const id = node.id.toLowerCase();
  const type = node.type?.toLowerCase() || '';
  
  // Human review / approval / gate nodes
  if (id.includes('human') || id.includes('approval') || id.includes('gate') || 
      id.includes('hitl') || id.includes('checkpoint') || type === 'gate') {
    return 'n8n-nodes-base.wait';
  }
  
  // Start node
  if (id === 'start' || type === 'start') {
    return 'n8n-nodes-base.start';
  }
  
  // Default: NoOp node
  return 'n8n-nodes-base.noOp';
}

/**
 * Simple topological sort for left-to-right layout
 */
function topologicalSort(nodes, edges) {
  const adjList = new Map();
  const inDegree = new Map();
  
  // Initialize
  nodes.forEach(node => {
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
  });
  
  // Build adjacency list
  edges.forEach(edge => {
    if (adjList.has(edge.fromNodeId) && inDegree.has(edge.toNodeId)) {
      adjList.get(edge.fromNodeId).push(edge.toNodeId);
      inDegree.set(edge.toNodeId, inDegree.get(edge.toNodeId) + 1);
    }
  });
  
  // Kahn's algorithm
  const queue = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });
  
  const sorted = [];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    sorted.push(nodeId);
    
    adjList.get(nodeId).forEach(neighbor => {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    });
  }
  
  return sorted;
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Flow2 → n8n Workflow Exporter');
  console.log('='.repeat(60));
  console.log('');
  
  // Phase 1: Extract graph definition (runtime-first)
  let result = await fetchGraphFromRuntime();
  
  if (!result) {
    result = extractGraphFromStatic();
  }
  
  console.log('');
  console.log(`[Extract] Mode: ${result.mode.toUpperCase()}`);
  if (result.endpoint) {
    console.log(`[Extract] Endpoint: ${result.endpoint}`);
  }
  if (result.source) {
    console.log(`[Extract] Source: ${result.source}`);
  }
  console.log('');
  
  // Phase 2: Convert to n8n format
  const n8nWorkflow = convertToN8nWorkflow(result.graph);
  
  // Phase 3: Write to file
  console.log('');
  console.log(`[Write] Writing to ${OUTPUT_PATH}...`);
  
  // Ensure artifacts directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  
  writeFileSync(OUTPUT_PATH, JSON.stringify(n8nWorkflow, null, 2), 'utf-8');
  
  console.log(`[Write] ✓ Successfully wrote workflow`);
  console.log('');
  
  // Phase 4: Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Extraction Mode:   ${result.mode}`);
  console.log(`Node Count:        ${n8nWorkflow.nodes.length}`);
  console.log(`Connection Count:  ${Object.keys(n8nWorkflow.connections).length}`);
  console.log(`Output File:       ${OUTPUT_PATH}`);
  console.log('');
  console.log('✓ Export complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Import artifacts/flow2.n8n.json into n8n');
  console.log('  2. Adjust node positions if needed');
  console.log('  3. Configure node parameters as required');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('');
  console.error('❌ Export failed:', error.message);
  console.error('');
  process.exit(1);
});




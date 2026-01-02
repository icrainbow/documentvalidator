#!/usr/bin/env node

/**
 * n8n Workflow Layout Fixer
 * 
 * Fixes overlapping nodes by computing topological levels and assigning
 * grid-based positions with proper spacing.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const INPUT_FILE = join(__dirname, '..', 'artifacts', 'flow2.n8n.json');
const OUTPUT_FILE = join(__dirname, '..', 'artifacts', 'flow2.n8n.layout.json');

const GRID_CONFIG = {
  startX: 200,
  startY: 200,
  horizontalSpacing: 320,
  verticalSpacing: 180
};

/**
 * Build adjacency list from connections
 */
function buildGraph(connections) {
  const graph = new Map(); // nodeName -> [targetNodeNames]
  const inDegree = new Map(); // nodeName -> count
  
  // Initialize all nodes
  Object.keys(connections).forEach(nodeName => {
    if (!graph.has(nodeName)) {
      graph.set(nodeName, []);
    }
    if (!inDegree.has(nodeName)) {
      inDegree.set(nodeName, 0);
    }
    
    // Add edges
    const nodeConnections = connections[nodeName];
    if (nodeConnections.main) {
      nodeConnections.main.forEach(outputArray => {
        outputArray.forEach(target => {
          const targetName = target.node;
          
          // Add edge
          graph.get(nodeName).push(targetName);
          
          // Update in-degree
          if (!inDegree.has(targetName)) {
            inDegree.set(targetName, 0);
          }
          inDegree.set(targetName, inDegree.get(targetName) + 1);
          
          // Ensure target exists in graph
          if (!graph.has(targetName)) {
            graph.set(targetName, []);
          }
        });
      });
    }
  });
  
  return { graph, inDegree };
}

/**
 * Compute topological levels using Kahn's algorithm (safe for cyclic graphs)
 */
function computeLevels(nodes, connections) {
  const { graph, inDegree: initialInDegree } = buildGraph(connections);
  
  // Create a working copy of inDegree that we can modify
  const inDegree = new Map(initialInDegree);
  
  // Initialize inDegree for all nodes (including those not in connections)
  nodes.forEach(node => {
    if (!inDegree.has(node.name)) {
      inDegree.set(node.name, 0);
    }
  });
  
  // Find all start nodes (in-degree 0)
  const startNodes = [];
  nodes.forEach(node => {
    if (inDegree.get(node.name) === 0) {
      startNodes.push(node.name);
    }
  });
  
  // Kahn's algorithm with level tracking
  const levels = new Map(); // nodeName -> level
  const queue = [];
  
  // Initialize queue with start nodes at level 0
  startNodes.forEach(nodeName => {
    levels.set(nodeName, 0);
    queue.push({ name: nodeName, level: 0 });
  });
  
  let processedCount = 0;
  let iterations = 0;
  const MAX_ITERATIONS = 100000;
  
  // Pointer-based queue (faster than shift())
  let qi = 0;
  while (qi < queue.length) {
    iterations++;
    
    // Safety guard: prevent infinite loops
    if (iterations > MAX_ITERATIONS) {
      console.warn('      ⚠ Warning: Exceeded max iterations, using fallback layout');
      break;
    }
    
    const { name, level } = queue[qi++];
    processedCount++;
    
    // Process neighbors
    if (graph.has(name)) {
      graph.get(name).forEach(targetName => {
        const newLevel = level + 1;
        
        // Update level to longest path (maximum level)
        if (!levels.has(targetName)) {
          levels.set(targetName, newLevel);
        } else {
          levels.set(targetName, Math.max(levels.get(targetName), newLevel));
        }
        
        // Decrement in-degree
        inDegree.set(targetName, inDegree.get(targetName) - 1);
        
        // If all dependencies satisfied, add to queue
        if (inDegree.get(targetName) === 0) {
          queue.push({ name: targetName, level: levels.get(targetName) });
        }
      });
    }
  }
  
  // Cycle detection: if not all nodes processed, there's a cycle
  if (processedCount < nodes.length) {
    console.warn('      ⚠ Warning: Cycle detected in graph, using fallback layout for unprocessed nodes');
    
    // Assign level 0 to any nodes not yet processed (fallback)
    nodes.forEach(node => {
      if (!levels.has(node.name)) {
        levels.set(node.name, 0);
      }
    });
  }
  
  return levels;
}

/**
 * Assign grid positions based on levels
 */
function assignPositions(nodes, levels) {
  const { startX, startY, horizontalSpacing, verticalSpacing } = GRID_CONFIG;
  
  // Group nodes by level
  const nodesByLevel = new Map();
  nodes.forEach(node => {
    const level = levels.get(node.name);
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level).push(node);
  });
  
  // Assign positions
  const oldPositions = new Map();
  const newPositions = new Map();
  
  nodesByLevel.forEach((nodesInLevel, level) => {
    nodesInLevel.forEach((node, indexInLevel) => {
      const x = startX + level * horizontalSpacing;
      const y = startY + indexInLevel * verticalSpacing;
      
      oldPositions.set(node.name, [...node.position]);
      newPositions.set(node.name, [x, y]);
      
      node.position = [x, y];
    });
  });
  
  return { oldPositions, newPositions };
}

/**
 * Print summary table
 */
function printSummary(oldPositions, newPositions) {
  console.log('');
  console.log('='.repeat(80));
  console.log('POSITION CHANGES');
  console.log('='.repeat(80));
  console.log('');
  
  // Calculate column widths
  const maxNameLen = Math.max(...Array.from(oldPositions.keys()).map(n => n.length));
  const nameWidth = Math.max(maxNameLen, 20);
  
  // Header
  console.log(
    'Node Name'.padEnd(nameWidth) + ' | ' +
    'Old Position'.padEnd(15) + ' | ' +
    'New Position'.padEnd(15) + ' | ' +
    'Changed'
  );
  console.log('-'.repeat(nameWidth + 50));
  
  // Rows
  const sortedNames = Array.from(oldPositions.keys()).sort();
  sortedNames.forEach(name => {
    const oldPos = oldPositions.get(name);
    const newPos = newPositions.get(name);
    const changed = oldPos[0] !== newPos[0] || oldPos[1] !== newPos[1];
    
    const oldStr = `[${oldPos[0]}, ${oldPos[1]}]`;
    const newStr = `[${newPos[0]}, ${newPos[1]}]`;
    const changedStr = changed ? '✓' : '';
    
    console.log(
      name.padEnd(nameWidth) + ' | ' +
      oldStr.padEnd(15) + ' | ' +
      newStr.padEnd(15) + ' | ' +
      changedStr
    );
  });
  
  console.log('');
  console.log(`Total nodes: ${sortedNames.length}`);
  console.log(`Changed: ${sortedNames.filter(n => {
    const oldPos = oldPositions.get(n);
    const newPos = newPositions.get(n);
    return oldPos[0] !== newPos[0] || oldPos[1] !== newPos[1];
  }).length}`);
  console.log('');
}

/**
 * Main execution
 */
function main() {
  console.log('='.repeat(80));
  console.log('n8n Workflow Layout Fixer');
  console.log('='.repeat(80));
  console.log('');
  console.log('Input:  ', INPUT_FILE);
  console.log('Output: ', OUTPUT_FILE);
  console.log('');
  
  // Read workflow
  console.log('[1/5] Reading workflow JSON...');
  const workflow = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`      ✓ Loaded ${workflow.nodes.length} nodes`);
  
  // Compute topological levels
  console.log('[2/5] Computing topological levels...');
  const levels = computeLevels(workflow.nodes, workflow.connections);
  console.log(`      ✓ Computed levels for ${levels.size} nodes`);
  
  // Debug: print levels
  const levelCounts = new Map();
  levels.forEach(level => {
    levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
  });
  console.log('      Levels:', Array.from(levelCounts.entries()).sort((a, b) => a[0] - b[0]).map(([l, c]) => `L${l}:${c}`).join(', '));
  
  // Assign new positions
  console.log('[3/5] Assigning grid positions...');
  const { oldPositions, newPositions } = assignPositions(workflow.nodes, levels);
  console.log(`      ✓ Updated ${newPositions.size} positions`);
  
  // Write output
  console.log('[4/5] Writing new workflow...');
  writeFileSync(OUTPUT_FILE, JSON.stringify(workflow, null, 2), 'utf-8');
  console.log(`      ✓ Written to ${OUTPUT_FILE}`);
  
  // Print summary
  console.log('[5/5] Summary:');
  printSummary(oldPositions, newPositions);
  
  console.log('='.repeat(80));
  console.log('✓ Layout fixed successfully!');
  console.log('='.repeat(80));
  console.log('');
  console.log('Next steps:');
  console.log('  1. Import artifacts/flow2.n8n.layout.json into n8n');
  console.log('  2. Verify node positions look correct');
  console.log('  3. Make any final adjustments in n8n UI if needed');
  console.log('');
}

main();


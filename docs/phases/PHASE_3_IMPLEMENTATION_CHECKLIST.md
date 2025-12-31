# Phase 3 Implementation Checklist (Ordered Tasks for Cursor)

**Based on:** PHASE_3_PLAN_PATCH_v1_0_2.md  
**Date:** 2025-12-31  
**Total Duration:** ~7.75 hours

---

## Pre-Implementation Verification

- [x] Read PHASE_3_PLAN.md
- [x] Read PHASE_3_GRAPH_SCHEMA.md
- [x] Read PHASE_3_PLAN_PATCH_v1_0_1.md
- [x] Read PHASE_3_PLAN_PATCH_v1_0_2.md
- [x] Validated repo structure (`app/lib/`, `app/lib/graphKyc/`)
- [x] Confirmed import paths (`../graphs/types`, `./types`, etc.)
- [x] All blocking issues (A, B, C) resolved in v1.0.2

---

## Task 1: Create Graph Types (30 min)

**File:** `app/lib/graphs/types.ts` (~150 LOC)

**Subtasks:**
1. Create new file: `app/lib/graphs/types.ts`
2. Add file header comment: `/** Phase 3: Graph Definition Types */`
3. Define `NodeType` type: `export type NodeType = 'agent' | 'skill' | 'router' | 'gate' | 'system';`
4. Define `ConditionType` type: `export type ConditionType = 'always' | 'state_check' | 'output_check' | 'reflection_decision';`
5. Define `ChangeType` type: `export type ChangeType = 'node_added' | 'node_removed' | 'node_modified' | 'edge_added' | 'edge_removed' | 'edge_modified' | 'metadata_changed';`
6. Define `GraphNode` interface (id, type, label, description, binding?, config?)
7. Define `GraphCondition` interface (type, expression?, description)
8. Define `GraphEdge` interface (id, fromNodeId, toNodeId, condition?, label?)
9. Define `GraphDefinition` interface (graphId, version, checksum, description, nodes, edges, entryNodeId, metadata?)
10. Define `GraphChange` interface (type, path, oldValue?, newValue?, description)
11. Define `GraphDiff` interface (fromVersion, toVersion, changes)
12. Add JSDoc comments for each interface
13. Run typecheck: `npm run typecheck`

---

## Task 2: Create Graph Utilities (45 min)

**File:** `app/lib/graphs/graphUtils.ts` (~150 LOC)

**Subtasks:**
1. Create new file: `app/lib/graphs/graphUtils.ts`
2. Add file header comment: `/** Phase 3: Graph Utilities - Checksum & Diff */`
3. Import: `import crypto from 'crypto';`
4. Import: `import type { GraphDefinition, GraphDiff, GraphChange, GraphNode, GraphEdge } from './types';`
5. Implement `computeChecksum(definition: GraphDefinition): string` function:
   - Build `stableDef` object (graphId, version, description, entryNodeId, sorted nodes, sorted edges)
   - Sort nodes by `id` using `.sort((a, b) => a.id.localeCompare(b.id))`
   - Sort edges by `id` using `.sort((a, b) => a.id.localeCompare(b.id))`
   - Normalize optional fields: `binding: n.binding || null`, `config: n.config || null`
   - Exclude `metadata` field from checksum
   - Serialize: `const stableJson = JSON.stringify(stableDef);`
   - Hash: `const hash = crypto.createHash('sha256').update(stableJson, 'utf8').digest('hex');`
   - Return: `hash.substring(0, 12);`
6. Implement `computeGraphDiff(v1: GraphDefinition, v2: GraphDefinition): GraphDiff` function:
   - Create empty `changes: GraphChange[]` array
   - Compare nodes: For each node in v1, check if exists in v2 by `id`
   - Detect node modifications: Compare `description`, `config`, `label`, `binding`
   - Compare edges: For each edge in v1, check if exists in v2 by `id`
   - Detect edge modifications: Compare `label`, `condition.expression`, `condition.description`
   - Generate human-readable descriptions for each change
   - Return: `{ fromVersion: v1.version, toVersion: v2.version, changes }`
7. Add helper function: `compareObjects(obj1: any, obj2: any, path: string): GraphChange[]` (optional, for deep comparison)
8. Run typecheck: `npm run typecheck`

---

## Task 3: Create Baseline Graph v1.0.0 (1 hour)

**File:** `app/lib/graphs/flow2GraphV1.ts` (~200 LOC)

**Subtasks:**
1. Create new file: `app/lib/graphs/flow2GraphV1.ts`
2. Add file header comment: `/** Phase 3: Flow2 Graph Definition - Baseline v1.0.0 */`
3. Import: `import type { GraphDefinition } from './types';`
4. Import: `import { computeChecksum } from './graphUtils';`
5. Define `flow2GraphV1: GraphDefinition` object (without checksum initially)
6. Set `graphId: "flow2_kyc_v1"`
7. Set `version: "1.0.0"`
8. Set `description: "Flow2 KYC review graph with risk triage and parallel checks"`
9. Set `entryNodeId: "topic_assembler"`
10. Define 8 nodes array:
    - topic_assembler (type: skill, binding: { skillName: "kyc.topic_assemble" })
    - risk_triage (type: skill, binding: { skillName: "risk.triage" })
    - parallel_checks (type: system, binding: { functionRef: "executeParallelChecks" }, config: { parallelism: "unlimited" })
    - reflect_and_replan (type: system, binding: { functionRef: "reflectAndReplan" }, config: { maxReplans: 1 })
    - routing_decision (type: router, binding: { functionRef: "routeAfterReflection" })
    - human_gate (type: gate, config: { maxGates: 1 })
    - finalize (type: system, binding: { functionRef: "finalizeResults" })
    - error_handler (type: system, binding: { functionRef: "handleError" })
11. Define edges array (~12 edges, refer to PHASE_3_GRAPH_SCHEMA.md lines 204-297 for full list)
12. Add metadata: `{ createdAt: "2025-12-31T00:00:00Z", author: "VibeCoding Team", changelog: ["Initial baseline"] }`
13. Compute checksum: `flow2GraphV1.checksum = computeChecksum(flow2GraphV1);`
14. Export: `export { flow2GraphV1 };` and `export default flow2GraphV1;`
15. Run typecheck: `npm run typecheck`

---

## Task 4: Create Demo Variant v1.0.1 (30 min)

**File:** `app/lib/graphs/flow2GraphV1_0_1.ts` (~210 LOC)

**Subtasks:**
1. Copy `flow2GraphV1.ts` to `flow2GraphV1_0_1.ts`
2. Update file header comment: `/** Phase 3: Flow2 Graph Definition - Demo Variant v1.0.1 */`
3. Rename export: `flow2GraphV1_0_1`
4. Update `version: "1.0.1"`
5. Modify `parallel_checks.config.parallelism` from `"unlimited"` to `"3"`
6. Modify `reflect_and_replan.description` from `"Self-reflection: analyzes trace and decides next action"` to `"Self-reflection node: analyzes execution trace and determines optimal next action"`
7. Modify `edge_3.label` from `"if reflection enabled"` to `"reflection_path"`
8. Update metadata.changelog: `["Initial baseline", "Limited parallelism to 3, refined reflection node description"]`
9. Recompute checksum: `flow2GraphV1_0_1.checksum = computeChecksum(flow2GraphV1_0_1);`
10. Export: `export { flow2GraphV1_0_1 };` and `export default flow2GraphV1_0_1;`
11. Run typecheck: `npm run typecheck`

---

## Task 5: Extend API Types (15 min)

**File:** `app/lib/graphKyc/types.ts` (+15 LOC)

**Subtasks:**
1. Open file: `app/lib/graphKyc/types.ts`
2. Add import at top: `import type { GraphDefinition, GraphDiff } from '../graphs/types';`
3. Locate `GraphReviewResponse` interface (around line 107)
4. Extend `graphReviewTrace` field to add:
   ```typescript
   graph: {
     graphId: string;
     version: string;
     checksum: string;
   };
   graphDefinition?: GraphDefinition;
   graphDiff?: GraphDiff;
   ```
5. Run typecheck: `npm run typecheck`

---

## Task 6: Wire Orchestrator to Attach Graph Metadata (30 min)

**File:** `app/lib/graphKyc/orchestrator.ts` (+25 LOC)

**Subtasks:**
1. Open file: `app/lib/graphKyc/orchestrator.ts`
2. Add imports at top:
   ```typescript
   import { flow2GraphV1 } from '../graphs/flow2GraphV1';
   import { flow2GraphV1_0_1 } from '../graphs/flow2GraphV1_0_1';
   import { computeChecksum, computeGraphDiff } from '../graphs/graphUtils';
   ```
3. Locate final response builder in `runGraphKycReview()` (around line 123 for non-resume path, line 301 for resume path, line 345 for finalize)
4. Before `return` statement, add graph metadata logic:
   ```typescript
   // Phase 3: Attach graph metadata
   const shouldIncludeDefinition = 
     process.env.NODE_ENV !== 'production' || 
     process.env.INCLUDE_GRAPH_DEFINITION === 'true';

   const graphMetadata: any = {
     graph: {
       graphId: flow2GraphV1.graphId,
       version: flow2GraphV1.version,
       checksum: computeChecksum(flow2GraphV1)
     }
   };

   if (shouldIncludeDefinition) {
     graphMetadata.graphDefinition = flow2GraphV1;
     
     if (process.env.DEMO_GRAPH_DIFF === 'true') {
       graphMetadata.graphDiff = computeGraphDiff(flow2GraphV1, flow2GraphV1_0_1);
     }
   }
   ```
5. Update return statement to spread `graphMetadata` into `graphReviewTrace`:
   ```typescript
   return {
     issues,
     graphReviewTrace: {
       events,
       summary,
       skillInvocations,
       ...graphMetadata  // Add graph metadata
     },
     humanGate,
     resumeToken
   };
   ```
6. Repeat for all return paths (non-resume, resume, finalize)
7. Run typecheck: `npm run typecheck`

---

## Task 7: Create GraphDefinitionPanel Component (1.5 hours)

**File:** `app/components/GraphDefinitionPanel.tsx` (~280 LOC)

**Subtasks:**
1. Create new file: `app/components/GraphDefinitionPanel.tsx`
2. Add file header: `'use client';` and comment `/** Phase 3: Graph Definition Panel */`
3. Import: `import React, { useState } from 'react';`
4. Import: `import type { GraphDefinition, GraphDiff, GraphChange } from '../lib/graphs/types';`
5. Define props interface:
   ```typescript
   interface GraphDefinitionPanelProps {
     graph: { graphId: string; version: string; checksum: string };
     graphDefinition?: GraphDefinition;
     graphDiff?: GraphDiff;
   }
   ```
6. Implement `safeDisplay(value: any): string` helper
7. Implement component function: `export default function GraphDefinitionPanel({ graph, graphDefinition, graphDiff }: GraphDefinitionPanelProps)`
8. Render Section 1: Metadata Summary (always visible)
   - Container: `<div data-testid="graph-metadata-summary" className="bg-white border-2 border-slate-200 rounded-lg p-4 mb-4">`
   - Header: "Graph Metadata"
   - Display: graphId, version, checksum
   - Status badge: "Full definition available" (green) or "Metadata only" (gray)
9. Render Section 2: Definition Viewer (if graphDefinition present)
   - Container: `<details data-testid="graph-definition-view" className="bg-white border-2 border-slate-200 rounded-lg p-4 mb-4">`
   - Summary: "▶ Full Definition (JSON) - {nodes.length} nodes, {edges.length} edges"
   - Content: `<pre className="text-xs bg-slate-50 p-3 rounded overflow-x-auto">{JSON.stringify(graphDefinition, null, 2)}</pre>`
10. Render Section 3: Diff Viewer (if graphDiff present)
    - Container: `<div data-testid="graph-diff-view" className="bg-white border-2 border-slate-200 rounded-lg p-4">`
    - Header: `🔀 Changes: {fromVersion} → {toVersion}`
    - Map over `graphDiff.changes` with color coding:
      - `node_added`/`edge_added`: `bg-green-100 text-green-800`
      - `node_removed`/`edge_removed`: `bg-red-100 text-red-800`
      - `node_modified`/`edge_modified`: `bg-orange-100 text-orange-800`
    - Summary: `{changes.length} changes total`
11. Handle missing data: Show "No graph definition available" message if graphDefinition undefined
12. Run typecheck: `npm run typecheck`

---

## Task 8: Add Graph Definition Tab to ReviewConfigDrawer (30 min)

**File:** `app/components/ReviewConfigDrawer.tsx` (+35 LOC)

**Subtasks:**
1. Open file: `app/components/ReviewConfigDrawer.tsx`
2. Add import: `import GraphDefinitionPanel from './GraphDefinitionPanel';`
3. Locate tab navigation section (around line 506)
4. After Skills tab button (around line 582), add Graph Definition tab button:
   ```tsx
   {/* Phase 3: Graph Definition tab */}
   {graphReviewTrace?.graph && (
     <button
       onClick={() => setActiveTab('graphDef')}
       data-testid="graph-definition-tab-button"
       className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
         activeTab === 'graphDef'
           ? 'border-teal-600 text-teal-600'
           : 'border-transparent text-slate-600 hover:text-slate-800'
       }`}
     >
       📐 Graph
     </button>
   )}
   ```
5. Locate tab content section (around line 850)
6. After Skills tab content (around line 890), add Graph Definition tab content:
   ```tsx
   {/* Phase 3: Graph Definition Tab Content */}
   {activeTab === 'graphDef' && graphReviewTrace?.graph && (
     <GraphDefinitionPanel
       graph={graphReviewTrace.graph}
       graphDefinition={graphReviewTrace.graphDefinition}
       graphDiff={graphReviewTrace.graphDiff}
     />
   )}
   ```
7. Run typecheck: `npm run typecheck`

---

## Task 9: Create API Tests (1 hour)

**File:** `tests/api/graphDefinition.test.ts` (~130 LOC)

**Subtasks:**
1. Create new file: `tests/api/graphDefinition.test.ts`
2. Import: `import { describe, it, expect } from 'vitest';`
3. Define `const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';`
4. Test Suite: "Graph Definition Metadata"
5. Test 1: "includes graph metadata in Flow2 response"
   - POST to `/api/orchestrate` with mode=langgraph_kyc
   - Assert `data.graphReviewTrace.graph` exists
   - Assert `graph.graphId === 'flow2_kyc_v1'`
   - Assert `graph.version` matches `/^\d+\.\d+\.\d+$/`
   - Assert `graph.checksum.length === 12`
6. Test 2: "checksum stable across multiple runs"
   - Run same request twice
   - Assert checksums match
7. Test 3: "includes graphDefinition in test environment"
   - Assert `data.graphReviewTrace.graphDefinition` exists
   - Assert `graphDefinition.nodes.length === 8`
   - Assert `graphDefinition.edges.length >= 12`
8. Test 4: "graphDefinition has correct structure"
   - Assert all nodes have id, type, label, description
   - Assert entryNodeId matches a node
9. Run tests: `npm run test:api`

---

## Task 10: Create Unit Tests (45 min)

**File:** `tests/unit/graphUtils.test.ts` (~90 LOC)

**Subtasks:**
1. Create new directory: `tests/unit/` (if not exists)
2. Create new file: `tests/unit/graphUtils.test.ts`
3. Import: `import { describe, it, expect } from 'vitest';`
4. Import: `import { computeChecksum, computeGraphDiff } from '../../app/lib/graphs/graphUtils';`
5. Import: `import type { GraphDefinition } from '../../app/lib/graphs/types';`
6. Test Suite: "computeChecksum"
7. Test 1: "produces consistent checksum for same definition"
   - Create test definition
   - Compute checksum twice
   - Assert identical
8. Test 2: "produces different checksum for different nodes"
   - Create two definitions with different node descriptions
   - Compute checksums
   - Assert different
9. Test 3: "excludes metadata from checksum"
   - Create two definitions, same structure but different metadata
   - Compute checksums
   - Assert identical
10. Test Suite: "computeGraphDiff"
11. Test 4: "detects node config modification"
    - Create v1 and v2 with config change
    - Compute diff
    - Assert change detected with type='node_modified'
12. Test 5: "detects edge label modification"
    - Create v1 and v2 with label change
    - Compute diff
    - Assert change detected
13. Test 6: "returns empty changes for identical definitions"
    - Compute diff of same definition
    - Assert changes.length === 0
14. Run tests: `npx vitest run tests/unit/graphUtils.test.ts`

---

## Task 11: Create Playwright E2E Tests (45 min)

**File:** `tests/e2e/flow2-graph-definition.spec.ts` (~110 LOC)

**Subtasks:**
1. Create new file: `tests/e2e/flow2-graph-definition.spec.ts`
2. Import: `import { test, expect } from '@playwright/test';`
3. Test Suite: "Flow2 Graph Definition UI"
4. Test 1: "Graph Definition tab appears after Flow2 review"
   - Navigate to `/document?flow=2&scenario=fast`
   - Click load sample button
   - Wait for documents to load
   - Click run graph review button
   - Wait for API response
   - Open Agent Panel
   - Assert Graph Definition tab button visible
5. Test 2: "Metadata summary displays correct info"
   - (Setup same as Test 1)
   - Click Graph Definition tab
   - Assert metadata summary visible
   - Assert contains "flow2_kyc_v1"
   - Assert contains version pattern
6. Test 3: "Definition viewer shows JSON"
   - (Setup same as Test 1)
   - Click Graph Definition tab
   - Assert definition view visible
   - Expand if collapsible
   - Assert contains "nodes" and "edges"
7. Test 4: "Handles missing graphDefinition gracefully"
   - (Setup same as Test 1, but mock scenario where definition missing - future enhancement)
   - Assert no crash
8. Run tests: `npx playwright test tests/e2e/flow2-graph-definition.spec.ts`

---

## Task 12: Verification & Manual Testing (45 min)

**Subtasks:**
1. Run full typecheck: `npm run typecheck` - Fix any errors
2. Run all API tests: `npm run test:api` - Verify 38+ tests pass
3. Run unit tests: `npx vitest run tests/unit/` - Verify 9+ tests pass
4. Run E2E tests: `npm run test:e2e` - Verify all pass
5. Manual testing:
   - Start dev server: `npm run dev`
   - Navigate to `/document?flow=2&scenario=fast`
   - Load sample documents
   - Run graph review
   - Open Agent Panel
   - Click "Graph Definition" tab
   - Verify metadata summary correct
   - Verify definition viewer shows valid JSON
   - Check browser console (no errors)
6. Demo diff testing:
   - Set env: `DEMO_GRAPH_DIFF=true`
   - Restart server
   - Repeat manual test
   - Verify diff viewer shows 3 changes
7. Update DEMO.md:
   - Add "Phase 3: Graph Definition Tab" section
   - Document env vars
   - Add demo script

---

## Task 13: Final Cleanup & Documentation (15 min)

**Subtasks:**
1. Review all new files for console.log statements - Remove or comment out
2. Ensure all exports are correct
3. Verify no unused imports
4. Run final typecheck: `npm run typecheck`
5. Run final test suite: `npm run test:api && npm run test:e2e`
6. Git status check: Review all changes
7. Commit message (do NOT commit yet, just prepare):
   ```
   feat: Phase 3 - Graph as Artifact

   - Add graph definition types (GraphDefinition, GraphNode, GraphEdge, etc.)
   - Implement checksum computation and diff algorithm
   - Create baseline graph v1.0.0 and demo variant v1.0.1
   - Extend API to include graph metadata in Flow2 responses
   - Add GraphDefinitionPanel component with metadata/definition/diff viewers
   - Add "Graph Definition" tab to Agent Panel
   - Add API, unit, and E2E tests for graph features
   - Update documentation

   Fixes: #phase3-graph-artifact
   ```

---

## Success Criteria Checklist

- [ ] All new files created without errors
- [ ] `npm run typecheck` passes (0 errors)
- [ ] `npm run test:api` passes (38+ tests, including 4 new graph tests)
- [ ] Unit tests pass (9+ tests for checksum & diff)
- [ ] Playwright tests pass (4 new tests for Graph Definition tab)
- [ ] Manual test: Graph Definition tab visible and functional
- [ ] Manual test: Metadata summary displays correct info
- [ ] Manual test: Definition viewer shows valid JSON
- [ ] Manual test: Diff viewer shows 3 changes (with DEMO_GRAPH_DIFF=true)
- [ ] No console errors in browser
- [ ] No regression: All 39 existing tests still pass
- [ ] Documentation updated (DEMO.md)

---

## Emergency Rollback Plan

If critical issues arise:

1. **Immediate disable:** Set `INCLUDE_GRAPH_DEFINITION=false` (hides full definition, keeps metadata only)
2. **Revert commit:** `git revert HEAD` (if committed)
3. **Feature flag:** Add `ENABLE_GRAPH_DEFINITION=false` in orchestrator (future enhancement)

---

_Phase 3 Implementation Checklist • Ready for Execution • 2025-12-31_


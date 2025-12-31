# Phase 3 Plan Patch v1.0.2 (FINAL - Ready for Implementation)

**Date:** 2025-12-31  
**Purpose:** Fix blocking issues from v1.0.1 before implementation  
**Status:** LOCKED - Ready to proceed

---

## Changes from v1.0.1 → v1.0.2

### ✅ Issue A: FIXED - v1.0.1 Demo Diff Must Not Add/Remove Nodes

**Problem:** v1.0.1 planned to add `data_quality_check` node, violating the 8-node lock.

**Solution:** v1.0.1 will modify ONLY these fields while keeping 8 nodes identical:
1. **Node modification:** Change `parallel_checks.config.parallelism` from `"unlimited"` to `"3"` (simulating a config tuning)
2. **Node modification:** Update `reflect_and_replan.description` (clarify wording)
3. **Edge modification:** Update `edge_3.label` from `"if reflection enabled"` to `"reflection_path"` (label refinement)

**New v1.0.1 Diff Example:**
```json
{
  "fromVersion": "1.0.0",
  "toVersion": "1.0.1",
  "changes": [
    {
      "type": "node_modified",
      "path": "nodes[2].config.parallelism",
      "oldValue": "unlimited",
      "newValue": "3",
      "description": "Modified parallel_checks config: limited parallelism to 3"
    },
    {
      "type": "node_modified",
      "path": "nodes[3].description",
      "oldValue": "Self-reflection: analyzes trace and decides next action",
      "newValue": "Self-reflection node: analyzes execution trace and determines optimal next action",
      "description": "Refined reflect_and_replan description"
    },
    {
      "type": "edge_modified",
      "path": "edges[2].label",
      "oldValue": "if reflection enabled",
      "newValue": "reflection_path",
      "description": "Updated edge_3 label for clarity"
    }
  ]
}
```

**Impact:**
- ✅ No node additions/removals
- ✅ Demonstrates diff algorithm for config/description/label changes
- ✅ Keeps node count at 8 (stable baseline)

---

### ✅ Issue B: FIXED - API Gating for Tests

**Problem:** Original gating: `NODE_ENV === 'development'` excludes test environment, causing tests to fail when asserting `graphDefinition` presence.

**Solution (Preferred):** Include `graphDefinition` whenever NOT in production:

```typescript
// In orchestrator.ts (updated gate logic)
const shouldIncludeDefinition = 
  process.env.NODE_ENV !== 'production' || 
  process.env.INCLUDE_GRAPH_DEFINITION === 'true';

if (shouldIncludeDefinition) {
  response.graphReviewTrace.graphDefinition = flow2GraphV1;
  
  // Demo: Include diff if comparing versions
  if (process.env.DEMO_GRAPH_DIFF === 'true') {
    response.graphReviewTrace.graphDiff = computeGraphDiff(flow2GraphV1, flow2GraphV1_0_1);
  }
}
```

**Rationale:**
- Development: `NODE_ENV=development` → graphDefinition included ✅
- Test: `NODE_ENV=test` → graphDefinition included ✅
- Production: `NODE_ENV=production` → graphDefinition EXCLUDED (minimal overhead) ✅
- Override: `INCLUDE_GRAPH_DEFINITION=true` → always included (for debugging)

**Test Updates:**
- API tests can now assert `graphDefinition` presence without extra env var setup
- Playwright tests work correctly (dev server runs with `NODE_ENV=development`)

**Updated Decision 2:**
- **Always include:** `graph: { graphId, version, checksum }`
- **Include when:** `NODE_ENV !== 'production'` OR `INCLUDE_GRAPH_DEFINITION === 'true'`
- **Exclude when:** `NODE_ENV === 'production'` AND `INCLUDE_GRAPH_DEFINITION !== 'true'`

---

### ✅ Issue C: FIXED - Validated Import Paths

**Confirmed Structure:**
```
app/lib/
├── graphKyc/            (Flow2 orchestrator & types)
│   ├── orchestrator.ts
│   ├── types.ts
│   ├── executor.ts
│   └── ...
├── skills/              (Skill dispatcher & catalog)
├── types/               (Shared types)
└── (other modules)
```

**NEW: app/lib/graphs/ folder** (to be created in Phase 3):
```
app/lib/
├── graphs/              [NEW] Graph artifacts
│   ├── types.ts         [NEW] GraphDefinition, GraphNode, etc.
│   ├── graphUtils.ts    [NEW] computeChecksum, computeGraphDiff
│   ├── flow2GraphV1.ts  [NEW] Baseline v1.0.0
│   └── flow2GraphV1_0_1.ts [NEW] Demo variant v1.0.1
├── graphKyc/
│   ├── types.ts         [MODIFY] Import from ../graphs/types
│   └── orchestrator.ts  [MODIFY] Import from ../graphs/flow2GraphV1
└── ...
```

**Corrected Import Paths:**

| File | Import Statement | Path |
|------|------------------|------|
| `app/lib/graphKyc/types.ts` | `import { GraphDefinition, GraphDiff } from '../graphs/types';` | `../graphs/types` |
| `app/lib/graphKyc/orchestrator.ts` | `import { flow2GraphV1 } from '../graphs/flow2GraphV1';` | `../graphs/flow2GraphV1` |
| `app/lib/graphKyc/orchestrator.ts` | `import { flow2GraphV1_0_1 } from '../graphs/flow2GraphV1_0_1';` | `../graphs/flow2GraphV1_0_1` |
| `app/lib/graphKyc/orchestrator.ts` | `import { computeChecksum, computeGraphDiff } from '../graphs/graphUtils';` | `../graphs/graphUtils` |
| `app/lib/graphs/flow2GraphV1.ts` | `import { GraphDefinition } from './types';` | `./types` (same dir) |
| `app/lib/graphs/graphUtils.ts` | `import { GraphDefinition, GraphDiff } from './types';` | `./types` (same dir) |
| `app/components/GraphDefinitionPanel.tsx` | `import { GraphDefinition, GraphDiff } from '../lib/graphs/types';` | `../lib/graphs/types` |

**Note:** All paths use `../` relative imports (NO `@/` aliases for this phase to avoid path resolution issues).

---

## Updated File-by-File Implementation Checklist

### 📦 Step 1: Types & Utils (1 hour)

**1.1 Create `app/lib/graphs/types.ts`** (~150 LOC)
- [ ] Export `GraphDefinition` interface
- [ ] Export `GraphNode` interface
- [ ] Export `GraphEdge` interface  
- [ ] Export `GraphCondition` interface
- [ ] Export `GraphDiff` interface
- [ ] Export `GraphChange` interface
- [ ] Export type aliases: `NodeType`, `ConditionType`, `ChangeType`
- [ ] Add JSDoc comments for all interfaces

**1.2 Create `app/lib/graphs/graphUtils.ts`** (~150 LOC)
- [ ] Import `GraphDefinition`, `GraphDiff`, `GraphChange` from `./types`
- [ ] Import `crypto` from `'crypto'`
- [ ] Implement `computeChecksum(definition: GraphDefinition): string`
  - [ ] Build stableDef (graphId, version, description, entryNodeId, sorted nodes, sorted edges)
  - [ ] Exclude metadata from checksum
  - [ ] Normalize optional fields to `null`
  - [ ] SHA-256 hash → first 12 chars
- [ ] Implement `computeGraphDiff(v1: GraphDefinition, v2: GraphDefinition): GraphDiff`
  - [ ] Compare nodes by ID (added/removed/modified)
  - [ ] Compare edges by ID (added/removed/modified)
  - [ ] Detect field changes (description, config, label, condition)
  - [ ] Generate human-readable descriptions
  - [ ] Return structured diff with fromVersion/toVersion

---

### 📐 Step 2: Graph Artifacts (1.5 hours)

**2.1 Create `app/lib/graphs/flow2GraphV1.ts`** (~200 LOC)
- [ ] Import `GraphDefinition` from `./types`
- [ ] Import `computeChecksum` from `./graphUtils`
- [ ] Define `flow2GraphV1: GraphDefinition` with:
  - [ ] graphId: `"flow2_kyc_v1"`
  - [ ] version: `"1.0.0"`
  - [ ] description: `"Flow2 KYC review graph with risk triage and parallel checks"`
  - [ ] entryNodeId: `"topic_assembler"`
  - [ ] **8 nodes:**
    1. topic_assembler (skill: kyc.topic_assemble)
    2. risk_triage (skill: risk.triage)
    3. parallel_checks (system: executeParallelChecks, config: `{ parallelism: "unlimited" }`)
    4. reflect_and_replan (system: reflectAndReplan, config: `{ maxReplans: 1 }`)
    5. routing_decision (router: routeAfterReflection)
    6. human_gate (gate, config: `{ maxGates: 1 }`)
    7. finalize (system: finalizeResults)
    8. error_handler (system: handleError)
  - [ ] **~12 edges** (see PHASE_3_GRAPH_SCHEMA.md for full list)
  - [ ] metadata: `{ createdAt, author: "VibeCoding Team", changelog: ["Initial baseline"] }`
- [ ] Compute checksum AFTER definition: `flow2GraphV1.checksum = computeChecksum(flow2GraphV1)`
- [ ] Export as default and named export

**2.2 Create `app/lib/graphs/flow2GraphV1_0_1.ts`** (~210 LOC)
- [ ] Import `GraphDefinition` from `./types`
- [ ] Import `computeChecksum` from `./graphUtils`
- [ ] Copy structure from v1.0.0
- [ ] **Apply changes (NO node additions/removals):**
  1. parallel_checks.config.parallelism: `"unlimited"` → `"3"`
  2. reflect_and_replan.description: Updated wording
  3. edge_3.label: `"if reflection enabled"` → `"reflection_path"`
- [ ] Update version: `"1.0.1"`
- [ ] Update metadata.changelog: `["Initial baseline", "Limited parallelism to 3, refined reflection node description"]`
- [ ] Recompute checksum: `flow2GraphV1_0_1.checksum = computeChecksum(flow2GraphV1_0_1)`
- [ ] Export as default and named export

---

### 🔌 Step 3: API & Orchestrator Integration (45 min)

**3.1 Modify `app/lib/graphKyc/types.ts`** (+15 LOC)
- [ ] Add import: `import type { GraphDefinition, GraphDiff } from '../graphs/types';`
- [ ] Extend `GraphReviewResponse` interface:
  ```typescript
  export interface GraphReviewResponse {
    issues: any[];
    topicSections?: TopicSection[];
    conflicts?: Conflict[];
    coverageGaps?: Coverage[];
    graphReviewTrace: {
      events: GraphTraceEvent[];
      summary: {
        path: GraphPath;
        riskScore: number;
        riskBreakdown?: RiskBreakdown;
        coverageMissingCount: number;
        conflictCount: number;
      };
      degraded?: boolean;
      skillInvocations?: any[];
      graph: {                          // NEW
        graphId: string;
        version: string;
        checksum: string;
      };
      graphDefinition?: GraphDefinition; // NEW
      graphDiff?: GraphDiff;            // NEW
    };
    humanGate?: {
      required: boolean;
      prompt: string;
      options: string[];
      context?: string;
    };
    resumeToken?: string;
  }
  ```

**3.2 Modify `app/lib/graphKyc/orchestrator.ts`** (+25 LOC)
- [ ] Add imports:
  ```typescript
  import { flow2GraphV1 } from '../graphs/flow2GraphV1';
  import { flow2GraphV1_0_1 } from '../graphs/flow2GraphV1_0_1';
  import { computeChecksum, computeGraphDiff } from '../graphs/graphUtils';
  ```
- [ ] In `runGraphKycReview()` final response builder (after finalize node), add graph metadata:
  ```typescript
  // Phase 3: Attach graph metadata
  const shouldIncludeDefinition = 
    process.env.NODE_ENV !== 'production' || 
    process.env.INCLUDE_GRAPH_DEFINITION === 'true';

  const graphMetadata = {
    graph: {
      graphId: flow2GraphV1.graphId,
      version: flow2GraphV1.version,
      checksum: computeChecksum(flow2GraphV1)
    }
  };

  if (shouldIncludeDefinition) {
    graphMetadata.graphDefinition = flow2GraphV1;
    
    // Demo: Include diff if env var set
    if (process.env.DEMO_GRAPH_DIFF === 'true') {
      graphMetadata.graphDiff = computeGraphDiff(flow2GraphV1, flow2GraphV1_0_1);
    }
  }

  return {
    issues: finalIssues,
    graphReviewTrace: {
      ...existingTrace,
      ...graphMetadata  // Spread graph metadata
    },
    humanGate,
    resumeToken
  };
  ```
- [ ] Ensure no breaking changes to existing flow

---

### 🎨 Step 4: UI Components (2 hours)

**4.1 Create `app/components/GraphDefinitionPanel.tsx`** (~280 LOC)
- [ ] Import: `import type { GraphDefinition, GraphDiff, GraphChange } from '../lib/graphs/types';`
- [ ] Define props:
  ```typescript
  interface GraphDefinitionPanelProps {
    graph: { graphId: string; version: string; checksum: string };
    graphDefinition?: GraphDefinition;
    graphDiff?: GraphDiff;
  }
  ```
- [ ] Implement `safeDisplay(value: any): string` helper for type-safe rendering
- [ ] **Section 1: Metadata Summary** (always visible)
  - [ ] `data-testid="graph-metadata-summary"`
  - [ ] Display: graphId, version, checksum
  - [ ] Status indicator: "Full definition available" or "Metadata only (production mode)"
- [ ] **Section 2: Definition Viewer** (if `graphDefinition` present)
  - [ ] `data-testid="graph-definition-view"`
  - [ ] Collapsible `<details>` element
  - [ ] JSON formatted in `<pre className="text-xs overflow-x-auto">`
  - [ ] Syntax highlighting: Use simple color classes (gray for keys, blue for strings, green for numbers)
  - [ ] Show node count and edge count summary
- [ ] **Section 3: Diff Viewer** (if `graphDiff` present)
  - [ ] `data-testid="graph-diff-view"`
  - [ ] Header: `🔀 Changes: {fromVersion} → {toVersion}`
  - [ ] Map over `graphDiff.changes` with color coding:
    - [ ] `node_added` / `edge_added`: Green background, `+` icon
    - [ ] `node_removed` / `edge_removed`: Red background, `-` icon
    - [ ] `node_modified` / `edge_modified`: Orange background, `✏️` icon
  - [ ] Display: `change.description` for each change
  - [ ] Summary: `{changes.length} changes total`
- [ ] Handle missing data gracefully (no crashes on undefined)

**4.2 Modify `app/components/ReviewConfigDrawer.tsx`** (+35 LOC)
- [ ] Import: `import GraphDefinitionPanel from './GraphDefinitionPanel';`
- [ ] Add "Graph Definition" tab button (after Skills tab, around line 582):
  ```tsx
  {/* Phase 3: Graph Definition tab - show if graph metadata present */}
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
- [ ] Add tab content (after Skills tab content, around line 890):
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
- [ ] Ensure proper TypeScript types for new fields (should be inferred from props)

---

### 🧪 Step 5: Tests (2 hours)

**5.1 Create `tests/api/graphDefinition.test.ts`** (~130 LOC)
- [ ] Import test utilities and schemas
- [ ] **Test Suite: "Graph Definition Metadata"**
  - [ ] Test: "includes graph metadata in Flow2 response"
    - [ ] POST /api/orchestrate with mode=langgraph_kyc
    - [ ] Assert `graphReviewTrace.graph` exists
    - [ ] Assert `graph.graphId === "flow2_kyc_v1"`
    - [ ] Assert `graph.version` matches `/^\d+\.\d+\.\d+$/`
    - [ ] Assert `graph.checksum.length === 12`
  - [ ] Test: "checksum stable across multiple runs"
    - [ ] Run same request twice
    - [ ] Assert checksums are identical
  - [ ] Test: "includes graphDefinition in test environment"
    - [ ] Assert `graphReviewTrace.graphDefinition` exists
    - [ ] Assert `graphDefinition.nodes.length === 8`
    - [ ] Assert `graphDefinition.edges.length >= 12`
    - [ ] Assert `graphDefinition.entryNodeId === "topic_assembler"`
  - [ ] Test: "graphDefinition has correct structure"
    - [ ] Validate using Zod schema (if implemented) or manual checks
    - [ ] Assert all 8 nodes have required fields (id, type, label, description)
    - [ ] Assert all edges have fromNodeId/toNodeId

**5.2 Create `tests/unit/graphUtils.test.ts`** (~90 LOC)
- [ ] Import: `import { computeChecksum, computeGraphDiff } from '../../app/lib/graphs/graphUtils';`
- [ ] Import: `import type { GraphDefinition } from '../../app/lib/graphs/types';`
- [ ] **Test Suite: "computeChecksum"**
  - [ ] Test: "produces consistent checksum for same definition"
  - [ ] Test: "produces different checksum for different nodes"
  - [ ] Test: "excludes metadata from checksum"
  - [ ] Test: "handles node reordering (stable sort by ID)"
- [ ] **Test Suite: "computeGraphDiff"**
  - [ ] Test: "detects node config modification"
  - [ ] Test: "detects node description modification"
  - [ ] Test: "detects edge label modification"
  - [ ] Test: "returns empty changes for identical definitions"
  - [ ] Test: "generates human-readable descriptions"

**5.3 Create `tests/e2e/flow2-graph-definition.spec.ts`** (~110 LOC)
- [ ] **Test Suite: "Flow2 Graph Definition UI"**
  - [ ] Test: "Graph Definition tab appears after Flow2 review"
    - [ ] Load Flow2 page with scenario=fast
    - [ ] Load sample documents
    - [ ] Run graph review
    - [ ] Open Agent Panel (`data-testid="agent-panel-button"`)
    - [ ] Assert `[data-testid="graph-definition-tab-button"]` visible
  - [ ] Test: "Metadata summary displays correct info"
    - [ ] Click Graph Definition tab
    - [ ] Assert `[data-testid="graph-metadata-summary"]` visible
    - [ ] Assert contains "flow2_kyc_v1"
    - [ ] Assert contains version (regex match)
    - [ ] Assert contains 12-char checksum
  - [ ] Test: "Definition viewer shows JSON when available"
    - [ ] Assert `[data-testid="graph-definition-view"]` visible
    - [ ] Click to expand (if collapsible)
    - [ ] Assert contains valid JSON (no "undefined" or "[object Object]")
    - [ ] Assert contains "nodes" and "edges"
  - [ ] Test: "Handles missing graphDefinition gracefully"
    - [ ] Mock scenario: Remove graphDefinition from response (future)
    - [ ] Assert no crash, shows "Metadata only" message

---

### ✅ Step 6: Verification & Documentation (45 min)

**6.1 Type Check**
- [ ] Run: `npm run typecheck`
- [ ] Fix any type errors in new files

**6.2 API Tests**
- [ ] Run: `npm run test:api`
- [ ] Verify: 34 existing + 4 new = 38+ tests pass
- [ ] Debug any failures

**6.3 Unit Tests**
- [ ] Run: `npx vitest run tests/unit/graphUtils.test.ts`
- [ ] Verify: 9+ tests pass

**6.4 Playwright E2E**
- [ ] Run: `npx playwright test tests/e2e/flow2-graph-definition.spec.ts`
- [ ] Verify: 4 tests pass
- [ ] Check for flakiness (re-run 3x)

**6.5 Manual Testing**
- [ ] Start dev server: `npm run dev`
- [ ] Navigate to: `/document?flow=2&scenario=fast`
- [ ] Load sample documents
- [ ] Run Graph KYC Review
- [ ] Open Agent Panel
- [ ] Click "Graph Definition" tab
- [ ] Verify:
  - [ ] Metadata summary shows correct info
  - [ ] Definition viewer shows valid JSON
  - [ ] No console errors

**6.6 Demo Diff Testing**
- [ ] Set env var: `DEMO_GRAPH_DIFF=true`
- [ ] Restart dev server
- [ ] Run Flow2 review
- [ ] Open Graph Definition tab
- [ ] Verify: Diff viewer shows 3 changes (parallel_checks config, reflect_and_replan description, edge_3 label)

**6.7 Update Documentation**
- [ ] Update `DEMO.md`: Add "Phase 3: Graph Definition Tab" section
- [ ] Document env vars: `INCLUDE_GRAPH_DEFINITION`, `DEMO_GRAPH_DIFF`
- [ ] Add demo script for Graph Definition tab walkthrough

---

## Implementation Order Summary

| Step | Task | Duration | Critical Path |
|------|------|----------|---------------|
| 1 | Types & Utils | 1h | ✅ Foundational |
| 2 | Graph Artifacts | 1.5h | ✅ Required for API |
| 3 | API Integration | 45min | ✅ Required for UI |
| 4 | UI Components | 2h | ✅ User-facing |
| 5 | Tests | 2h | ⚠️ Validation |
| 6 | Verification | 45min | ⚠️ Quality gate |

**Total: 7.75 hours**

---

## Risk Mitigation Summary

| Risk | v1.0.1 Status | v1.0.2 Status | Mitigation |
|------|---------------|---------------|------------|
| Checksum instability | ⚠️ Incomplete algorithm | ✅ Locked | Stable sorting + metadata exclusion |
| Test env gating | ❌ Broken | ✅ Fixed | `NODE_ENV !== 'production'` |
| Import path errors | ⚠️ Assumed | ✅ Validated | Confirmed `../graphs/` paths |
| Node count mismatch | ❌ v1.0.1 adds node | ✅ Fixed | v1.0.1 modifies only (no add/remove) |

---

## Final Approval Checklist

- [x] Issue A resolved: v1.0.1 does NOT add/remove nodes (modifies config/description/label only)
- [x] Issue B resolved: API gating includes test environment (`NODE_ENV !== 'production'`)
- [x] Issue C resolved: Import paths validated and corrected (`../graphs/types`)
- [x] File-by-file checklist updated with corrected paths
- [x] All node IDs locked at 8 (no changes across versions)
- [x] Risk assessment updated

**Status: READY FOR IMPLEMENTATION**

---

_Phase 3 Plan Patch v1.0.2 • Final • 2025-12-31 • Proceed to Implementation_


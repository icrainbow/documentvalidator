# Phase 3 Plan Patch v1.0.1

**Date:** 2025-12-31  
**Purpose:** Lock down implementation decisions before coding Phase 3  
**Status:** Awaiting approval

---

## Decision 1: Checksum Algorithm (LOCKED)

**Problem:** Original plan suggested `JSON.stringify(definition, Object.keys(definition).sort())` which is incorrect (second param is replacer, not sorter).

**Solution:** Use stable checksum from PHASE_3_GRAPH_SCHEMA.md:

```typescript
function computeChecksum(definition: GraphDefinition): string {
  // Step 1: Build stable definition (sorted, normalized, metadata excluded)
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
      .sort((a, b) => a.id.localeCompare(b.id)), // Sort by ID
    edges: definition.edges
      .map(e => ({
        id: e.id,
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
        condition: e.condition || null,
        label: e.label || null
      }))
      .sort((a, b) => a.id.localeCompare(b.id)) // Sort by ID
    // EXCLUDE metadata (createdAt, author, changelog) - those are version metadata
  };
  
  // Step 2: Serialize to stable JSON (no whitespace)
  const stableJson = JSON.stringify(stableDef);
  
  // Step 3: SHA-256 hash
  const hash = crypto.createHash('sha256').update(stableJson, 'utf8').digest('hex');
  
  // Step 4: First 12 characters
  return hash.substring(0, 12);
}
```

**Properties:**
- ✅ Deterministic (same definition → same checksum)
- ✅ Stable sorting (nodes and edges sorted by ID)
- ✅ Normalized fields (null coalescing for optional fields)
- ✅ Metadata excluded (version history metadata doesn't affect structural checksum)

**Impact:** No API or UI changes, purely internal algorithm.

---

## Decision 2: API Gating for graphDefinition (LOCKED)

**Problem:** Original plan left this ambiguous ("maybe always include, maybe gate").

**DECISION: Option A (Recommended)**

**Always include:**
- `graph: { graphId, version, checksum }` - minimal metadata (~50 bytes)

**Conditionally include (gated):**
- `graphDefinition: GraphDefinition` - full definition (~1-2KB)
- `graphDiff: GraphDiff` - diff data (~500 bytes - 1KB)

**Gate Logic:**

```typescript
// In orchestrator.ts
const response: GraphReviewResponse = {
  issues,
  graphReviewTrace: {
    events,
    summary,
    skillInvocations,
    graph: {
      graphId: flow2GraphV1.graphId,
      version: flow2GraphV1.version,
      checksum: computeChecksum(flow2GraphV1)
    }
    // graphDefinition and graphDiff omitted by default
  }
};

// Optional: Include full definition if requested
// (For demo and development, we'll include by default in Phase 3)
if (process.env.NODE_ENV === 'development' || process.env.INCLUDE_GRAPH_DEFINITION === 'true') {
  response.graphReviewTrace.graphDefinition = flow2GraphV1;
  
  // Demo: Include diff if comparing versions
  if (process.env.DEMO_GRAPH_DIFF === 'true') {
    response.graphReviewTrace.graphDiff = computeGraphDiff(flow2GraphV1, flow2GraphV1_0_1);
  }
}
```

**Rationale:**
- Production: Minimal overhead (just metadata)
- Development/Demo: Full definition for debugging and demonstration
- Clear contract: Clients must handle `graphDefinition?: GraphDefinition` (optional)

**UI Impact:**
- GraphDefinitionPanel must handle missing `graphDefinition` gracefully:
  - Always show metadata summary (always present)
  - Show "Definition not available" message if `graphDefinition` is undefined
  - Show diff viewer only if `graphDiff` present

**Test Impact:**
- API tests always assert `graph` metadata present
- API tests conditionally check `graphDefinition` based on env var
- Playwright tests assume dev mode (graphDefinition present)

---

## Decision 3: Baseline Graph Granularity & Trace Mapping (LOCKED)

### 3.1 Baseline Graph Nodes (Top-Level Only)

**DECISION:** GraphDefinition includes **8 top-level nodes** only:

1. `topic_assembler` (type: skill)
2. `risk_triage` (type: skill)
3. `parallel_checks` (type: system) - **composite node**
4. `reflect_and_replan` (type: system)
5. `routing_decision` (type: router)
6. `human_gate` (type: gate)
7. `finalize` (type: system)
8. `error_handler` (type: system)

**Internal nodes (NOT in baseline definition):**
- `conflict_sweep` (internal to `parallel_checks`)
- `gap_collector` (internal to `parallel_checks`)
- `policy_flags_check` (internal to `parallel_checks`)

**Rationale:**
- Matches orchestrator-level control flow
- Keeps baseline simple and stable
- Internal executor logic is implementation detail

### 3.2 Trace Mapping for Internal Nodes

**Problem:** Runtime trace includes events for `conflict_sweep`, `gap_collector`, `policy_flags_check` but these are NOT in graphDefinition.

**DECISION:** Mark internal nodes in UI with "(internal)" label

**Mapping Rules:**

1. **For top-level nodes:** Direct match
   - Trace event `node: "topic_assembler"` → GraphDefinition node `id: "topic_assembler"`
   - UI shows: Node metadata from definition

2. **For internal nodes:** Special handling
   - Trace event `node: "conflict_sweep"` → No match in definition
   - UI shows: Node name + `(internal to parallel_checks)` label
   - Color: Gray/muted to indicate implementation detail

3. **For unknown nodes:** Defensive fallback
   - Trace event with unrecognized `node` value
   - UI shows: Node name + `(unknown - check trace)` warning
   - Color: Yellow border (potential mismatch)

**Implementation in GraphDefinitionPanel:**

```typescript
function getNodeInfo(traceEvent: GraphTraceEvent, definition: GraphDefinition) {
  const node = definition.nodes.find(n => n.id === traceEvent.node);
  
  if (node) {
    return { found: true, node, isInternal: false };
  }
  
  // Check if it's a known internal node
  const internalNodes = ['conflict_sweep', 'gap_collector', 'policy_flags_check'];
  if (internalNodes.includes(traceEvent.node)) {
    return { 
      found: false, 
      node: null, 
      isInternal: true, 
      parentNode: 'parallel_checks',
      label: `${traceEvent.node} (internal to parallel_checks)`
    };
  }
  
  // Unknown node
  return { 
    found: false, 
    node: null, 
    isInternal: false, 
    label: `${traceEvent.node} (unknown - check definition)`
  };
}
```

**UI Rendering:**
- Top-level nodes: Normal display with full metadata
- Internal nodes: Grayed out, indented, labeled "(internal)"
- Unknown nodes: Yellow border, labeled "(unknown)"

### 3.3 Future Enhancement (Phase 4+)

Option to expand `parallel_checks` node to show internal sub-nodes:
- Add `subNodes?: GraphNode[]` field to GraphNode type
- Update baseline to include sub-nodes
- UI shows collapsible tree view

**Not in Phase 3 scope.**

---

## File-by-File Implementation Checklist

### Step 1: Types & Utils (Estimated: 1 hour)

- [ ] **Create `app/lib/graphs/types.ts`** (~150 LOC)
  - [ ] Export `GraphDefinition` interface
  - [ ] Export `GraphNode` interface (with `type` enum)
  - [ ] Export `GraphEdge` interface
  - [ ] Export `GraphCondition` interface
  - [ ] Export `GraphDiff` interface
  - [ ] Export `GraphChange` interface
  - [ ] Export `NodeType` enum: 'agent' | 'skill' | 'router' | 'gate' | 'system'
  - [ ] Export `ConditionType` enum: 'always' | 'state_check' | 'output_check' | 'reflection_decision'
  - [ ] Add JSDoc comments for each type

- [ ] **Create `app/lib/graphs/graphUtils.ts`** (~150 LOC)
  - [ ] Implement `computeChecksum(definition: GraphDefinition): string`
    - [ ] Use stable algorithm from Decision 1
    - [ ] Import `crypto` from Node.js
    - [ ] Sort nodes and edges by ID
    - [ ] Exclude metadata from checksum
    - [ ] Return first 12 chars of SHA-256 hash
  - [ ] Implement `computeGraphDiff(v1: GraphDefinition, v2: GraphDefinition): GraphDiff`
    - [ ] Compare nodes (added/removed/modified)
    - [ ] Compare edges (added/removed/modified)
    - [ ] Generate human-readable descriptions
    - [ ] Return structured diff
  - [ ] (Optional) Implement `validateGraphDefinition(def: unknown): boolean`
    - [ ] Check required fields present
    - [ ] Check entryNodeId exists in nodes
    - [ ] Check edge fromNodeId/toNodeId valid
  - [ ] Add unit tests inline or in separate test file

### Step 2: Graph Artifacts (Estimated: 1.5 hours)

- [ ] **Create `app/lib/graphs/flow2GraphV1.ts`** (~200 LOC)
  - [ ] Export `flow2GraphV1: GraphDefinition` object
  - [ ] Set `graphId: "flow2_kyc_v1"`
  - [ ] Set `version: "1.0.0"`
  - [ ] Set `description: "Flow2 KYC review graph with risk triage and parallel checks"`
  - [ ] Define 8 top-level nodes:
    - [ ] topic_assembler (skill: kyc.topic_assemble)
    - [ ] risk_triage (skill: risk.triage)
    - [ ] parallel_checks (system: executeParallelChecks)
    - [ ] reflect_and_replan (system: reflectAndReplan)
    - [ ] routing_decision (router: routeAfterReflection)
    - [ ] human_gate (gate)
    - [ ] finalize (system: finalizeResults)
    - [ ] error_handler (system: handleError)
  - [ ] Define ~12 edges with conditions
  - [ ] Set `entryNodeId: "topic_assembler"`
  - [ ] Add metadata (createdAt, author, changelog)
  - [ ] Compute and set `checksum` using `computeChecksum()`

- [ ] **Create `app/lib/graphs/flow2GraphV1_0_1.ts`** (~210 LOC)
  - [ ] Copy from v1.0.0
  - [ ] Add small change for demo diff (e.g., add `data_quality_check` node)
  - [ ] Update version to "1.0.1"
  - [ ] Update changelog: ["Added data quality validation step"]
  - [ ] Recompute checksum

### Step 3: API & Orchestrator Integration (Estimated: 45 min)

- [ ] **Modify `app/lib/graphKyc/types.ts`** (+15 LOC)
  - [ ] Import `GraphDefinition`, `GraphDiff` from `../../graphs/types`
  - [ ] Extend `GraphReviewResponse.graphReviewTrace` interface:
    ```typescript
    graphReviewTrace: {
      events: GraphTraceEvent[];
      summary: { ... };
      skillInvocations?: any[];
      graph: {                          // NEW
        graphId: string;
        version: string;
        checksum: string;
      };
      graphDefinition?: GraphDefinition; // NEW (optional)
      graphDiff?: GraphDiff;            // NEW (optional)
    };
    ```

- [ ] **Modify `app/lib/graphKyc/orchestrator.ts`** (+20 LOC)
  - [ ] Import `flow2GraphV1` from `../graphs/flow2GraphV1`
  - [ ] Import `flow2GraphV1_0_1` from `../graphs/flow2GraphV1_0_1` (for demo)
  - [ ] Import `computeChecksum`, `computeGraphDiff` from `../graphs/graphUtils`
  - [ ] In `runGraphKycReview()` response builder:
    - [ ] Always add `graph` metadata:
      ```typescript
      graph: {
        graphId: flow2GraphV1.graphId,
        version: flow2GraphV1.version,
        checksum: computeChecksum(flow2GraphV1)
      }
      ```
    - [ ] Conditionally add `graphDefinition` (dev mode or env var):
      ```typescript
      if (process.env.NODE_ENV === 'development' || process.env.INCLUDE_GRAPH_DEFINITION === 'true') {
        response.graphReviewTrace.graphDefinition = flow2GraphV1;
      }
      ```
    - [ ] Conditionally add `graphDiff` (demo only):
      ```typescript
      if (process.env.DEMO_GRAPH_DIFF === 'true') {
        response.graphReviewTrace.graphDiff = computeGraphDiff(flow2GraphV1, flow2GraphV1_0_1);
      }
      ```

### Step 4: UI Components (Estimated: 2 hours)

- [ ] **Create `app/components/GraphDefinitionPanel.tsx`** (~250 LOC)
  - [ ] Define props:
    ```typescript
    interface GraphDefinitionPanelProps {
      graph: { graphId: string; version: string; checksum: string };
      graphDefinition?: GraphDefinition;
      graphDiff?: GraphDiff;
    }
    ```
  - [ ] Render Section 1: Metadata Summary (always visible)
    - [ ] `data-testid="graph-metadata-summary"`
    - [ ] Display graphId, version, checksum
    - [ ] Show definition status: "Full definition available" or "Metadata only"
  - [ ] Render Section 2: Definition Viewer (if `graphDefinition` present)
    - [ ] `data-testid="graph-definition-view"`
    - [ ] Collapsible `<details>` element
    - [ ] JSON formatted with `<pre>` tag
    - [ ] Syntax highlighting (optional - use simple formatting if complex)
  - [ ] Render Section 3: Diff Viewer (if `graphDiff` present)
    - [ ] `data-testid="graph-diff-view"`
    - [ ] Color-coded changes:
      - [ ] Green: node_added, edge_added
      - [ ] Orange: node_modified, edge_modified
      - [ ] Red: node_removed, edge_removed
    - [ ] Show change count summary
  - [ ] Add `safeDisplay()` helper for type-safe rendering
  - [ ] Handle missing data gracefully (no crashes)

- [ ] **Modify `app/components/ReviewConfigDrawer.tsx`** (+40 LOC)
  - [ ] Import `GraphDefinitionPanel` from `./GraphDefinitionPanel`
  - [ ] Add "Graph Definition" tab button in tab navigation section (~line 570):
    ```typescript
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
  - [ ] Add tab content area for Graph Definition (~line 890):
    ```typescript
    {activeTab === 'graphDef' && graphReviewTrace?.graph && (
      <GraphDefinitionPanel
        graph={graphReviewTrace.graph}
        graphDefinition={graphReviewTrace.graphDefinition}
        graphDiff={graphReviewTrace.graphDiff}
      />
    )}
    ```
  - [ ] Ensure proper TypeScript types for new fields

### Step 5: Tests (Estimated: 2 hours)

- [ ] **Create `tests/api/graphDefinition.test.ts`** (~120 LOC)
  - [ ] Import test utilities
  - [ ] Import response schema validator
  - [ ] Test Suite: "Graph Definition Metadata"
    - [ ] Test: "includes graph metadata in langgraph_kyc response"
      - [ ] POST /api/orchestrate with mode=langgraph_kyc
      - [ ] Assert `graphReviewTrace.graph` exists
      - [ ] Assert `graph.graphId === "flow2_kyc_v1"`
      - [ ] Assert `graph.version` matches semver pattern
      - [ ] Assert `graph.checksum.length === 12`
    - [ ] Test: "checksum stable across runs"
      - [ ] Run same request twice
      - [ ] Assert checksums match
    - [ ] Test: "graphDefinition included in dev mode"
      - [ ] Verify `graphReviewTrace.graphDefinition` exists (in dev)
      - [ ] Assert `graphDefinition.nodes.length === 8`
      - [ ] Assert `graphDefinition.edges.length >= 12`
    - [ ] Test: "handles missing graphDefinition gracefully"
      - [ ] Mock production mode (if possible)
      - [ ] Assert `graphReviewTrace.graph` exists
      - [ ] Assert `graphReviewTrace.graphDefinition === undefined` (ok)

- [ ] **Create `tests/unit/graphUtils.test.ts`** (~80 LOC)
  - [ ] Test Suite: "computeChecksum"
    - [ ] Test: "produces consistent checksum for same definition"
    - [ ] Test: "produces different checksum for different definitions"
    - [ ] Test: "excludes metadata from checksum"
    - [ ] Test: "handles node reordering (stable sort)"
  - [ ] Test Suite: "computeGraphDiff"
    - [ ] Test: "detects node additions"
    - [ ] Test: "detects node removals"
    - [ ] Test: "detects node modifications"
    - [ ] Test: "detects edge additions"
    - [ ] Test: "generates human-readable descriptions"

- [ ] **Create `tests/e2e/flow2-graph-definition.spec.ts`** (~100 LOC)
  - [ ] Test Suite: "Flow2 Graph Definition UI"
    - [ ] Test: "Graph Definition tab appears after Flow2 review"
      - [ ] Load Flow2 page with scenario
      - [ ] Load sample documents
      - [ ] Run graph review
      - [ ] Open Agent Panel
      - [ ] Assert `[data-testid="graph-definition-tab-button"]` visible
    - [ ] Test: "Metadata summary displays correct info"
      - [ ] Click Graph Definition tab
      - [ ] Assert `[data-testid="graph-metadata-summary"]` visible
      - [ ] Assert contains "flow2_kyc_v1"
      - [ ] Assert contains version pattern
      - [ ] Assert contains checksum
    - [ ] Test: "Definition viewer renders when available"
      - [ ] Assert `[data-testid="graph-definition-view"]` visible (in dev mode)
      - [ ] Assert contains valid JSON (no "undefined" or "[object Object]")
    - [ ] Test: "Handles missing graphDefinition gracefully"
      - [ ] Should not crash if graphDefinition undefined
      - [ ] Should show "Metadata only" message

### Step 6: Verification (Estimated: 30 min)

- [ ] **Run type check:**
  ```bash
  npm run typecheck
  ```
  - [ ] Fix any type errors

- [ ] **Run API tests:**
  ```bash
  npm run test:api
  ```
  - [ ] Verify all 37+ tests pass (34 existing + 3+ new)

- [ ] **Run Playwright tests:**
  ```bash
  npm run test:e2e
  ```
  - [ ] Verify Graph Definition tests pass

- [ ] **Manual testing:**
  - [ ] Start dev server: `npm run dev`
  - [ ] Navigate to `/document?flow=2&scenario=fast`
  - [ ] Load sample documents
  - [ ] Run graph review
  - [ ] Open Agent Panel
  - [ ] Click "Graph Definition" tab
  - [ ] Verify metadata summary shows correct info
  - [ ] Verify definition viewer shows JSON (in dev mode)
  - [ ] Check browser console for errors (should be none)

- [ ] **Update DEMO.md:**
  - [ ] Add section: "Phase 3: Graph Definition Tab"
  - [ ] Include demo steps for Graph Definition tab
  - [ ] Document env vars: `INCLUDE_GRAPH_DEFINITION`, `DEMO_GRAPH_DIFF`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Status |
|------|------------|--------|-------------------|
| Checksum instability | Low | Medium | ✅ Locked (stable algorithm) |
| API gating ambiguity | Low | High | ✅ Locked (Option A with dev default) |
| Trace mapping confusion | Medium | Medium | ✅ Locked (internal node labels) |
| UI crashes on missing data | Low | High | ✅ Mitigated (safe display helpers) |
| Test flakiness | Low | Medium | ✅ Mitigated (deterministic API tests) |

---

## Approval Checklist

Before proceeding with implementation:

- [ ] Decision 1 (checksum algorithm) approved
- [ ] Decision 2 (API gating) approved
- [ ] Decision 3 (node granularity & trace mapping) approved
- [ ] File-by-file checklist reviewed
- [ ] Estimated time budget acceptable (7-8 hours)
- [ ] Risk assessment reviewed

**Once all items checked, proceed to TASK 1 (Implementation).**

---

_Phase 3 Plan Patch v1.0.1 • Ready for Approval • 2025-12-31_


# Phase 3: Graph as Artifact - Implementation Plan

## Executive Summary

Phase 3 makes Flow2's implicit graph execution model **explicit, versionable, and reviewable** by introducing:
1. A formal `GraphDefinition` artifact (nodes, edges, conditions, bindings)
2. Runtime trace-to-definition mapping
3. Diff computation and visualization for graph evolution
4. New "Graph Definition" tab in Agent Panel

**Key Principle:** Additive changes only. No breaking changes to existing Flow2 semantics or Flow1 behavior.

---

## 1. Scope & Non-Scope

### In Scope
- ✅ Create `GraphDefinition` type and schema (TS + JSON serializable)
- ✅ Generate Flow2 graph definition artifact (v1.0.0 baseline)
- ✅ Compute stable checksum from definition
- ✅ Extend `graphReviewTrace` API response with graph metadata
- ✅ Map runtime trace events to definition nodeIds
- ✅ Implement graph diff algorithm (v1 vs v2)
- ✅ Add "Graph Definition" tab to Agent Panel (Flow2 only)
- ✅ Add API tests for graph metadata presence and checksum stability
- ✅ Add Playwright test for Graph Definition tab visibility

### Out of Scope (Phase 3)
- ❌ Natural-language graph editing (deferred to Phase D)
- ❌ Multi-version storage/history (just v1 baseline for now)
- ❌ Graph validation beyond basic schema checks
- ❌ Dynamic graph modification at runtime
- ❌ Flow1 graph definition (not a graph-based flow)

---

## 2. Discovery Summary

**Current State (Implicit Graph):**
- **Orchestrator:** `app/lib/graphKyc/orchestrator.ts` (~500 LOC)
  - Sequential execution: topic_assembler → risk_triage → parallel_checks → reflect → finalize
  - Conditional edges: `routeAfterReflection()` decides next action based on `state.nextAction`
  - Nodes: `topic_assembler`, `risk_triage`, `parallel_checks`, `reflect_and_replan`, `routing_decision`, `human_gate`, `finalize`, `error_handler`
- **Executor:** `app/lib/graphKyc/executor.ts` (~150 LOC)
  - Parallel checks: `conflict_sweep`, `gap_collector`, `policy_flags_check`
  - Path-based skip logic (fast/crosscheck/escalate/human_gate)
- **Trace Events:** `GraphTraceEvent` type at `app/lib/graphKyc/types.ts`
  - Fields: `node`, `status`, `decision`, `reason`, `startedAt`, `endedAt`, `durationMs`
  - Generated inline in orchestrator/executor
- **Agent Panel Tabs:** `app/components/ReviewConfigDrawer.tsx`
  - Existing tabs: Overview, Scope Planning (Flow1), Graph Trace (Flow2), Conflicts, Gaps, Skills, Agent Runs, Config
  - Tab visibility controlled by presence of `graphReviewTrace`, `batchReviewTrace`, etc.

**Key Insight:** Flow2 graph is currently "encoded" as imperative code with switch/case logic. Phase 3 externalizes this into a declarative artifact.

---

## 3. Architecture

### 3.1 GraphDefinition Format

**Hybrid Approach:**
- **Primary:** TypeScript object (`app/lib/graphs/flow2Graph.ts`) - source of truth, type-checked
- **Secondary:** JSON serialization for API responses, diffs, and checksums

**Why not JSON-first?**
- TS provides type safety, IDE autocomplete, and compile-time validation
- JSON serialization is trivial (`JSON.stringify` with sorted keys)

**Storage:**
- Versioned TS files: `app/lib/graphs/flow2GraphV1.ts`, `app/lib/graphs/flow2GraphV1_0_1.ts` (for demo diff)
- Each exports a `GraphDefinition` object

### 3.2 Checksum Computation

```typescript
function computeChecksum(definition: GraphDefinition): string {
  // Stable JSON stringify (sorted keys, no whitespace)
  const stableJson = JSON.stringify(definition, Object.keys(definition).sort());
  // SHA-256 hash (first 12 chars for brevity)
  return crypto.createHash('sha256').update(stableJson).digest('hex').substring(0, 12);
}
```

**Stability:** Same definition → same checksum (deterministic).

### 3.3 Trace-to-Definition Mapping

**Current:** Trace events have `node: string` (e.g., `"topic_assembler"`)

**Phase 3 Enhancement:**
- Each `GraphTraceEvent` already has `node` field matching `GraphNode.id`
- No changes needed to event structure
- Mapping is implicit: `event.node === nodeDefinition.id`

**For "why skipped":**
- Existing `reason` field already captures this (e.g., "Fast path - skip conflict check")
- Formalize in definition: each `GraphEdge` has optional `condition` explaining why it fires

### 3.4 API Response Extension

**Current:**
```typescript
graphReviewTrace: {
  events: GraphTraceEvent[];
  summary: { path, riskScore, ... };
  skillInvocations: SkillInvocation[];
}
```

**Phase 3 Addition:**
```typescript
graphReviewTrace: {
  events: GraphTraceEvent[];
  summary: { path, riskScore, ... };
  skillInvocations: SkillInvocation[];
  graph: {                          // NEW: Minimal metadata (always present)
    graphId: string;                // "flow2_kyc_v1"
    version: string;                // "1.0.0"
    checksum: string;               // "a3f2b9c4e1d8"
  };
  graphDefinition?: GraphDefinition; // NEW: Full definition (optional, gated by query param or feature flag)
  graphDiff?: GraphDiff;            // NEW: Diff vs previous version (optional, demo only)
}
```

**Gating Strategy:**
- `graph` metadata: always present (minimal cost)
- `graphDefinition`: present if `?includeGraphDefinition=true` query param OR demo mode
- `graphDiff`: present if comparing two versions (demo only for Phase 3)

---

## 4. TypeScript Types (Proposed)

See `PHASE_3_GRAPH_SCHEMA.md` for full schema details. Key interfaces:

```typescript
// app/lib/graphs/types.ts
export interface GraphDefinition {
  graphId: string;           // "flow2_kyc_v1"
  version: string;           // "1.0.0" (semantic version)
  checksum: string;          // Computed SHA-256 hash
  description: string;       // Human-readable purpose
  nodes: GraphNode[];
  edges: GraphEdge[];
  entryNodeId: string;       // "topic_assembler"
  metadata?: {
    createdAt: string;
    author: string;
    changelog?: string[];
  };
}

export interface GraphNode {
  id: string;                // "topic_assembler", "risk_triage", etc.
  type: 'agent' | 'skill' | 'router' | 'gate' | 'system';
  label: string;             // Display name
  description: string;
  binding?: {                // What actually executes
    skillName?: string;      // For type='skill': "kyc.topic_assemble"
    agentName?: string;      // For type='agent'
    functionRef?: string;    // For type='system': "executeParallelChecks"
  };
  config?: Record<string, any>; // Node-specific config
}

export interface GraphEdge {
  id: string;                // "edge_1", "edge_2", etc.
  fromNodeId: string;
  toNodeId: string;
  condition?: GraphCondition; // If present, edge is conditional
  label?: string;            // Display label (e.g., "replan_count < 1")
}

export interface GraphCondition {
  type: 'always' | 'state_check' | 'output_check' | 'reflection_decision';
  expression?: string;       // JS-like expression (e.g., "state.nextAction === 'rerun_batch_review'")
  description: string;       // Human-readable
}

export interface GraphDiff {
  fromVersion: string;
  toVersion: string;
  changes: GraphChange[];
}

export interface GraphChange {
  type: 'node_added' | 'node_removed' | 'node_modified' | 'edge_added' | 'edge_removed' | 'edge_modified';
  path: string;              // JSON path (e.g., "nodes[2].binding.skillName")
  oldValue?: any;
  newValue?: any;
  description: string;       // Human-readable summary
}
```

---

## 5. File-by-File Modifications

### 5.1 New Files

| File | Purpose | Est LOC | Risk |
|------|---------|---------|------|
| `app/lib/graphs/types.ts` | GraphDefinition types (as above) | 150 | Low - pure types |
| `app/lib/graphs/flow2GraphV1.ts` | Baseline v1.0.0 graph definition | 200 | Low - data only |
| `app/lib/graphs/flow2GraphV1_0_1.ts` | Minor edit for demo diff (v1.0.1) | 210 | Low - demo only |
| `app/lib/graphs/graphUtils.ts` | Checksum, diff, validation utils | 150 | Medium - logic complexity |
| `app/components/GraphDefinitionPanel.tsx` | New UI component for Graph tab | 250 | Medium - UI rendering |
| `tests/api/graphDefinition.test.ts` | API tests for graph metadata | 100 | Low - deterministic |
| `tests/e2e/flow2-graph-definition.spec.ts` | Playwright test for Graph tab | 80 | Low - UI presence only |

**Total New Code:** ~1140 LOC

### 5.2 Modified Files

| File | Changes | Est LOC Changed | Risk |
|------|---------|-----------------|------|
| `app/lib/graphKyc/types.ts` | Add `graph`, `graphDefinition?`, `graphDiff?` to `GraphReviewResponse.graphReviewTrace` | +10 | Low - additive |
| `app/lib/graphKyc/orchestrator.ts` | Import and attach graph metadata to response | +15 | Low - non-breaking append |
| `app/components/ReviewConfigDrawer.tsx` | Add "Graph Definition" tab button and content area | +30 | Low - standard tab pattern |
| `app/document/page.tsx` | Pass `graphDefinition` and `graphDiff` to ReviewConfigDrawer | +5 | Low - prop passing |

**Total Modified Code:** ~60 LOC

---

## 6. Data Contract Changes

### 6.1 API Request (No Changes)

Flow2 requests remain unchanged. Graph definition is server-side only.

### 6.2 API Response Extension

**`POST /api/orchestrate` with `mode: "langgraph_kyc"`**

**Before Phase 3:**
```json
{
  "issues": [...],
  "graphReviewTrace": {
    "events": [...],
    "summary": { "path": "crosscheck", ... },
    "skillInvocations": [...]
  }
}
```

**After Phase 3:**
```json
{
  "issues": [...],
  "graphReviewTrace": {
    "events": [...],
    "summary": { "path": "crosscheck", ... },
    "skillInvocations": [...],
    "graph": {
      "graphId": "flow2_kyc_v1",
      "version": "1.0.0",
      "checksum": "a3f2b9c4e1d8"
    },
    "graphDefinition": {  // Optional: only if ?includeGraphDefinition=true
      "graphId": "flow2_kyc_v1",
      "version": "1.0.0",
      "nodes": [...],
      "edges": [...],
      ...
    },
    "graphDiff": null  // Optional: only for demo when comparing versions
  }
}
```

**Backward Compatibility:** Existing clients ignore new fields. No breaking changes.

---

## 7. UI Plan

### 7.1 New Tab: "Graph Definition"

**Location:** Agent Panel (ReviewConfigDrawer.tsx), after "Skills" tab

**Tab Button:**
- Label: `📐 Graph` (or `🗺️ Graph`)
- `data-testid="graph-definition-tab-button"`
- Visible when: `graphReviewTrace?.graph` exists (always for Flow2)
- Color: Teal border (`border-teal-600`) when active

**Tab Content:**

**Section 1: Metadata Summary (Always Visible)**
```
┌─────────────────────────────────────────┐
│ Graph Metadata                          │
├─────────────────────────────────────────┤
│ ID: flow2_kyc_v1                        │
│ Version: 1.0.0                          │
│ Checksum: a3f2b9c4e1d8                  │
└─────────────────────────────────────────┘
```
- `data-testid="graph-metadata-summary"`

**Section 2: Definition Viewer (Collapsible, if present)**
```
┌─────────────────────────────────────────┐
│ ▼ Full Definition (JSON)                │
├─────────────────────────────────────────┤
│ {                                       │
│   "graphId": "flow2_kyc_v1",            │
│   "nodes": [ ... ],                     │
│   ...                                   │
│ }                                       │
└─────────────────────────────────────────┘
```
- `data-testid="graph-definition-view"`
- Collapsible `<details>` element
- JSON formatted with `<pre>` tag, syntax highlighting optional

**Section 3: Diff Viewer (if present - demo only)**
```
┌─────────────────────────────────────────┐
│ 🔀 Changes: v1.0.0 → v1.0.1             │
├─────────────────────────────────────────┤
│ ➕ Added: node "data_quality_check"     │
│ ✏️ Modified: edge_3 condition changed   │
│ 📝 3 changes total                      │
└─────────────────────────────────────────┘
```
- `data-testid="graph-diff-view"`
- Color-coded changes: green (+), orange (✏️), red (-)

### 7.2 Component: GraphDefinitionPanel

**Props:**
```typescript
interface GraphDefinitionPanelProps {
  graph: {
    graphId: string;
    version: string;
    checksum: string;
  };
  graphDefinition?: GraphDefinition;
  graphDiff?: GraphDiff;
}
```

**Rendering Logic:**
- Always show metadata summary
- Show definition viewer only if `graphDefinition` present
- Show diff viewer only if `graphDiff` present
- Use `safeDisplay()` helpers for all dynamic content (type safety)

---

## 8. Test Plan

### 8.1 API Tests (`tests/api/graphDefinition.test.ts`)

**Test Suite:** Graph Definition Metadata

**Test 1: Graph metadata present in Flow2 response**
```typescript
it('includes graph metadata in graphReviewTrace', async () => {
  const response = await fetch(`${API_BASE}/api/orchestrate`, {
    method: 'POST',
    body: JSON.stringify({
      mode: 'langgraph_kyc',
      documents: [{ name: 'doc1', content: 'Test' }]
    })
  });
  const data = await response.json();
  
  expect(data.graphReviewTrace.graph).toBeDefined();
  expect(data.graphReviewTrace.graph.graphId).toBe('flow2_kyc_v1');
  expect(data.graphReviewTrace.graph.version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(data.graphReviewTrace.graph.checksum).toHaveLength(12);
});
```

**Test 2: Checksum stable for same definition**
```typescript
it('produces stable checksum across runs', async () => {
  const run1 = await fetch(...);
  const run2 = await fetch(...);
  const data1 = await run1.json();
  const data2 = await run2.json();
  
  expect(data1.graphReviewTrace.graph.checksum).toBe(data2.graphReviewTrace.graph.checksum);
});
```

**Test 3: Full definition included when requested (future - optional for Phase 3)**
```typescript
it.skip('includes full definition when query param set', async () => {
  // Deferred: requires query param implementation
});
```

### 8.2 Unit Tests (`tests/unit/graphUtils.test.ts`)

**Test Suite:** Graph Utilities

**Test 1: Checksum computation**
```typescript
it('computes consistent checksum for graph definition', () => {
  const def1 = { graphId: 'test', version: '1.0.0', nodes: [...] };
  const def2 = { graphId: 'test', version: '1.0.0', nodes: [...] }; // Same
  expect(computeChecksum(def1)).toBe(computeChecksum(def2));
});
```

**Test 2: Diff algorithm**
```typescript
it('detects node additions', () => {
  const v1 = { nodes: [{ id: 'a' }], edges: [] };
  const v2 = { nodes: [{ id: 'a' }, { id: 'b' }], edges: [] };
  const diff = computeGraphDiff(v1, v2);
  
  expect(diff.changes).toContainEqual({
    type: 'node_added',
    path: 'nodes[1]',
    newValue: { id: 'b' },
    description: expect.stringContaining('Added node: b')
  });
});
```

### 8.3 Playwright E2E (`tests/e2e/flow2-graph-definition.spec.ts`)

**Test Suite:** Flow2 Graph Definition UI

**Test 1: Graph Definition tab visible**
```typescript
test('Graph Definition tab appears after Flow2 review', async ({ page }) => {
  await page.goto('/document?flow=2&scenario=fast');
  await page.locator('[data-testid="flow2-load-sample-button"]').click();
  await page.waitForTimeout(1000);
  await page.locator('[data-testid="flow2-run-graph-review"]').click();
  await page.waitForResponse(res => res.url().includes('/api/orchestrate'), { timeout: 30000 });
  
  // Open Agent Panel
  await page.locator('[data-testid="agent-panel-button"]').click();
  
  // Graph Definition tab should be visible
  const graphTab = page.locator('[data-testid="graph-definition-tab-button"]');
  await expect(graphTab).toBeVisible({ timeout: 5000 });
});
```

**Test 2: Metadata summary renders**
```typescript
test('Graph metadata summary displays correct info', async ({ page }) => {
  // ... (same setup as Test 1) ...
  
  // Click Graph Definition tab
  await page.locator('[data-testid="graph-definition-tab-button"]').click();
  
  // Metadata summary should be visible
  const metadataSummary = page.locator('[data-testid="graph-metadata-summary"]');
  await expect(metadataSummary).toBeVisible({ timeout: 5000 });
  
  // Check content (lenient - just verify structure)
  await expect(metadataSummary).toContainText('flow2_kyc_v1');
  await expect(metadataSummary).toContainText(/\d+\.\d+\.\d+/); // Version regex
});
```

**Test 3: No crashes on missing data (defensive)**
```typescript
test('handles missing graphDefinition gracefully', async ({ page }) => {
  // ... (same setup) ...
  
  // Should not crash even if graphDefinition is absent
  const definitionView = page.locator('[data-testid="graph-definition-view"]');
  const count = await definitionView.count();
  
  // Either not present (ok) or present but no error
  if (count > 0) {
    await expect(definitionView).not.toContainText('undefined');
    await expect(definitionView).not.toContainText('[object Object]');
  }
});
```

---

## 9. Rollback Strategy

### 9.1 Feature Flag (Optional)

**Env Var:** `ENABLE_GRAPH_DEFINITION` (default: `true`)

If set to `false`:
- `graph` metadata still present (minimal data, always safe)
- `graphDefinition` and `graphDiff` omitted from response

**Why Minimal:** Phase 3 is low-risk additive changes. Full feature flag may be overkill, but provides instant disable if UI issues arise.

### 9.2 Single Revert

```bash
git revert HEAD  # Reverts "Phase 3: Graph as Artifact"
```

**Result:** All Phase 3 code removed, Phase 2 behavior restored.

---

## 10. Definition of Done Checklist

- [ ] **Types Defined**
  - [ ] `GraphDefinition`, `GraphNode`, `GraphEdge`, `GraphCondition` types in `app/lib/graphs/types.ts`
  - [ ] `GraphDiff`, `GraphChange` types
  - [ ] Extended `GraphReviewResponse.graphReviewTrace` with `graph`, `graphDefinition?`, `graphDiff?`

- [ ] **Graph Artifacts Created**
  - [ ] `app/lib/graphs/flow2GraphV1.ts` - Baseline v1.0.0 definition (matches current orchestrator behavior)
  - [ ] `app/lib/graphs/flow2GraphV1_0_1.ts` - Minor edit for demo diff (e.g., add a node)

- [ ] **Utilities Implemented**
  - [ ] `computeChecksum(definition)` - Stable SHA-256 hash
  - [ ] `computeGraphDiff(v1, v2)` - Detect node/edge changes
  - [ ] `validateGraphDefinition(definition)` - Basic schema validation (Zod optional)

- [ ] **Orchestrator Integration**
  - [ ] Import `flow2GraphV1` in `orchestrator.ts`
  - [ ] Attach `graph` metadata to `graphReviewTrace` in response
  - [ ] (Optional) Attach full `graphDefinition` if flag set

- [ ] **UI Components**
  - [ ] `GraphDefinitionPanel.tsx` component created
  - [ ] Tab button added to `ReviewConfigDrawer.tsx`
  - [ ] Metadata summary renders (`data-testid="graph-metadata-summary"`)
  - [ ] Definition viewer renders (collapsible, `data-testid="graph-definition-view"`)
  - [ ] Diff viewer renders if present (`data-testid="graph-diff-view"`)
  - [ ] Type-safe display (`safeDisplay()` for all dynamic content)

- [ ] **Tests Pass**
  - [ ] API test: graph metadata present (34 → 35+ tests)
  - [ ] API test: checksum stable
  - [ ] Unit tests: checksum computation, diff algorithm
  - [ ] Playwright: Graph Definition tab visible (2 → 3+ tests)
  - [ ] Playwright: Metadata summary renders
  - [ ] All existing tests still pass (regression check)

- [ ] **Documentation**
  - [ ] Update `DEMO.md` with Graph Definition tab demo steps
  - [ ] Add `PHASE_3_GRAPH_SCHEMA.md` with schema reference

- [ ] **Manual Verification**
  - [ ] Run Flow2 review → Graph Definition tab appears
  - [ ] Metadata summary shows correct graphId/version/checksum
  - [ ] JSON viewer shows full definition (if implemented)
  - [ ] Diff viewer shows changes between v1.0.0 and v1.0.1 (demo)
  - [ ] No console errors or type errors

---

## 11. Risks & Assumptions

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Checksum instability** - Non-deterministic JSON.stringify | Medium | Use sorted keys + stable serialization library if needed |
| **Diff algorithm complexity** - Deep object comparison is hard | Medium | Start with shallow diff (node/edge level only), skip nested config diffs in Phase 3 |
| **UI performance** - Large graph definitions slow JSON rendering | Low | Use collapsible sections, lazy render, or truncate for demo |
| **Type safety** - GraphDefinition might have mismatches with runtime | Medium | Add runtime validation (Zod) to catch discrepancies early |
| **Maintenance burden** - Manually sync definition with orchestrator changes | High | Document clearly: "Update flow2GraphV1.ts when orchestrator logic changes" |

### Assumptions

1. **Graph is stable:** Flow2 graph structure (nodes/edges) won't change frequently in short term
2. **Single version for Phase 3:** Only v1.0.0 baseline + v1.0.1 demo edit. Multi-version storage deferred to Phase 4.
3. **No runtime graph modification:** Definition is read-only at runtime. Dynamic graph editing is Phase D.
4. **Diff is demo-only:** Production use of diff requires version history store (out of scope).
5. **TS-first is acceptable:** Team is comfortable with TS artifacts over pure JSON config files.

---

## 12. Open Questions

1. **Graph Definition Storage:**
   - Q: Should we store `flow2GraphV1.ts` in `app/lib/graphs/` or `app/lib/graphKyc/graphs/`?
   - Recommendation: `app/lib/graphs/` - more generic, future-proof for other graph types

2. **API Gating for Full Definition:**
   - Q: Always include `graphDefinition` in response, or gate behind query param?
   - Recommendation: For Phase 3, always include (it's only ~1-2KB). Add gating in Phase 4 if response size becomes an issue.

3. **Diff Display Granularity:**
   - Q: Show fine-grained diffs (e.g., "binding.skillName changed") or coarse-grained (e.g., "node modified")?
   - Recommendation: Start coarse-grained (node/edge level). Fine-grained requires complex JSON path diffing.

4. **Validation Strictness:**
   - Q: Fail hard if runtime trace has node not in definition, or log warning?
   - Recommendation: Log warning + set `degraded: true` flag. Fail hard would break on mismatches during development.

5. **Tab Naming:**
   - Q: "Graph Definition" vs "Graph Schema" vs "Graph Artifact"?
   - Recommendation: "Graph Definition" - clearest to non-technical users. "Schema" sounds too technical, "Artifact" is ambiguous.

---

## 13. Implementation Order (Recommended)

1. **Step 1:** Create types (`app/lib/graphs/types.ts`) - 30 min
2. **Step 2:** Create baseline graph definition (`app/lib/graphs/flow2GraphV1.ts`) - 1 hour
3. **Step 3:** Implement checksum utility (`app/lib/graphs/graphUtils.ts`) - 30 min
4. **Step 4:** Extend API response types and orchestrator integration - 30 min
5. **Step 5:** Create GraphDefinitionPanel component - 1.5 hours
6. **Step 6:** Add tab to ReviewConfigDrawer - 30 min
7. **Step 7:** Write API tests - 45 min
8. **Step 8:** Write Playwright tests - 45 min
9. **Step 9:** Create v1.0.1 variant and implement diff algorithm - 1 hour
10. **Step 10:** Manual testing and refinement - 1 hour

**Total Estimate:** 7-8 hours

---

## 14. Success Metrics

- ✅ All existing tests pass (34 API + 2 Skills + 3 Reflection = 39 total)
- ✅ New API tests pass (2+)
- ✅ New Playwright tests pass (2+)
- ✅ Graph Definition tab visible in Flow2 Agent Panel
- ✅ Metadata summary displays correct info (graphId, version, checksum)
- ✅ Checksum remains stable across runs with same definition
- ✅ Diff correctly identifies changes between v1.0.0 and v1.0.1
- ✅ No console errors, no type errors, no runtime crashes
- ✅ Demo runs smoothly (6-min script in DEMO.md)

---

_Phase 3 Plan v1.0 • Ready for Review • Estimated 7-8 hours implementation_


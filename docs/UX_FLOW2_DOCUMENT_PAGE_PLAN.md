# Flow2 Document Page UX Redesign Plan

**Goal:** Clean up Flow2's right panel to match demo workflow, removing irrelevant elements and creating a logical, minimal user journey.

**Constraint:** Flow1 must remain 100% unchanged.

---

## 1. UX Target Layout (Wireframe)

### Flow2 Right Panel (New Design)

```
┌────────────────────────────────────────┐
│ STICKY HEADER                          │
│ ┌────────────────────────────────────┐ │
│ │ 📊 Review Status: [READY/PENDING]  │ │
│ │ Status explanation text...          │ │
│ │                                     │ │
│ │ [🕸️ Run Graph KYC Review] ←─ primary│ │
│ │ [🤖 Agents] ←────────────── secondary│ │
│ └────────────────────────────────────┘ │
├────────────────────────────────────────┤
│                                        │
│ COLLAPSIBLE INFO PANEL (optional)      │
│ ┌────────────────────────────────────┐ │
│ │ ℹ️ What Happens in Graph Review?   │ │
│ │ [▼] Click to expand                │ │
│ │                                     │ │
│ │ (when expanded:)                    │ │
│ │ 1. Topic Assembler                  │ │
│ │ 2. Risk Triage → Route Selection    │ │
│ │ 3. Parallel Checks (gap/conflict)   │ │
│ │ 4. Reflection (if needed)           │ │
│ │ 5. Output: Issues + Trace           │ │
│ └────────────────────────────────────┘ │
│                                        │
│ RESULTS (after review runs)            │
│ ┌────────────────────────────────────┐ │
│ │ ✅ Review Complete                  │ │
│ │ Risk Score: 0.50 (Medium)           │ │
│ │ Path: crosscheck                    │ │
│ │ Issues: 7 gaps, 2 conflicts         │ │
│ │                                     │ │
│ │ View details in Agents panel →     │ │
│ └────────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

### Flow1 Right Panel (Unchanged)

```
┌────────────────────────────────────────┐
│ STICKY HEADER                          │
│ Document Status: READY_TO_SUBMIT       │
│ [🔍 Run Full Review]                   │
│ [✍️ Sign Off on Warnings] (conditional)│
│ [📤 Submit Document]                   │
│                                        │
│ Review Type: [radio buttons]           │
│ - Compliance Review                    │
│ - Contract Risk Review                 │
│                                        │
│ [🤖 Agents]                            │
├────────────────────────────────────────┤
│ 🔍 Empty state or issues list...       │
└────────────────────────────────────────┘
```

---

## 2. Content Strategy (Copy for Flow2)

### Sticky Header Copy

**Before review runs:**
- Status: `Pending Review`
- Explanation: `Load or upload KYC documents, then run graph review to analyze.`
- Primary Button: `🕸️ Run Graph KYC Review` (disabled until docs loaded)
- Secondary Button: `🤖 Agents` (always visible)

**After review runs (success):**
- Status: `Review Complete`
- Explanation: `Risk score: {score} ({level}). Path: {path}. {issueCount} issues detected.`
- Primary Button: `🔄 Re-run Review` (enabled)
- Secondary Button: `🤖 Agents` (badge shows trace event count)

**After review runs (degraded):**
- Status: `Review Failed`
- Explanation: `Graph execution error. {degradedReason}`
- Primary Button: `🔄 Retry Review` (enabled)

### Collapsible Info Panel Copy

**Title:** `ℹ️ What Happens in Graph Review?`

**Content (expanded):**
```
Flow2 executes an agentic graph with adaptive routing:

1. Topic Assembler
   Organizes uploaded documents into KYC topics
   (identity, wealth source, transaction patterns)

2. Risk Triage
   Scores overall risk (0-1 scale) and selects path:
   • Fast (<0.3): Skip optional checks
   • Crosscheck (0.3-0.6): Run all parallel checks
   • Escalate (>0.6): Strict checks + human gate

3. Parallel Checks
   • Gap Collector: Missing information
   • Conflict Sweep: Cross-document contradictions
   • Policy Flags: Regulatory violations

4. Reflection (Optional)
   Agent pauses to evaluate: "Do I need more info?
   Should I rerun with stricter rules?"
   Decision: skip | rerun | escalate

5. Output
   • Issues list (gaps, conflicts, flags)
   • Graph trace (visible in Agents panel)
```

---

## 3. Component Strategy

### Reuse vs. Create

**Reuse (with gating):**
- Sticky header structure (lines 3187-3342)
- Agents button (line 3788-3799)
- Results display logic (lines 3352+)

**Create new:**
- `Flow2InfoPanel.tsx` - Collapsible "What Happens" explainer
- `Flow2ReviewStatus.tsx` - Simplified status display (no submit logic)

**Remove (Flow2 only):**
- Review Type radio group (lines 3802-3839) - **Flow2 does not use this**
- Submit Document button (line 3312-3322) - **Flow2 has no submission concept**
- Sign-off logic (lines 3294-3341) - **Flow2 uses human gates, not sign-offs**
- Magnifier empty state (lines 3344-3350) - **References non-existent button**

### Gating Logic

**Pattern: Conditional rendering at render-time**

```typescript
// In right panel render block (line ~3184):

{isFlow2 ? (
  // NEW: Flow2-specific right panel
  <Flow2RightPanel
    flow2Documents={flow2Documents}
    isOrchestrating={isOrchestrating}
    orchestrationResult={orchestrationResult}
    isDegraded={isDegraded}
    degradedReason={degradedReason}
    onRunReview={handleGraphKycReview}
    onOpenAgents={() => setShowAgentsDrawer(true)}
    agentCount={agentParticipants.length}
  />
) : (
  // EXISTING: Flow1 right panel (unchanged)
  <Flow1RightPanel
    documentStatus={documentStatus}
    sections={sections}
    currentIssues={currentIssues}
    // ... all existing props
  />
)}
```

**Why this approach?**
- Minimal diff: Single conditional at top level
- Zero risk to Flow1: Entire Flow1 block unchanged
- Clean separation: No shared logic that could break Flow1

---

## 4. File List to Modify/Create

### Create (3 new files)

1. **`app/components/flow2/Flow2RightPanel.tsx`**
   - Simplified right panel for Flow2
   - Props: documents, orchestrating state, results, callbacks
   - Renders: Status header, Run Review button, Agents button, Info panel, Results summary

2. **`app/components/flow2/Flow2InfoPanel.tsx`**
   - Collapsible "What Happens" explainer
   - State: `isExpanded` (default: false)
   - Renders: Title, expand/collapse button, content (5-step flow)

3. **`app/components/flow2/Flow2ReviewStatus.tsx`**
   - Status badge + explanation
   - Props: orchestrationResult, isDegraded, degradedReason
   - Renders: Status (Pending | Complete | Failed), explanation text

### Modify (1 file)

4. **`app/document/page.tsx`**
   - Lines ~3184-3850: Wrap right panel in `isFlow2 ? <Flow2RightPanel/> : <Flow1RightPanel/>`
   - Extract existing Flow1 right panel code into `<Flow1RightPanel/>` wrapper (no logic changes)
   - Import new Flow2 components
   - Pass `isFlow2`, `flow2Documents`, callbacks to new components

---

## 5. Definition of Done (DoD)

### Functional

- [ ] Flow2 right panel shows: Status, Run Review button, Agents button, Info panel, Results
- [ ] Flow2 right panel does NOT show: Review Type radio, Submit button, Sign-off button, Magnifier empty state
- [ ] "Run Graph KYC Review" button disabled until `flow2Documents.length > 0`
- [ ] After review, status shows risk score, path, issue count
- [ ] Info panel collapses/expands on click
- [ ] Agents button opens drawer (existing behavior)
- [ ] Flow1 behavior 100% unchanged (all buttons, copy, layout identical)

### Visual

- [ ] Flow2 right panel is clean, minimal, uncluttered
- [ ] Info panel uses subtle styling (blue/slate tones, not loud)
- [ ] Status explanation is concise (1-2 lines max)
- [ ] Agents button prominent (secondary action, not buried)

### Technical

- [ ] No shared component modifications (Flow1/Flow2 use separate components)
- [ ] All Flow2 components live in `app/components/flow2/`
- [ ] Gating uses `isFlow2` check (derived from `flowMode === "2"`)
- [ ] Zero TypeScript errors
- [ ] Zero prop drilling (pass only needed props)

---

## 6. Risk Assessment (Flow1 Protection)

### Mitigation Strategy

**Risk 1: Accidental Flow1 breakage**
- **Mitigation:** Extract Flow1 right panel into wrapper component with zero logic changes. Only move code, don't refactor.
- **Verification:** Visual diff of Flow1 before/after. Must be pixel-identical.

**Risk 2: Shared state contamination**
- **Mitigation:** Flow2 components receive props, don't modify page-level state directly. All state updates via callbacks.
- **Verification:** Test Flow1 → Flow2 → Flow1 navigation. State must reset correctly.

**Risk 3: CSS class conflicts**
- **Mitigation:** Flow2 components use BEM-like prefixes (`flow2-`) or scoped Tailwind. No global style changes.
- **Verification:** Inspect Flow1 element styles. No unexpected overrides.

**Risk 4: Conditional logic bugs**
- **Mitigation:** Use explicit `isFlow2 ? ... : ...` at render root, not scattered conditionals.
- **Verification:** Set `flowMode=1` and verify Flow1 code path never touches Flow2 components.

### Rollback Plan

If Flow1 breaks:
1. Revert `app/document/page.tsx` to git HEAD
2. Delete `app/components/flow2/Flow2RightPanel.tsx` and related files
3. Restore previous right panel inline code

---

## 7. Verification Steps

### Manual Testing

**Flow2 Smoke Test:**
1. Navigate to `/document?flow=2&scenario=crosscheck`
2. Verify: Right panel shows "Pending Review" status
3. Verify: "Run Graph KYC Review" button disabled
4. Click "Load Sample KYC Pack"
5. Verify: Button now enabled
6. Click "Run Graph KYC Review"
7. Verify: Status updates to "Review Complete" with risk score
8. Verify: Info panel can expand/collapse
9. Click "🤖 Agents"
10. Verify: Drawer opens with trace events

**Flow1 Regression Test:**
1. Navigate to `/document?flow=1`
2. Verify: Right panel identical to baseline (screenshot comparison recommended)
3. Verify: Review Type radio buttons present
4. Verify: Submit Document button present
5. Upload document → Confirm sections
6. Run Full Review
7. Verify: Sign-off button appears if warnings exist
8. Verify: Submit button enables when ready
9. Sign off → Submit
10. Verify: Success flow completes

**Cross-Flow Navigation Test:**
1. Start at Flow1 → Run review → Navigate to Flow2
2. Verify: Flow2 state clean (no leftover Flow1 issues)
3. Navigate back to Flow1
4. Verify: Flow1 state restored (or reset cleanly)

### Automated Testing

**E2E Tests (Playwright):**
- [ ] `tests/e2e/flow2-right-panel.spec.ts`
  - Verify Flow2 right panel renders correctly
  - Verify info panel expand/collapse
  - Verify button states (disabled → enabled)
  - Verify status updates after review
- [ ] `tests/e2e/flow1-regression.spec.ts`
  - Verify Flow1 right panel unchanged
  - Verify all Flow1 buttons present
  - Verify Flow1 review + submit workflow

**Visual Regression:**
- [ ] Percy/Chromatic snapshot of Flow1 right panel (before/after)
- [ ] Percy/Chromatic snapshot of Flow2 right panel (new baseline)

---

## 8. Implementation Checklist

### Phase 1: Extract Flow1 (Risk Mitigation)
- [ ] Create `app/components/flow1/Flow1RightPanel.tsx`
- [ ] Copy lines 3184-3850 from `page.tsx` (no logic changes)
- [ ] Replace inline code with `<Flow1RightPanel {...props} />`
- [ ] **Verify:** Flow1 smoke test passes
- [ ] **Verify:** Visual diff shows no changes
- [ ] Commit: `refactor: extract Flow1 right panel (no logic changes)`

### Phase 2: Build Flow2 Components
- [ ] Create `app/components/flow2/Flow2InfoPanel.tsx`
- [ ] Create `app/components/flow2/Flow2ReviewStatus.tsx`
- [ ] Create `app/components/flow2/Flow2RightPanel.tsx`
- [ ] **Verify:** Components render in isolation (Storybook or dev route)
- [ ] Commit: `feat: add Flow2 right panel components`

### Phase 3: Integrate Flow2
- [ ] Modify `page.tsx`: Add `{isFlow2 ? <Flow2.../> : <Flow1.../>}` conditional
- [ ] Pass required props to Flow2 components
- [ ] **Verify:** Flow2 smoke test passes
- [ ] **Verify:** Flow1 regression test passes
- [ ] Commit: `feat: integrate Flow2 right panel (Flow1 unchanged)`

### Phase 4: Polish & Test
- [ ] Add E2E tests
- [ ] Run visual regression
- [ ] Update demo docs if needed
- [ ] Final smoke test (Flow1 + Flow2)
- [ ] Commit: `test: add Flow2 right panel E2E tests`

---

## 9. Open Questions

**Q1:** Should Flow2 have a "Clear All" button for loaded documents in the right panel?
- **Answer:** No. Already exists in left panel (`Flow2DocumentsList` component). Right panel focuses on review action only.

**Q2:** Should Info panel default to expanded or collapsed?
- **Answer:** Collapsed. Users who need it will expand. Power users skip it.

**Q3:** Should we show trace event count badge on Agents button?
- **Answer:** Yes if `orchestrationResult?.graphReviewTrace?.events.length > 0`. Provides affordance.

**Q4:** What if Flow2 orchestration returns Flow1-style issues?
- **Answer:** Out of scope for this UX redesign. Flow2 results currently render in Agents drawer (Graph Trace, Gaps, Conflicts tabs). This plan doesn't change that.

---

## 10. Success Metrics

**UX:**
- Flow2 right panel has ≤ 3 primary actions (Run Review, Agents, optional Info)
- Zero irrelevant UI elements visible in Flow2
- Info panel provides value without clutter (90% collapse rate expected)

**Engineering:**
- Zero Flow1 regressions (all tests pass)
- Clean component separation (Flow1/Flow2 share no UI components)
- Diff size: ~500 lines added, ~50 lines modified in `page.tsx`

**Demo:**
- Demo script no longer needs to mention "ignore these buttons" for Flow2
- Faster demo flow (fewer distractions)

---

**END OF PLAN**

**Next Step:** Await approval before implementation.


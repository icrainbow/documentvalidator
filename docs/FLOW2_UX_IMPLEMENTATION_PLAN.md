# Flow2 Document Page UX Implementation Plan

**Status:** Ready for execution  
**Goal:** Redesign Flow2 document page to remove sections + clean up right panel, while keeping Flow1 100% unchanged

---

## Critical Design Decisions

1. **Flow2 does NOT render document sections** (left panel)
   - Sections are agent-generated runtime artifacts, not user inputs
   - Flow2 only shows: Upload/Paste/Demo panels + Results
   
2. **Flow2 right panel simplified:**
   - Remove: Review Type radio, Submit button, Sign-off logic, Magnifier empty state
   - Keep: Run Graph Review button, Agents button, Status display
   - Add: Optional collapsible "What Happens" info panel

3. **Gating strategy:**
   - Single `isFlow2` check at render boundaries
   - Extract Flow1 components first (rollback safety)
   - No shared mutable state

---

## Implementation Phases

### PHASE 1: Baseline & Safety (No UI Changes)

**Goal:** Establish safe baseline before any UX changes

#### Step 1.1: Create baseline snapshot
```bash
# Take screenshots for visual regression
# Flow1: /document?flow=1
# Flow2: /document?flow=2&scenario=crosscheck

git add -A
git commit -m "checkpoint: before Flow2 UX redesign"
```

#### Step 1.2: Run existing tests
```bash
npm run typecheck
npm run test:api
npx playwright test -c playwright.reflection.config.ts
```

**Exit Criteria:** All tests pass, baseline committed

---

### PHASE 2: Extract Flow1 Components (Risk Mitigation)

**Goal:** Isolate Flow1 code before touching Flow2

#### Step 2.1: Create Flow1 right panel component

**File:** `app/components/flow1/Flow1RightPanel.tsx`

**Action:** Copy lines 3184-3850 from `app/document/page.tsx` (right panel render block)

**Template:**
```typescript
'use client';

import { /* import all types/components used in right panel */ } from '...';

interface Flow1RightPanelProps {
  documentStatus: any; // Use proper types
  sections: any[];
  currentIssues: any[];
  orchestrationResult: any;
  isOrchestrating: boolean;
  isSubmitted: boolean;
  selectedFlowId: string;
  reviewConfig: any;
  signOff: any;
  agentParticipants: any[];
  // ... all other props needed by right panel
  onRunReview: () => void;
  onSubmit: () => void;
  onSignOff: () => void;
  onOpenAgents: () => void;
  // ... all other callbacks
}

export default function Flow1RightPanel(props: Flow1RightPanelProps) {
  // Paste entire right panel JSX here (lines 3184-3850)
  // Replace inline state/callbacks with props
  return (
    <div className="sticky top-6 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Existing Flow1 right panel code */}
    </div>
  );
}
```

**Critical:** This is a pure extraction. No logic changes. Just move code.

#### Step 2.2: Replace inline right panel with component

**File:** `app/document/page.tsx`

**Line ~3184:** Replace entire right panel block with:
```typescript
<Flow1RightPanel
  documentStatus={documentStatus}
  sections={sections}
  currentIssues={currentIssues}
  orchestrationResult={orchestrationResult}
  isOrchestrating={isOrchestrating}
  isSubmitted={isSubmitted}
  selectedFlowId={selectedFlowId}
  setSelectedFlowId={setSelectedFlowId}
  reviewConfig={reviewConfig}
  signOff={signOff}
  setSignOff={setSignOff}
  agentParticipants={agentParticipants}
  onRunReview={handleFullComplianceReview}
  onSubmit={handleSubmit}
  onSignOff={(newSignOff) => {
    setSignOff(newSignOff);
    saveSignOff(docKey || 'default', newSignOff);
  }}
  onOpenAgents={() => setShowAgentsDrawer(true)}
  // Pass all other required props/callbacks
/>
```

#### Step 2.3: Verify Flow1 unchanged

**Manual Test:**
1. Navigate to `/document?flow=1`
2. Upload document → Confirm sections
3. Run Full Review
4. Verify: Right panel identical to baseline (screenshot comparison)
5. Verify: All buttons work (Run Review, Sign Off, Submit, Agents)

**Automated Test:**
```bash
npm run typecheck  # Must pass
npx playwright test tests/e2e/flow1-*.spec.ts  # Must pass
```

**Exit Criteria:** Flow1 visually + functionally identical

#### Step 2.4: Commit extraction
```bash
git add app/components/flow1/Flow1RightPanel.tsx app/document/page.tsx
git commit -m "refactor: extract Flow1 right panel component (no logic changes)"
```

---

### PHASE 3: Build Flow2 Components (New UI)

**Goal:** Create Flow2-specific UI components in isolation

#### Step 3.1: Create Flow2 info panel

**File:** `app/components/flow2/Flow2InfoPanel.tsx`

```typescript
'use client';

import { useState } from 'react';

export default function Flow2InfoPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4 border-2 border-blue-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">ℹ️</span>
          <span className="font-semibold text-blue-900 text-sm">
            What Happens in Graph Review?
          </span>
        </div>
        <span className="text-blue-700 font-bold">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-3 bg-white text-xs text-slate-700 space-y-2">
          <p className="font-semibold text-slate-800">
            Flow2 executes an agentic graph with adaptive routing:
          </p>
          
          <div className="space-y-2 pl-2">
            <div>
              <span className="font-bold text-blue-700">1. Topic Assembler</span>
              <p className="pl-4 text-slate-600">
                Organizes uploaded documents into KYC topics (identity, wealth source, transaction patterns)
              </p>
            </div>
            
            <div>
              <span className="font-bold text-purple-700">2. Risk Triage</span>
              <p className="pl-4 text-slate-600">
                Scores overall risk (0-1 scale) and selects path:
                <br/>• Fast (&lt;0.3): Skip optional checks
                <br/>• Crosscheck (0.3-0.6): Run all parallel checks
                <br/>• Escalate (&gt;0.6): Strict checks + human gate
              </p>
            </div>
            
            <div>
              <span className="font-bold text-green-700">3. Parallel Checks</span>
              <p className="pl-4 text-slate-600">
                • Gap Collector: Missing information
                <br/>• Conflict Sweep: Cross-document contradictions
                <br/>• Policy Flags: Regulatory violations
              </p>
            </div>
            
            <div>
              <span className="font-bold text-orange-700">4. Reflection (Optional)</span>
              <p className="pl-4 text-slate-600">
                Agent pauses to evaluate: "Do I need more info? Should I rerun with stricter rules?"
                <br/>Decision: skip | rerun | escalate
              </p>
            </div>
            
            <div>
              <span className="font-bold text-slate-700">5. Output</span>
              <p className="pl-4 text-slate-600">
                • Issues list (gaps, conflicts, flags)
                <br/>• Graph trace (visible in Agents panel)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Step 3.2: Create Flow2 review status

**File:** `app/components/flow2/Flow2ReviewStatus.tsx`

```typescript
'use client';

interface Flow2ReviewStatusProps {
  hasDocuments: boolean;
  isOrchestrating: boolean;
  orchestrationResult: any | null;
  isDegraded: boolean;
  degradedReason?: string;
}

export default function Flow2ReviewStatus({
  hasDocuments,
  isOrchestrating,
  orchestrationResult,
  isDegraded,
  degradedReason
}: Flow2ReviewStatusProps) {
  
  // Determine status
  let status: 'pending' | 'running' | 'complete' | 'failed';
  let statusText: string;
  let explanation: string;
  let badgeColor: string;

  if (isDegraded) {
    status = 'failed';
    statusText = 'Review Failed';
    explanation = degradedReason || 'Graph execution encountered an error.';
    badgeColor = 'bg-red-600 text-white';
  } else if (isOrchestrating) {
    status = 'running';
    statusText = 'Review Running';
    explanation = 'Graph execution in progress...';
    badgeColor = 'bg-blue-600 text-white';
  } else if (orchestrationResult) {
    status = 'complete';
    
    // Extract risk score and path from trace
    const trace = orchestrationResult.graphReviewTrace;
    const riskScore = trace?.graph?.metadata?.riskScore || 0;
    const path = trace?.graph?.metadata?.path || 'unknown';
    const issueCount = orchestrationResult.issues?.length || 0;
    
    statusText = 'Review Complete';
    explanation = `Risk score: ${riskScore.toFixed(2)} (${getRiskLevel(riskScore)}). Path: ${path}. ${issueCount} issue${issueCount !== 1 ? 's' : ''} detected.`;
    badgeColor = 'bg-green-600 text-white';
  } else {
    status = 'pending';
    statusText = 'Pending Review';
    explanation = hasDocuments 
      ? 'Documents loaded. Click "Run Graph KYC Review" to analyze.'
      : 'Load or upload KYC documents to begin.';
    badgeColor = 'bg-slate-600 text-white';
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase ${badgeColor}`}>
          {statusText}
        </span>
        {orchestrationResult && (
          <span className="text-xs text-slate-500 font-mono">
            Trace: {orchestrationResult.parent_trace_id?.substring(0, 8)}...
          </span>
        )}
      </div>
      <p className="text-xs text-slate-700 leading-relaxed">
        {explanation}
      </p>
    </div>
  );
}

function getRiskLevel(score: number): string {
  if (score < 0.3) return 'Low';
  if (score < 0.6) return 'Medium';
  return 'High';
}
```

#### Step 3.3: Create Flow2 right panel container

**File:** `app/components/flow2/Flow2RightPanel.tsx`

```typescript
'use client';

import Flow2InfoPanel from './Flow2InfoPanel';
import Flow2ReviewStatus from './Flow2ReviewStatus';

interface Flow2RightPanelProps {
  flow2Documents: any[];
  isOrchestrating: boolean;
  orchestrationResult: any | null;
  isDegraded: boolean;
  degradedReason?: string;
  onRunReview: () => void;
  onRetry: () => void;
  onOpenAgents: () => void;
  agentParticipants: any[];
}

export default function Flow2RightPanel({
  flow2Documents,
  isOrchestrating,
  orchestrationResult,
  isDegraded,
  degradedReason,
  onRunReview,
  onRetry,
  onOpenAgents,
  agentParticipants
}: Flow2RightPanelProps) {
  
  const hasDocuments = flow2Documents.length > 0;
  const canRunReview = hasDocuments && !isOrchestrating;

  return (
    <div className="sticky top-6 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="bg-white border-2 border-slate-300 rounded-xl p-6">
        
        {/* Status Display */}
        <Flow2ReviewStatus
          hasDocuments={hasDocuments}
          isOrchestrating={isOrchestrating}
          orchestrationResult={orchestrationResult}
          isDegraded={isDegraded}
          degradedReason={degradedReason}
        />

        {/* Primary Action Buttons */}
        <div className="space-y-3 mb-6">
          {isDegraded ? (
            <button
              onClick={onRetry}
              disabled={isOrchestrating}
              className={`w-full px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-md ${
                isOrchestrating
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg'
              }`}
            >
              {isOrchestrating ? '🔄 Running...' : '🔄 Retry Review'}
            </button>
          ) : (
            <button
              onClick={onRunReview}
              disabled={!canRunReview}
              data-testid="flow2-run-graph-review"
              className={`w-full px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-md ${
                !canRunReview
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
              }`}
              title={!hasDocuments ? 'Load documents first' : ''}
            >
              {isOrchestrating ? '🔄 Running Review...' : '🕸️ Run Graph KYC Review'}
            </button>
          )}
          
          {/* Agents Button */}
          <button
            onClick={onOpenAgents}
            data-testid="agent-panel-button"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
          >
            <span>🤖 Agents</span>
            {agentParticipants.length > 0 && (
              <span className="px-2 py-0.5 bg-white text-blue-600 text-xs font-bold rounded-full">
                {agentParticipants.length}
              </span>
            )}
          </button>
        </div>

        {/* Info Panel */}
        <Flow2InfoPanel />

        {/* Results Summary (after review) */}
        {orchestrationResult && !isDegraded && (
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="font-bold text-green-800 text-sm">Review Complete</span>
            </div>
            <p className="text-xs text-green-700 mb-3">
              Graph execution successful. View detailed trace and issues in the Agents panel.
            </p>
            <button
              onClick={onOpenAgents}
              className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold"
            >
              📊 View Trace & Results →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Step 3.4: Commit Flow2 components
```bash
git add app/components/flow2/
git commit -m "feat: add Flow2 right panel components (not integrated yet)"
```

---

### PHASE 4: Integrate Flow2 (Conditional Rendering)

**Goal:** Gate Flow2 UI in document page, remove sections rendering for Flow2

#### Step 4.1: Add Flow2 conditional for LEFT panel (CRITICAL)

**File:** `app/document/page.tsx`

**Location:** Lines ~2900-3180 (left column sections rendering)

**Current code:**
```typescript
<div className="space-y-4">
  {/* Flow2 workspace panels */}
  {isFlow2 && (
    <div className="mb-6 space-y-4">
      <Flow2UploadPanel ... />
      <Flow2PastePanel ... />
      <Flow2DocumentsList ... />
    </div>
  )}
  
  {/* Sections rendering - CURRENTLY RENDERS FOR BOTH FLOWS */}
  {sections.map((section, index) => (
    <div key={section.id} ... >
      {/* Section card */}
    </div>
  ))}
</div>
```

**Change to:**
```typescript
<div className="space-y-4">
  {isFlow2 ? (
    // FLOW2: Only show workspace panels + demo loader + results
    <>
      <Flow2UploadPanel 
        onDocumentsLoaded={handleFlow2Upload}
        disabled={flow2Documents.length >= MAX_FLOW2_DOCUMENTS || isOrchestrating}
      />
      
      <Flow2PastePanel
        onDocumentAdded={handleFlow2PasteAdd}
        disabled={flow2Documents.length >= MAX_FLOW2_DOCUMENTS || isOrchestrating}
      />
      
      {flow2Documents.length > 0 && (
        <Flow2DocumentsList
          documents={flow2Documents}
          onRemove={handleFlow2RemoveDocument}
          onClearAll={handleFlow2ClearWorkspace}
        />
      )}
      
      {/* Human Gate Panel */}
      {humanGateState && (
        <HumanGatePanel
          gateId={humanGateState.gateId}
          prompt={humanGateState.prompt}
          options={humanGateState.options}
          context={humanGateState.context}
          onSubmit={handleHumanGateSubmit}
          onCancel={handleHumanGateCancel}
          isSubmitting={isOrchestrating}
        />
      )}
      
      {/* Degraded Mode Banner */}
      {isDegraded && (
        <div className="mb-4 bg-red-50 border-2 border-red-400 rounded-lg p-4">
          {/* Existing degraded UI */}
        </div>
      )}
      
      {/* Demo Scenario Loader */}
      <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-lg p-5">
        {/* Existing demo loader UI */}
      </div>
      
      {/* Loaded Documents Display */}
      {flow2Documents.length > 0 && (
        <div className="mb-6 bg-white border-2 border-purple-300 rounded-lg p-5">
          {/* Existing docs display UI */}
        </div>
      )}
    </>
  ) : (
    // FLOW1: Render sections as before
    sections.map((section, index) => (
      <div
        key={section.id}
        id={`sec-${index + 1}`}
        data-section-id={section.id}
        data-section-title={section.title}
        className={`scroll-mt-24 border-4 rounded-xl p-6 transition-all ${getSectionColor(section.status)} ...`}
      >
        {/* Existing section card UI - unchanged */}
      </div>
    ))
  )}
</div>
```

**Key Change:** Sections ONLY render when `!isFlow2`

#### Step 4.2: Add Flow2 conditional for RIGHT panel

**File:** `app/document/page.tsx`

**Location:** Line ~3184 (right column)

**Current code:**
```typescript
{/* Right Column: Review Results Panel */}
<div className="sticky top-6 h-[calc(100vh-4rem)] overflow-y-auto">
  <Flow1RightPanel
    documentStatus={documentStatus}
    sections={sections}
    // ... props
  />
</div>
```

**Change to:**
```typescript
{/* Right Column: Review Results Panel */}
<div>
  {isFlow2 ? (
    <Flow2RightPanel
      flow2Documents={flow2Documents}
      isOrchestrating={isOrchestrating}
      orchestrationResult={orchestrationResult}
      isDegraded={isDegraded}
      degradedReason={degradedReason}
      onRunReview={handleGraphKycReview}
      onRetry={handleFlow2Retry}
      onOpenAgents={() => setShowAgentsDrawer(true)}
      agentParticipants={agentParticipants}
    />
  ) : (
    <Flow1RightPanel
      documentStatus={documentStatus}
      sections={sections}
      currentIssues={currentIssues}
      orchestrationResult={orchestrationResult}
      isOrchestrating={isOrchestrating}
      isSubmitted={isSubmitted}
      selectedFlowId={selectedFlowId}
      setSelectedFlowId={setSelectedFlowId}
      reviewConfig={reviewConfig}
      signOff={signOff}
      setSignOff={setSignOff}
      agentParticipants={agentParticipants}
      onRunReview={handleFullComplianceReview}
      onSubmit={handleSubmit}
      onSignOff={(newSignOff) => {
        setSignOff(newSignOff);
        saveSignOff(docKey || 'default', newSignOff);
      }}
      onOpenAgents={() => setShowAgentsDrawer(true)}
      // ... all other Flow1 props
    />
  )}
</div>
```

#### Step 4.3: Import Flow2 components

**File:** `app/document/page.tsx`

**Add to imports (top of file):**
```typescript
import Flow2RightPanel from '../components/flow2/Flow2RightPanel';
```

#### Step 4.4: Commit integration
```bash
git add app/document/page.tsx
git commit -m "feat: integrate Flow2 right panel, remove sections rendering for Flow2"
```

---

### PHASE 5: Verification & Testing

**Goal:** Ensure Flow1 unchanged, Flow2 works correctly

#### Step 5.1: Manual smoke tests

**Flow1 Test:**
1. Navigate to `/document?flow=1`
2. **Verify:** Sections render on left (unchanged)
3. **Verify:** Right panel shows Review Type radio, Submit button
4. Upload document → Confirm sections
5. Run Full Review
6. **Verify:** Sign-off button appears if warnings
7. **Verify:** Submit button works
8. **Verify:** All buttons functional

**Flow2 Test:**
1. Navigate to `/document?flow=2&scenario=crosscheck`
2. **Verify:** NO sections rendered on left
3. **Verify:** Left panel shows only: Upload/Paste panels, Demo loader
4. **Verify:** Right panel shows: Status, Run Review button, Agents button
5. **Verify:** Right panel does NOT show: Review Type radio, Submit button
6. Click "Load Sample KYC Pack"
7. **Verify:** 3 documents load, Run Review button enables
8. Click "Run Graph KYC Review"
9. **Verify:** Status updates to "Review Complete" with risk score
10. **Verify:** Info panel can expand/collapse
11. Click "🤖 Agents"
12. **Verify:** Drawer opens with Graph Trace tab

#### Step 5.2: Visual regression

**Screenshots to compare:**
- Flow1 before/after (must be identical)
- Flow2 before/after (should be cleaner)

#### Step 5.3: Run automated tests
```bash
npm run typecheck  # Must pass
npm run test:api   # Must pass
npx playwright test -c playwright.reflection.config.ts  # Must pass
```

#### Step 5.4: Create E2E test for Flow2 UX

**File:** `tests/e2e/flow2-ux.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Flow2 Document Page UX', () => {
  test('should not render sections on left panel', async ({ page }) => {
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    // Load sample docs
    await page.click('[data-testid="flow2-load-sample-button"]');
    await page.waitForTimeout(500);
    
    // Verify NO sections rendered
    const sections = await page.locator('[data-section-id]').count();
    expect(sections).toBe(0);
  });
  
  test('right panel should not show Flow1 elements', async ({ page }) => {
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    // Verify Review Type radio NOT present
    const reviewTypeLabel = page.locator('text=Review Type:');
    await expect(reviewTypeLabel).toHaveCount(0);
    
    // Verify Submit button NOT present
    const submitButton = page.locator('button:has-text("Submit Document")');
    await expect(submitButton).toHaveCount(0);
  });
  
  test('right panel should show Flow2 elements', async ({ page }) => {
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    // Verify Run Graph Review button present
    const runButton = page.locator('[data-testid="flow2-run-graph-review"]');
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeDisabled(); // No docs loaded yet
    
    // Verify Agents button present
    const agentsButton = page.locator('[data-testid="agent-panel-button"]');
    await expect(agentsButton).toBeVisible();
    
    // Verify Info panel present
    const infoPanel = page.locator('text=What Happens in Graph Review?');
    await expect(infoPanel).toBeVisible();
  });
  
  test('should enable Run Review after loading docs', async ({ page }) => {
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    const runButton = page.locator('[data-testid="flow2-run-graph-review"]');
    await expect(runButton).toBeDisabled();
    
    // Load sample
    await page.click('[data-testid="flow2-load-sample-button"]');
    await page.waitForTimeout(500);
    
    // Button should now be enabled
    await expect(runButton).toBeEnabled();
  });
});
```

**Run test:**
```bash
npx playwright test tests/e2e/flow2-ux.spec.ts
```

#### Step 5.5: Commit tests
```bash
git add tests/e2e/flow2-ux.spec.ts
git commit -m "test: add E2E tests for Flow2 UX redesign"
```

---

## PHASE 6: Cleanup & Documentation

#### Step 6.1: Update demo docs

**File:** `docs/demo/DEMO_RUNBOOK.md`

**Update Flow2 segment to reflect new UI:**
- Remove references to sections in Flow2
- Emphasize clean, minimal right panel
- Update screenshots if needed

#### Step 6.2: Update README

**File:** `README.md`

**Add note under Demo section:**
```markdown
### Flow2 UX (Updated Dec 2025)

Flow2 now has a dedicated, minimal UX:
- **Left panel:** Document upload/paste only (no sections)
- **Right panel:** Run Graph Review + Agents access (no submit workflow)
- **Sections:** Generated by agents at runtime, not rendered in UI

This matches the agentic, graph-first demo experience.
```

#### Step 6.3: Final commit
```bash
git add docs/ README.md
git commit -m "docs: update demo docs for Flow2 UX redesign"
```

---

## File Summary

### Files Created (4)
1. `app/components/flow1/Flow1RightPanel.tsx` - Extracted Flow1 right panel
2. `app/components/flow2/Flow2InfoPanel.tsx` - "What Happens" explainer
3. `app/components/flow2/Flow2ReviewStatus.tsx` - Status display
4. `app/components/flow2/Flow2RightPanel.tsx` - Flow2 right panel container
5. `tests/e2e/flow2-ux.spec.ts` - E2E tests for new UX

### Files Modified (3)
1. `app/document/page.tsx` - Conditional rendering for left + right panels
2. `docs/demo/DEMO_RUNBOOK.md` - Updated Flow2 demo steps
3. `README.md` - Added Flow2 UX notes

### Code Removed/Gated (Flow2 Only)
1. **Left panel:** Sections rendering (lines ~3045-3180) → Gated with `!isFlow2`
2. **Right panel:** Review Type radio, Submit button, Sign-off logic → Replaced with Flow2RightPanel

---

## Rollback Plan

If issues arise:

**Phase 2 rollback (Flow1 extraction failed):**
```bash
git revert HEAD~1  # Revert extraction commit
# Fix issues, retry Phase 2
```

**Phase 4 rollback (Flow2 integration broke Flow1):**
```bash
git revert HEAD~1  # Revert integration commit
# Flow1 still works via extracted component
# Fix Flow2 issues in isolation, re-integrate
```

**Nuclear rollback:**
```bash
git reset --hard <baseline-commit-sha>
# Start over from Phase 1
```

---

## Success Criteria

- [ ] Flow1 visually + functionally identical to baseline
- [ ] Flow2 does NOT render sections on left panel
- [ ] Flow2 right panel clean (no Review Type, no Submit)
- [ ] Flow2 info panel collapses/expands
- [ ] All buttons functional (Run Review, Agents)
- [ ] All tests pass (typecheck, API, E2E)
- [ ] Demo docs updated

---

**Status:** Ready for execution  
**Estimated Time:** 2-3 hours (careful, methodical implementation)  
**Risk:** Low (phased approach with rollback points)

**Next Step:** Begin Phase 1 (Baseline & Safety)


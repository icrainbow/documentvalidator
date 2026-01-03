# PLAN: Unify Case2 with Flow2 System

**Status**: PLAN ONLY - NO IMPLEMENTATION YET  
**Created**: 2026-01-03  
**Scope**: Flow2 + Case2 Integration (Document Page Only)

---

## OVERVIEW

This document details the plan to unify the "CS Integration Exception" (Case2) demo with the existing Flow2 KYC review system. The goal is to:

1. **Remove Case2's dedicated upload widget** and unify all uploads through the existing top-level "Upload Document" control
2. **Implement real LLM-based topic analysis** for Case2 using a new fixed 6-topic list
3. **Add "Accept Recommended Process" UX** that shows recommended stages as a secondary list in Flow Monitor
4. **Rename and branch the "Run Graph KYC Review" button** to route between standard KYC and Case2 demo process review
5. **Add a visible mode indicator** next to the button showing current review mode

**Hard Constraints**:
- Flow1 must remain unaffected
- Existing Flow2 KYC review path must behave identically when Case2 is not triggered
- No new dependencies
- Changes scoped to Flow2/Case2 only
- Do NOT alter the Flow2 monitor main stage index algorithm; Case2 recommended stages must be rendered as a secondary list

---

## A) AS-IS INVENTORY

### 1. Case2 Panel and Upload Widget

**File**: `app/components/case2/Case2ProcessBanner.tsx`

- **Lines 161-230**: "Upload Files (3 required)" section with file input, checklist, and uploaded files list
- **Props**:
  - `uploadedFiles: File[]` (line 26): receives Case2-specific uploaded files
  - `onFileUpload: (files: File[]) => void` (line 28): callback for Case2 file uploads
- **State**: `case2UploadedFiles` in `app/document/page.tsx` (line 657)
- **Handler**: `handleCase2FileUpload` in `app/document/page.tsx` (lines 3746-3781)

**Current Behavior**:
- Case2 has its own separate file upload control
- Files are stored in `case2UploadedFiles` state (separate from `flow2Documents`)
- File validation checks if 3 required documents are covered via filename pattern matching

### 2. Top-Level Upload Document Control

**File**: `app/components/flow2/Flow2UploadPanel.tsx`

- **Props**:
  - `onDocumentsLoaded: (docs: Flow2Document[]) => void` (line 7): callback when documents are loaded
  - `disabled?: boolean` (line 8): optional disable flag
- **Handler**: `handleFileChange` (lines 30-88): reads files as text, validates size/extension, calls `onDocumentsLoaded`
- **State**: `flow2Documents` in `app/document/page.tsx` (line 601)
- **Current Usage**: Only used for Flow2 KYC document uploads

**Current Behavior**:
- Accepts `.txt` and `.md` files (max 5MB each)
- Converts files to `Flow2Document[]` with `doc_id`, `filename`, `doc_type_hint`, `text`
- Stores in `flow2Documents` state

### 3. "Run Graph KYC Review" Button and Handler

**File**: `app/document/page.tsx`

**Button Locations**:
- Line 4502: Main document page button (renders when `isFlow2`)
- Line 4526: Button text: `'🕸️ Run Graph KYC Review'`
- Line 4394: `Flow2RightPanel` component prop `onRunReview={handleGraphKycReview}`

**Handler**: `handleGraphKycReview` (lines 1638-1837)

**Current Behavior**:
1. Validates `flow2Documents` (must have documents uploaded)
2. Calls `/api/orchestrate` with mode `langgraph_kyc`
3. Receives orchestration output with `run_id`, `graph_state`, `risks`, `issues`
4. Calls `callGenericTopicSummariesEndpoint` to get topic summaries
5. Updates Flow Monitor state: `setFlowMonitorStatus`, `setFlowMonitorRunId`, `setFlowMonitorMetadata`
6. Sets `isOrchestrating` to show loading state

**Key State Variables**:
- `isOrchestrating` (line 605): boolean flag for loading state
- `flowMonitorStatus` (line 610): `FlowStatus` ('idle' | 'running' | 'waiting_human' | ...)
- `flowMonitorRunId` (line 611): current run ID
- `flowMonitorMetadata` (line 612): checkpoint metadata with `graph_state`, `decision`, `edd_stage`, etc.

### 4. Topic Summaries System

**API Route**: `app/api/flow2/topic-summaries/route.ts`

**Current Behavior**:
- Accepts `{ run_id, documents, risks }` payload
- Uses `KYC_FLOW2_CONFIG` with 8 fixed topics (lines 18-46 in `app/lib/topicSummaries/configs.ts`)
- Calls `callTopicSummariesEngine` from generic engine
- Returns `{ ok: true, run_id, topic_summaries, model_used, duration_ms }`

**Topics in KYC_FLOW2_CONFIG** (8 topics):
1. Customer Identity & Profile
2. Relationship Purpose
3. Source of Wealth
4. Source of Funds
5. Ownership, UBO & Control
6. Geography & Jurisdiction Risk
7. Sanctions, PEP & Adverse Media
8. Transaction Patterns & Expected Behavior

**UI State**: `flow2TopicSummaries` (line 607 in `app/document/page.tsx`)

**Rendering**: `<Flow2TopicSummaryPanel />` (line 4227 in `app/document/page.tsx`)

### 5. Flow Monitor Panel and Stage Rendering

**File**: `app/components/flow2/Flow2MonitorPanel.tsx`

**Business Stages** (lines 58-65):
1. Document Analysis (icon: 📄)
2. Risk Assessment (icon: ⚠️)
3. Compliance Review (icon: ✓)
4. Human Review (icon: 👤)
5. EDD Review (icon: 🔍) - conditionally shown if `checkpointMetadata?.edd_stage` exists
6. Final Report (icon: 📊)

**Stage Index Logic**: `getCurrentStageIndex` (lines 67-99)
- Maps `FlowStatus` to current stage index
- Handles EDD stage conditional logic
- Returns integer index (0-6)

**Dynamic Stage Filtering** (lines 123-129):
- `shouldShowEddStage`: checks if `checkpointMetadata?.edd_stage` exists
- `visibleStages`: filters `BUSINESS_STAGES` to exclude Stage 5 (EDD Review) if not applicable

**Rendering Loop** (lines 389-488):
- Iterates over `visibleStages` (not `BUSINESS_STAGES`)
- Applies stage colors based on completion status, risk data, demo policy, rejection states
- Renders connecting lines between stages

**Key Props**:
- `runId: string | null` (line 49)
- `initialStatus?: FlowStatus` (line 50)
- `checkpointMetadata?: CheckpointMetadata | null` (line 51)
- `riskData?: RiskData` (line 53)

### 6. Case2 State Management

**File**: `app/document/page.tsx`

**State Variables**:
- `case2State: Case2State` (line 655): `'idle' | 'triggered' | 'tracing' | 'synthesized' | 'accepted' | 'files_ready' | 'started'`
- `case2Data: Case2DemoData | null` (line 656): hardcoded demo data from `CASE2_DEMO_DATA`
- `case2UploadedFiles: File[]` (line 657): files uploaded specifically for Case2 (to be removed)
- `case2Id: string | null` (line 658): unique ID for Case2 instance

**Handlers**:
- `handleCase2Accept` (lines 3735-3744): sets `case2State` to `'accepted'`
- `handleCase2FileUpload` (lines 3746-3781): validates and stores Case2 files, checks if all required docs covered
- `handleCase2Start` (lines 3783-3797): sets `case2State` to `'started'`

**Trigger Detection**: `handleFlow2ChatSubmit` (lines 3641-3713)
- Calls `detectCase2Trigger(input)` from `app/lib/case2/case2Trigger.ts`
- If triggered:
  - Sets `case2State` to `'triggered'`
  - Initializes `case2Data` with `CASE2_DEMO_DATA`
  - Generates `case2Id` with `safeUuid()`
  - Sets `case2State` to `'tracing'` after 200ms
  - Adds assistant messages to chat

### 7. Case2 Demo Data

**File**: `app/lib/case2/demoCase2Data.ts`

**Structure**: `CASE2_DEMO_DATA` (lines 36-122)
- `sources`: 3 sources (PPT, Confluence, Email-PDF) with retrieval timing
- `path_steps`: 4 steps representing recommended approval path
  1. Data Gap Remediation
  2. LOD1 Validation
  3. Joint Steering Committee Review
  4. Group Head Final Approval
- `assistant_text`: multiline explanation of exception path
- `required_documents`: 3 documents required for Case2 upload

### 8. Email and Approval Endpoints

**Stage 1 (Human Review)**:
- Email link builder: `app/lib/flow2/emailService.ts` (constructs `/flow2/approve?run_id=...&token=...`)
- Approval endpoint: `/api/flow2/approvals/submit` (expects `{ run_id, token, action: 'approve'|'reject', comment?, decided_by? }`)

**Stage 2 (EDD Review)**:
- Email link builder: `app/lib/flow2/eddEmailService.ts` (constructs `/flow2/edd/approve?run_id=...&token=...`)
- Approval pages: `app/flow2/edd/approve/page.tsx`, `app/flow2/edd/reject/page.tsx`
- Submission endpoint: `/api/flow2/edd/submit/route.ts` (expects GET request with `run_id`, `token`, `decision`, `comment?`)

**Current Flow**:
- KYC review sends email to human reviewer → `/flow2/approve` → submits to `/api/flow2/approvals/submit`
- If rejected, triggers EDD → sends email → `/flow2/edd/approve` → submits to `/api/flow2/edd/submit`

---

## B) TO-BE DESIGN

### 1. Unified Upload Model

**Single Source of Truth**: `flow2Documents` state
- Remove `case2UploadedFiles` state entirely
- Case2 uses the same `flow2Documents` as KYC review
- Both Case2 and KYC share the same top-level "Upload Document" control

**UI Changes**:
- Remove lines 161-230 from `Case2ProcessBanner.tsx` (entire "Upload Files" section)
- Remove `uploadedFiles` and `onFileUpload` props from `Case2ProcessBanner`
- Remove `handleCase2FileUpload` handler from `app/document/page.tsx`
- User uploads documents via `<Flow2UploadPanel />` before or after triggering Case2

**File Validation for Case2**:
- When user clicks "Accept Recommended Process", check if `flow2Documents.length >= 3`
- If not, show inline error: "Please upload at least 3 documents via the Upload Documents control above."
- If yes, proceed to collapse Case2 panel and show recommended stages

### 2. Case2 Topic Summaries (Real LLM Analysis)

**New Configuration**: Create `CASE2_CS_INTEGRATION_CONFIG` in `app/lib/topicSummaries/configs.ts`

**Proposed 6 Topics**:
1. **`client_profile_legacy_context`**: "Client Profile & Legacy Context"
2. **`jurisdiction_crossborder_constraints`**: "Jurisdiction & Cross-border Constraints"
3. **`risk_appetite_alignment`**: "Risk Appetite Alignment"
4. **`edd_triggers_red_flags`**: "EDD Triggers & Red Flags"
5. **`required_evidence_data_gaps`**: "Required Evidence & Data Gaps"
6. **`recommended_approval_path_governance`**: "Recommended Approval Path & Governance"

**Configuration Structure**:
```typescript
export const CASE2_CS_INTEGRATION_CONFIG: TopicSummaryConfig = {
  template_id: 'case2_cs_integration',
  panel_title: 'CS Integration Exception Analysis',
  panel_subtitle: 'LLM-generated analysis of legacy client integration requirements',
  topic_ids: [
    'client_profile_legacy_context',
    'jurisdiction_crossborder_constraints',
    'risk_appetite_alignment',
    'edd_triggers_red_flags',
    'required_evidence_data_gaps',
    'recommended_approval_path_governance',
  ] as const,
  topic_titles: {
    client_profile_legacy_context: 'Client Profile & Legacy Context',
    jurisdiction_crossborder_constraints: 'Jurisdiction & Cross-border Constraints',
    risk_appetite_alignment: 'Risk Appetite Alignment',
    edd_triggers_red_flags: 'EDD Triggers & Red Flags',
    required_evidence_data_gaps: 'Required Evidence & Data Gaps',
    recommended_approval_path_governance: 'Recommended Approval Path & Governance',
  },
  prompt_role: 'CS integration compliance analyst',
  prompt_instructions: 'Analyze ALL documents below and produce a consolidated summary for EACH of the 6 CS integration exception topics, focusing on legacy client onboarding requirements and risk appetite conflicts.',
  max_bullets: 5,
  max_evidence: 2,
};
```

**New API Route**: Create `/api/case2/topic-summaries/route.ts`
- Mirrors structure of `/api/flow2/topic-summaries/route.ts`
- Uses `CASE2_CS_INTEGRATION_CONFIG` instead of `KYC_FLOW2_CONFIG`
- Accepts `{ case2_id, documents }` payload (no risks needed)
- Returns `{ ok: true, case2_id, topic_summaries, model_used, duration_ms }`

**Client-side State**: Add `case2TopicSummaries: any[]` to `app/document/page.tsx`

**Trigger Timing**: Call `/api/case2/topic-summaries` when:
- User clicks "Accept Recommended Process" button
- `flow2Documents.length >= 3` validation passes
- Show loading indicator while API call is in progress

**UI Rendering**:
- Reuse existing `<Flow2TopicSummaryPanel />` component
- Pass `case2TopicSummaries` when `case2State === 'accepted'` or later
- Panel title becomes "CS Integration Exception Analysis" (from config)
- Panel shows 6 topics instead of 8

### 3. "Accept Recommended Process" UX

**New Button**: Replace "Accept Process" button in `Case2ProcessBanner.tsx` (lines 147-158)

**Button Behavior** (when clicked):
1. **Validation**: Check `flow2Documents.length >= 3`
   - If fails: show inline error, do not proceed
2. **API Call**: Call `/api/case2/topic-summaries` with `case2_id` and `flow2Documents`
   - Show loading state: "Analyzing documents..."
3. **State Update**: On success:
   - Store result in `case2TopicSummaries`
   - Set `case2State` to `'accepted'`
   - Set new boolean flag: `case2ProcessAccepted = true`
4. **UI Update**:
   - Collapse Case2 panel (set `isCollapsed = true` in `Case2ProcessBanner`)
   - Show recommended stages as secondary list in Flow Monitor

**Secondary Stage List Design**:
- New section below main Flow Monitor stages
- Title: "Recommended Review Path (CS Integration Exception)"
- 4 stages derived from `CASE2_DEMO_DATA.path_steps`:
  1. "Data Gap Remediation" (icon: 📋)
  2. "LOD1 Validation" (icon: ✅)
  3. "Joint Steering Committee Review" (icon: 🔍)
  4. "Group Head Final Approval" (icon: ✓)
- All stages initially greyed out (pending)
- No connecting lines (stacked vertically or horizontal with subtle separators)

**State Tracking**: Add `case2RecommendedStageStatuses: string[]` to track stage completion
- Initialize as `['pending', 'pending', 'pending', 'pending']`
- Updated by Case2 demo process review (see section 4 below)

### 4. Rename Button and Branch Behavior

**Button Rename**: "Run Graph KYC Review" → "Run Process Review"

**Mode Indicator**: Add visible text next to button
- Not a tooltip; must be visible by default
- Design: Small badge or inline text above/beside button
- Content:
  - If Case2 NOT triggered or not accepted: `"Mode: Standard KYC Review"`
  - If Case2 accepted: `"Mode: CS Integration Exception Process"`
- Style: Subtle grey text or badge, not too prominent but clearly visible

**Click Handler Branching** (in `handleGraphKycReview` or new wrapper):

**Path A: Case2 NOT triggered** (`case2State === 'idle'` or `case2ProcessAccepted !== true`):
- Run existing `handleGraphKycReview` logic (unchanged)
- Call `/api/orchestrate` with `langgraph_kyc` mode
- Trigger full KYC graph review
- Send emails, create checkpoints, update Flow Monitor main stages

**Path B: Case2 triggered and accepted** (`case2State === 'accepted'` and `case2ProcessAccepted === true`):
- Run new **Case2 demo process review** (client-side only, no backend orchestration)
- Do NOT call `/api/orchestrate`
- Do NOT send emails
- Do NOT create checkpoints
- Auto-pass all 4 recommended stages with animation:
  1. Set `isOrchestrating = true` (show loading state)
  2. Wait 1 second
  3. Set stage 1 status to 'completed' (green)
  4. Wait 1 second
  5. Set stage 2 status to 'completed' (green)
  6. Wait 1 second
  7. Set stage 3 status to 'completed' (green)
  8. Wait 1 second
  9. Set stage 4 status to 'completed' (green)
  10. Set `isOrchestrating = false`
  11. Show "Approved" banner in Case2ProcessBanner
- Update `case2State` to `'started'` (final state)
- No change to main Flow Monitor stages (they remain idle or as-is)

**New Handler**: Create `handleCase2DemoProcessReview` in `app/document/page.tsx`
- Encapsulates Path B logic above
- Uses `setTimeout` for animation delays
- Updates `case2RecommendedStageStatuses` array

**Wrapper Handler**: Rename `handleGraphKycReview` to `handleProcessReview` (or create wrapper)
- Check `case2ProcessAccepted` flag
- If true: call `handleCase2DemoProcessReview`
- If false: call original `handleGraphKycReview` logic

### 5. State Model Changes

**New State Variables** (add to `app/document/page.tsx`):
- `case2ProcessAccepted: boolean` (default: `false`)
  - Set to `true` when "Accept Recommended Process" succeeds
- `case2TopicSummaries: any[]` (default: `[]`)
  - Stores LLM-generated topic summaries for Case2
- `case2RecommendedStageStatuses: ('pending' | 'completed')[]` (default: `['pending', 'pending', 'pending', 'pending']`)
  - Tracks completion status of 4 recommended stages

**Removed State Variables**:
- `case2UploadedFiles: File[]` (no longer needed; use `flow2Documents`)

**Modified Handlers**:
- Remove `handleCase2FileUpload` (no longer needed)
- Modify `handleCase2Accept` → rename to `handleCase2AcceptProcess`
  - Add document validation
  - Add topic summaries API call
  - Set `case2ProcessAccepted = true`

### 6. Backward Compatibility Guarantees

**Flow1**:
- No changes to Flow1 code or UI
- `isFlow2` flag ensures all Case2/Flow2 logic is gated

**Flow2 KYC Review (Case2 NOT triggered)**:
- `handleGraphKycReview` logic remains identical when Case2 not active
- Topic summaries still use `KYC_FLOW2_CONFIG` (8 topics)
- Flow Monitor main stages behave identically
- Orchestration, emails, checkpoints unchanged

**Flow2 Case2 Mode**:
- Only affects UI when `case2State !== 'idle'`
- Main Flow Monitor stages remain idle (no interference)
- Secondary stage list is additive (does not replace main stages)
- Case2 demo process review does not call backend APIs

---

## C) FILE-BY-FILE CHANGE LIST

### 1. `app/lib/topicSummaries/configs.ts`

**Why**: Add new Case2 topic configuration

**Changes**:
- Add `CASE2_CS_INTEGRATION_CONFIG` constant with 6 topics (see section B.2 above)
- Export new config alongside `KYC_FLOW2_CONFIG` and `IT_BULLETIN_CONFIG`

**Edge Cases**:
- Ensure topic IDs are unique and follow naming convention (`snake_case`)
- Ensure `prompt_instructions` is specific enough to guide LLM for CS integration exception context

---

### 2. `app/api/case2/topic-summaries/route.ts` (NEW FILE)

**Why**: Provide API endpoint for Case2 topic summaries

**Changes**:
- Create new API route mirroring structure of `/api/flow2/topic-summaries/route.ts`
- Accept `{ case2_id: string, documents: Flow2Document[] }` payload
- Call `callTopicSummariesEngine` with `CASE2_CS_INTEGRATION_CONFIG`
- Return `{ ok: true, case2_id, topic_summaries, model_used, duration_ms }`
- No risk linking needed (unlike KYC route)

**Edge Cases**:
- Validate `case2_id` is provided
- Validate `documents` array is not empty
- Handle missing `ANTHROPIC_API_KEY` gracefully (fallback response)
- Log request/response for debugging

---

### 3. `app/components/case2/Case2ProcessBanner.tsx`

**Why**: Remove dedicated upload widget, update "Accept Process" button

**Changes**:
- **Remove lines 161-230**: Entire "Upload Files (3 required)" section
- **Remove props**: `uploadedFiles: File[]`, `onFileUpload: (files: File[]) => void`
- **Update "Accept Process" button** (lines 147-158):
  - Change button text to "Accept Recommended Process"
  - Button now triggers validation + API call (logic in parent component)
  - Add loading state when API call is in progress
- **Update state machine**: Remove `'files_ready'` state (no longer needed)
- **Update prop types**: Remove `uploadedFiles` and `onFileUpload` from `Case2ProcessBannerProps`

**Edge Cases**:
- If user clicks "Accept Recommended Process" before uploading documents, show error message
- Error message placement: inline below button, red background, icon: ⚠️
- Error text: "Please upload at least 3 documents using the Upload Documents control at the top of the page."

---

### 4. `app/document/page.tsx`

**Why**: Unify uploads, add Case2 topic summaries, branch button behavior

**Changes** (grouped by section):

#### 4a. State Variables (lines 655-658)
- **Remove**: `case2UploadedFiles` (line 657)
- **Add**: `case2ProcessAccepted: boolean` (default: `false`)
- **Add**: `case2TopicSummaries: any[]` (default: `[]`)
- **Add**: `case2RecommendedStageStatuses: ('pending' | 'completed')[]` (default: `['pending', 'pending', 'pending', 'pending']`)

#### 4b. Remove Handler (lines 3746-3781)
- **Remove**: `handleCase2FileUpload` (no longer needed)

#### 4c. Modify Handler: `handleCase2Accept` → `handleCase2AcceptProcess` (lines 3735-3744)
- **New Logic**:
  1. Validate `flow2Documents.length >= 3`
     - If fails: set error state, return early
  2. Set loading state: `setCase2ProcessLoading(true)`
  3. Call `/api/case2/topic-summaries` with `case2_id` and `flow2Documents`
  4. On success:
     - Store result in `setCase2TopicSummaries`
     - Set `setCase2State('accepted')`
     - Set `setCase2ProcessAccepted(true)`
     - Collapse Case2 panel (via callback or ref)
  5. On error:
     - Show error message in Case2 panel
  6. Finally: `setCase2ProcessLoading(false)`

#### 4d. New Handler: `handleCase2DemoProcessReview` (NEW)
- **Logic**: See section B.4 "Path B" above
- **Key points**:
  - Client-side only (no API calls)
  - Sequential animation with `setTimeout`
  - Updates `case2RecommendedStageStatuses` array
  - Sets `case2State` to `'started'` at end

#### 4e. Modify Handler: `handleGraphKycReview` (lines 1638-1837)
- **Option 1**: Add branching logic at start:
  ```typescript
  if (case2ProcessAccepted) {
    handleCase2DemoProcessReview();
    return;
  }
  // ... existing KYC review logic ...
  ```
- **Option 2**: Rename to `handleProcessReview` and create wrapper
- **Recommended**: Option 1 (less refactoring)

#### 4f. Rendering: Case2ProcessBanner (lines 4178-4187)
- **Remove**: `uploadedFiles={case2UploadedFiles}`
- **Remove**: `onFileUpload={handleCase2FileUpload}`
- **Rename**: `onAccept={handleCase2Accept}` → `onAccept={handleCase2AcceptProcess}`

#### 4g. Rendering: Flow2TopicSummaryPanel (line 4227)
- **Modify condition**: Show Case2 topics when Case2 is active and accepted
  ```typescript
  topicSummaries={
    case2ProcessAccepted 
      ? case2TopicSummaries 
      : (case4Active ? itBulletinTopicSummaries : flow2TopicSummaries)
  }
  ```

#### 4h. Rendering: "Run Process Review" Button (lines 4502-4526)
- **Change button text**: `'🕸️ Run Graph KYC Review'` → `'🕹️ Run Process Review'`
- **Add mode indicator**: Render text/badge above or beside button
  ```typescript
  <div className="text-xs text-slate-500 mb-1">
    {case2ProcessAccepted 
      ? '⚙️ Mode: CS Integration Exception Process' 
      : '⚙️ Mode: Standard KYC Review'}
  </div>
  ```

#### 4i. New Component: Case2RecommendedStagesPanel (NEW, or integrate into Flow2MonitorPanel)
- **Render when**: `case2ProcessAccepted === true`
- **Location**: Below main Flow Monitor or as separate section
- **Content**: 4 stages from `CASE2_DEMO_DATA.path_steps`
- **Styling**: Grey badges, no connecting lines, vertical stack or horizontal row
- **State**: Reads from `case2RecommendedStageStatuses`

**Edge Cases**:
- If user triggers Case2 but doesn't upload documents, "Accept Recommended Process" should block and show error
- If user uploads documents after triggering Case2, validation should pass on next click
- If user clicks "Run Process Review" before accepting Case2 process, it should run standard KYC review
- If user clicks "Run Process Review" after accepting Case2 process, it should run Case2 demo review
- Mode indicator must update reactively when `case2ProcessAccepted` changes

---

### 5. `app/components/flow2/Flow2MonitorPanel.tsx`

**Why**: Optionally integrate Case2 recommended stages as secondary list

**Changes** (OPTION A: Integrate into Flow2MonitorPanel):
- Add new prop: `case2RecommendedStages?: { label: string; status: 'pending' | 'completed' }[]`
- Add new section after main stages (lines 490+):
  ```typescript
  {case2RecommendedStages && case2RecommendedStages.length > 0 && (
    <div className="mt-6 pt-6 border-t border-slate-200">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">
        Recommended Review Path (CS Integration Exception)
      </h4>
      <div className="space-y-2">
        {case2RecommendedStages.map((stage, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              stage.status === 'completed' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {stage.status === 'completed' ? '✓' : idx + 1}
            </div>
            <span className="text-sm text-slate-700">{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  )}
  ```

**Changes** (OPTION B: Separate Component):
- Create new component `Case2RecommendedStagesPanel.tsx` in `app/components/case2/`
- Render below `<Flow2MonitorPanel />` in `app/document/page.tsx`

**Recommended**: Option B (cleaner separation, no risk to existing Flow Monitor logic)

**Edge Cases**:
- Case2 recommended stages should NOT affect `getCurrentStageIndex` logic
- Main stages should remain idle when Case2 demo process runs
- No visual confusion between main stages and Case2 recommended stages (use distinct styling)

---

### 6. `app/components/flow2/Flow2RightPanel.tsx` (OPTIONAL)

**Why**: Update button text if button is rendered here

**Changes**:
- Line 139-150: If button text is hardcoded here, update to "Run Process Review"
- If button text is passed as prop from parent, no changes needed

**Edge Cases**: None

---

### 7. `app/lib/case2/case2Trigger.ts` (NO CHANGES)

**Why**: Trigger detection logic remains unchanged

**Changes**: None

---

### 8. `app/lib/case2/demoCase2Data.ts` (NO CHANGES)

**Why**: Demo data remains unchanged (used for assistant text and recommended stages)

**Changes**: None

---

## D) BACKWARD COMPATIBILITY / RISKS

### 1. Risk: Breaking Flow2 KYC Review When Case2 Not Triggered

**Mitigation**:
- All Case2 logic gated by `case2ProcessAccepted` boolean
- `handleGraphKycReview` checks flag at start, branches only if true
- Existing KYC review path executes identically when flag is false
- No changes to `/api/orchestrate`, checkpoints, or email logic

**Testing**:
- Upload documents in Flow2 mode (without triggering Case2)
- Click "Run Process Review" button
- Verify `/api/orchestrate` is called with `langgraph_kyc` mode
- Verify Flow Monitor shows main stages (1-6)
- Verify emails are sent to human reviewer
- Verify EDD stage appears if rejected

---

### 2. Risk: Breaking Topic Summaries for Case1/KYC

**Mitigation**:
- New `CASE2_CS_INTEGRATION_CONFIG` is separate from `KYC_FLOW2_CONFIG`
- New `/api/case2/topic-summaries` route does not affect `/api/flow2/topic-summaries`
- `flow2TopicSummaries` state remains unchanged for KYC review
- `Flow2TopicSummaryPanel` receives different data source based on `case2ProcessAccepted` flag

**Testing**:
- Run standard KYC review (without triggering Case2)
- Verify left panel shows 8 KYC topics
- Verify topic summaries are LLM-generated from documents
- Run Case2 demo, accept process
- Verify left panel shows 6 Case2 topics
- Verify topic summaries are LLM-generated from same documents but with Case2 prompt

---

### 3. Risk: UI Confusion Between Case2 Demo Review and Real Approval Workflow

**Mitigation**:
- Mode indicator clearly shows "Mode: CS Integration Exception Process" when Case2 active
- Case2 recommended stages rendered as **secondary list** with distinct styling (no connecting lines, vertical stack, lighter colors)
- Main Flow Monitor stages remain idle (grey) during Case2 demo review
- Case2 panel shows "This is a demonstration flow" disclaimer (already exists in final success message)

**Testing**:
- Trigger Case2, accept process, run demo review
- Verify main Flow Monitor stages (1-6) remain idle/grey
- Verify Case2 recommended stages (1-4) animate from pending to completed
- Verify no emails sent, no checkpoints created
- Verify mode indicator shows correct mode

---

### 4. Risk: User Uploads Documents After Triggering Case2 But Before Accepting

**Mitigation**:
- Validation check in `handleCase2AcceptProcess` ensures `flow2Documents.length >= 3`
- If user triggers Case2 first, then uploads documents, validation will pass on next "Accept Recommended Process" click
- User can upload documents at any time (before or after triggering Case2)

**Testing**:
- Trigger Case2 via chat (e.g., "cs integration high-net-worth client")
- Do NOT upload documents yet
- Click "Accept Recommended Process"
- Verify error message: "Please upload at least 3 documents..."
- Upload 3 documents via top-level "Upload Documents" control
- Click "Accept Recommended Process" again
- Verify API call succeeds, topics load, panel collapses

---

### 5. Risk: User Clicks "Run Process Review" Multiple Times

**Mitigation**:
- Use existing `isOrchestrating` flag to disable button during processing
- For Case2 demo review, set `isOrchestrating = true` at start, `false` at end
- Button shows "🔄 Running Review..." when disabled

**Testing**:
- Trigger Case2, accept process, click "Run Process Review"
- Verify button becomes disabled and shows loading text
- Rapidly click button again (should not trigger multiple reviews)
- Verify only one animation sequence runs

---

## E) ACCEPTANCE TESTS

### Manual Checklist

#### Test 1: Case2 NOT Triggered (Standard KYC Review)

**Steps**:
1. Open `/document?flow=2`
2. Upload 3 documents via "Upload Documents" control (do NOT trigger Case2)
3. Verify mode indicator shows "Mode: Standard KYC Review"
4. Click "Run Process Review" button
5. Verify `/api/orchestrate` is called (check network tab)
6. Verify Flow Monitor shows main stages (1-6) with progress
7. Verify topic summaries show 8 KYC topics in left panel
8. Verify email sent to human reviewer (check server logs)
9. Approve via email link
10. Verify Flow Monitor shows completed stages
11. Verify no Case2 UI elements appear

**Expected Result**: ✅ Behaves identically to old "Run Graph KYC Review" flow

---

#### Test 2: Case2 Triggered, Documents Uploaded First

**Steps**:
1. Open `/document?flow=2`
2. Upload 3 documents via "Upload Documents" control
3. Type in chat: "I have a high-net-worth client from a legacy CS portfolio with restricted jurisdiction"
4. Verify Case2 panel appears with thinking trace
5. Wait for trace to complete
6. Verify Case2 panel shows graph + assistant text
7. Verify "Accept Recommended Process" button appears
8. Click "Accept Recommended Process"
9. Verify API call to `/api/case2/topic-summaries` (check network tab)
10. Verify left panel shows 6 Case2 topics
11. Verify Case2 panel collapses
12. Verify Case2 recommended stages (4 stages) appear below Flow Monitor as secondary list
13. Verify mode indicator shows "Mode: CS Integration Exception Process"
14. Click "Run Process Review" button
15. Verify NO API call to `/api/orchestrate`
16. Verify Case2 recommended stages animate from pending to completed (1 second each)
17. Verify main Flow Monitor stages remain idle/grey
18. Verify Case2 panel shows success message

**Expected Result**: ✅ Case2 demo flow completes successfully, no backend APIs called

---

#### Test 3: Case2 Triggered, Documents Uploaded After

**Steps**:
1. Open `/document?flow=2`
2. Type in chat: "ubs risk appetite conflict with cs legacy policy"
3. Verify Case2 panel appears
4. Wait for trace to complete
5. Click "Accept Recommended Process" WITHOUT uploading documents
6. Verify error message: "Please upload at least 3 documents using the Upload Documents control at the top of the page."
7. Upload 3 documents via "Upload Documents" control
8. Click "Accept Recommended Process" again
9. Verify API call succeeds
10. Verify left panel shows 6 Case2 topics
11. Verify Case2 panel collapses
12. Verify Case2 recommended stages appear

**Expected Result**: ✅ Validation works correctly, upload can happen after Case2 trigger

---

#### Test 4: Case2 Recommended Stages Do NOT Interfere with Main Stages

**Steps**:
1. Follow Test 2 steps 1-18
2. Verify main Flow Monitor stages (1-6) remain grey/idle throughout
3. Verify `getCurrentStageIndex` logic is not affected by Case2
4. Verify no connecting lines between main stages (all remain disconnected)

**Expected Result**: ✅ Main stages and Case2 stages are visually and logically separate

---

#### Test 5: Mode Indicator Updates Correctly

**Steps**:
1. Open `/document?flow=2`
2. Verify mode indicator shows "Mode: Standard KYC Review"
3. Trigger Case2 via chat
4. Verify mode indicator still shows "Mode: Standard KYC Review" (not accepted yet)
5. Upload 3 documents
6. Click "Accept Recommended Process"
7. Verify mode indicator updates to "Mode: CS Integration Exception Process"
8. Refresh page (if state persists)
9. Verify mode indicator shows correct mode after refresh

**Expected Result**: ✅ Mode indicator updates reactively and accurately

---

#### Test 6: Case2 Topics Are Real (LLM-Generated)

**Steps**:
1. Follow Test 2 steps 1-10
2. Inspect left panel topic summaries
3. Verify topics are NOT hardcoded (content should vary based on document content)
4. Verify topics follow Case2 prompt instructions (CS integration exception context)
5. Upload different documents and repeat
6. Verify topic summaries change accordingly

**Expected Result**: ✅ Case2 topics are LLM-generated and dynamic

---

#### Test 7: Flow1 Unaffected

**Steps**:
1. Open `/document` (without `?flow=2` parameter)
2. Upload documents
3. Verify no Case2 UI elements appear
4. Verify no Flow2 UI elements appear
5. Verify existing Flow1 behavior unchanged

**Expected Result**: ✅ Flow1 remains unchanged

---

### Optional Automated Tests

#### Unit Tests

**File**: `app/lib/case2/case2Trigger.test.ts` (already exists)
- No changes needed

**File**: `app/lib/topicSummaries/configs.test.ts` (NEW)
- Test `CASE2_CS_INTEGRATION_CONFIG` structure
- Verify 6 topic IDs are unique
- Verify topic titles map correctly

#### Integration Tests

**File**: `app/api/case2/topic-summaries/route.test.ts` (NEW)
- Mock `callTopicSummariesEngine`
- Test successful response with 6 topics
- Test error handling (missing API key, empty documents)

#### E2E Tests (Playwright/Cypress)

**File**: `tests/e2e/case2-unified-upload.spec.ts` (NEW)
- Automate Test 2 (Case2 triggered, documents uploaded first)
- Automate Test 3 (Case2 triggered, documents uploaded after)
- Automate Test 5 (Mode indicator updates correctly)

---

## F) IMPLEMENTATION SEQUENCE (RECOMMENDED)

**Phase 1: Configuration and API** (Low Risk)
1. Add `CASE2_CS_INTEGRATION_CONFIG` to `app/lib/topicSummaries/configs.ts`
2. Create `/api/case2/topic-summaries/route.ts`
3. Test API endpoint with Postman/curl
4. Commit: `feat(case2): add topic summaries config and API endpoint`

**Phase 2: State and Handlers** (Medium Risk)
1. Add new state variables to `app/document/page.tsx`
2. Remove `case2UploadedFiles` state
3. Remove `handleCase2FileUpload` handler
4. Modify `handleCase2Accept` → `handleCase2AcceptProcess` with validation + API call
5. Create `handleCase2DemoProcessReview` handler
6. Test locally (no UI changes yet)
7. Commit: `feat(case2): unify uploads and add demo process review handler`

**Phase 3: UI Changes** (Higher Risk)
1. Remove upload widget from `Case2ProcessBanner.tsx` (lines 161-230)
2. Update props and button text in `Case2ProcessBanner.tsx`
3. Update `<Case2ProcessBanner />` rendering in `app/document/page.tsx`
4. Update `<Flow2TopicSummaryPanel />` rendering to show Case2 topics
5. Test locally (Case2 panel should show without upload widget)
6. Commit: `feat(case2): remove dedicated upload widget, use unified uploads`

**Phase 4: Button and Mode Indicator** (Low Risk)
1. Rename button text to "Run Process Review"
2. Add mode indicator above/beside button
3. Add branching logic to `handleGraphKycReview`
4. Test locally (both KYC and Case2 paths)
5. Commit: `feat(case2): rename button and add mode indicator`

**Phase 5: Recommended Stages Panel** (Medium Risk)
1. Create `Case2RecommendedStagesPanel.tsx` component
2. Render below `<Flow2MonitorPanel />` when `case2ProcessAccepted === true`
3. Wire up `case2RecommendedStageStatuses` state
4. Test locally (stages should animate during demo process review)
5. Commit: `feat(case2): add recommended stages panel`

**Phase 6: Manual Testing and Fixes** (High Priority)
1. Run all acceptance tests (Test 1-7)
2. Fix any bugs or edge cases
3. Verify Flow1 and Flow2 KYC review unaffected
4. Commit: `fix(case2): address edge cases and polish UX`

**Phase 7: Documentation and Merge** (Low Risk)
1. Update README or docs with Case2 usage instructions
2. Add comments to key functions
3. Create PR with all commits
4. Request code review

---

## G) OPEN QUESTIONS (FOR USER DECISION)

1. **Case2 Topic Summaries Panel Title**:
   - Option A: "CS Integration Exception Analysis" (from config)
   - Option B: "Topic Summary" (consistent with KYC)
   - Recommendation: Option A (more descriptive)

2. **Case2 Recommended Stages Layout**:
   - Option A: Vertical stack (4 rows, one per stage)
   - Option B: Horizontal row (4 columns, side by side)
   - Option C: 2x2 grid
   - Recommendation: Option A (easier to read)

3. **Mode Indicator Placement**:
   - Option A: Above button (centered)
   - Option B: Beside button (inline)
   - Option C: Below button (smaller text)
   - Recommendation: Option A (most visible)

4. **Case2 Demo Process Review Animation Speed**:
   - Option A: 1 second per stage (4 seconds total)
   - Option B: 0.5 seconds per stage (2 seconds total)
   - Option C: 2 seconds per stage (8 seconds total)
   - Recommendation: Option A (balanced)

5. **Error Message Placement for "Accept Recommended Process"**:
   - Option A: Inline below button (red background)
   - Option B: Toast notification (top-right)
   - Option C: Modal dialog (blocking)
   - Recommendation: Option A (least intrusive)

---

## H) CONCLUSION

This plan provides a comprehensive roadmap for unifying Case2 with Flow2 while maintaining strict backward compatibility and separation of concerns. Key achievements:

- ✅ Single source of truth for uploads (`flow2Documents`)
- ✅ Real LLM-based topic analysis for Case2 (6 topics)
- ✅ Clear "Accept Recommended Process" UX with validation
- ✅ Renamed button with visible mode indicator
- ✅ Branched behavior: KYC review vs. Case2 demo review
- ✅ Secondary stage list for Case2 (does not interfere with main stages)
- ✅ No breaking changes to Flow1 or Flow2 KYC review
- ✅ No new dependencies
- ✅ Comprehensive acceptance tests

**Next Steps**: Review this plan, approve/reject/modify, then proceed to implementation.

---

**End of Plan Document**


# REVISED PLAN: Unify Case2 with Flow2 (v2.1)

**Status**: PLAN ONLY - READY FOR IMPLEMENTATION  
**Version**: 2.1 (with Errata & Amendments applied)  
**Date**: 2026-01-03  
**Supersedes**: All previous versions

---

## PLAN ERRATA + AMENDMENTS APPLIED

This version incorporates the following critical corrections:

1. ✅ **Clarified "no backend" language**: Accept step DOES call `/api/case2/topic-summaries` (backend + LLM). Only the "Run Process Review" step avoids orchestration/emails/checkpoints.
2. ✅ **Config shape alignment**: CASE2_CS_INTEGRATION_CONFIG uses exact `TopicSummaryConfig` type from `app/lib/topicSummaries/types.ts`.
3. ✅ **Confirmed case2Data.path_steps shape**: Uses actual `Case2PathStep` interface with `id`, `label`, `type`, `detail`, `references`.
4. ✅ **Case2State consistency**: Preserves existing union type; `'files_ready'` state remains but becomes unused.
5. ✅ **Exit mechanism added**: `handleExitCase2Mode` resets Case2 state WITHOUT clearing `flow2Documents` or existing Flow Monitor state.

---

## OVERVIEW

This document details the plan to unify the "CS Integration Exception" (Case2) demo with the existing Flow2 KYC review system. The goal is to:

1. **Remove Case2's dedicated upload widget** and unify all uploads through the existing top-level "Upload Document" control
2. **Implement real LLM-based topic analysis** for Case2 using a new fixed 6-topic list
3. **Add "Accept Recommended Process" UX** that shows recommended stages as a secondary list in Flow Monitor
4. **Rename and branch the "Run Graph KYC Review" button** to route between standard KYC and Case2 demo process review
5. **Add a visible 3-state mode indicator** next to the button showing current review mode
6. **Provide exit mechanism** to return to Standard KYC Review without data loss

**Hard Constraints**:
- Flow1 must remain unaffected
- Existing Flow2 KYC review path must behave identically when Case2 is not triggered
- No new dependencies
- Changes scoped to Flow2/Case2 only
- Do NOT alter the Flow2 monitor main stage index algorithm; Case2 recommended stages must be rendered as a secondary list

---

## A) AS-IS INVENTORY

### 1. Case2 UI Components

**`app/components/case2/Case2ProcessBanner.tsx`** (285 lines)
- **Line 21**: `Case2State` type: `'idle' | 'triggered' | 'tracing' | 'synthesized' | 'accepted' | 'files_ready' | 'started'`
- **Lines 23-31**: Props interface with `uploadedFiles`, `onFileUpload`, `onAccept`, `onStart`, `onTraceComplete`
- **Line 42**: Internal `isCollapsed` state (useState) - **PROBLEM**: owned by child, not parent
- **Lines 161-230**: "Upload Files (3 required)" section - **TO BE REMOVED**
- **Lines 147-158**: "Accept Process" button - **TO BE MODIFIED**
- **Lines 82-87**: `handleFileChange` - **TO BE REMOVED**

**Current Issue**: Collapse state (`isCollapsed`) is managed internally by the component. Parent cannot control or observe collapse state, leading to potential inconsistencies across rerenders or navigation.

---

### 2. Case2 State Management (Parent)

**`app/document/page.tsx`**
- **Line 655**: `case2State: Case2State` - tracks UI progression through Case2 wizard
- **Line 656**: `case2Data: Case2DemoData | null` - hardcoded demo data
- **Line 657**: `case2UploadedFiles: File[]` - **TO BE REMOVED** (separate upload state)
- **Line 658**: `case2Id: string | null` - unique identifier for Case2 instance

**Handlers**:
- **Lines 3641-3713**: `handleFlow2ChatSubmit` - detects Case2 trigger via keyword matching, initializes `case2State = 'triggered'`
- **Lines 3735-3744**: `handleCase2Accept` - sets `case2State = 'accepted'`
- **Lines 3746-3781**: `handleCase2FileUpload` - **TO BE REMOVED**
- **Lines 3783-3797**: `handleCase2Start` - sets `case2State = 'started'`

**Current Issue**: No single source of truth for routing behavior. `case2State` conflates UI progression with routing decisions.

---

### 3. Upload State and Control

**Top-level Upload Control**: `app/components/flow2/Flow2UploadPanel.tsx`
- **Line 7**: `onDocumentsLoaded: (docs: Flow2Document[]) => void` callback
- **Lines 30-88**: `handleFileChange` - reads files, validates, converts to `Flow2Document[]`
- **Accepts**: `.txt` and `.md` files (max 5MB)

**Document State**: `app/document/page.tsx`
- **Line 601**: `flow2Documents: Flow2Document[]` - shared state for Flow2 KYC uploads
- **Line 657**: `case2UploadedFiles: File[]` - **REDUNDANT**, separate state for Case2

**Current Issue**: Dual upload state creates confusion. Case2 uses separate state instead of unified `flow2Documents`.

---

### 4. "Run Graph KYC Review" Button

**Button Location**: `app/document/page.tsx`
- **Line 4502**: Button render with `onClick={isFlow2 ? handleGraphKycReview : handleFullComplianceReview}`
- **Line 4526**: Button text: `'🕸️ Run Graph KYC Review'`

**Handler**: `handleGraphKycReview` (lines 1638-1837)
1. Validates `flow2Documents.length > 0`
2. Calls `/api/orchestrate` with `mode: 'langgraph_kyc'`
3. Receives `run_id`, `graph_state`, `risks`, `issues`
4. Calls topic summaries API with `KYC_FLOW2_CONFIG` (8 topics)
5. Updates Flow Monitor: `setFlowMonitorStatus('running')`, `setFlowMonitorRunId(run_id)`, `setFlowMonitorMetadata(...)`

**Current Issue**: No branching logic. Always runs KYC review. No mode indicator visible.

---

### 5. Topic Summaries System

**API Route**: `app/api/flow2/topic-summaries/route.ts`
- **Lines 50-57**: Calls `callTopicSummariesEngine` with `KYC_FLOW2_CONFIG`
- **Input**: `{ run_id, documents, risks }`
- **Output**: `{ ok: true, run_id, topic_summaries, model_used, duration_ms }`

**Configuration**: `app/lib/topicSummaries/configs.ts`
- **Lines 18-46**: `KYC_FLOW2_CONFIG` with 8 topics

**UI Component**: `app/components/shared/TopicSummariesPanel.tsx`
- **Lines 25-31**: Props interface supports `panelTitle: string` and `panelSubtitle: string` ✅
- Already supports custom titles - no enhancement needed

**Current Rendering**: `app/document/page.tsx` (lines 4224-4230)

**Status**: ✅ TopicSummariesPanel already supports custom title/subtitle. No component changes needed.

---

### 6. Flow Monitor Panel

**`app/components/flow2/Flow2MonitorPanel.tsx`**
- **Lines 58-65**: `BUSINESS_STAGES` array (6 stages)
- **Lines 67-99**: `getCurrentStageIndex(status, eddStage?)` - **MUST NOT BE MODIFIED**
- **Lines 123-129**: Dynamic stage filtering (removes Stage 5 if no EDD)
- **Lines 389-488**: Stage rendering loop with status colors

**Current Behavior**: Shows main workflow stages (1-6) based on `flowMonitorStatus` and `checkpointMetadata`.

**Constraint**: Do NOT modify `getCurrentStageIndex` algorithm. Case2 stages must be additive (secondary list).

---

## B) TO-BE DESIGN

### 1. State Model: Tightening and Separation of Concerns

#### State Variables (all in `app/document/page.tsx`)

| Variable | Type | Purpose | Who Sets It? | Routing Impact? |
|----------|------|---------|--------------|-----------------|
| `case2State` | `Case2State` | **UI-only**: tracks progression through Case2 wizard UI | Handlers (accept, start) | ❌ No |
| `case2ProcessAccepted` | `boolean` | **Routing**: single source of truth for button branching | `handleCase2AcceptProcess` (on success) | ✅ Yes |
| `case2BannerCollapsed` | `boolean` | **UI-only**: controls Case2 banner collapse state | Parent owns, passes to child | ❌ No |
| `case2TopicSummaries` | `GenericTopicSummary[]` | Stores LLM-generated Case2 topics (6 topics) | `handleCase2AcceptProcess` (API response) | ❌ No |
| `case2RecommendedStageStatuses` | `('pending' \| 'completed')[]` | Tracks 4 Case2 demo stages during animation | `handleCase2DemoProcessReview` | ❌ No |
| `case2Id` | `string \| null` | Unique identifier for Case2 instance | `handleFlow2ChatSubmit` (on trigger) | ❌ No |
| `case2Data` | `Case2DemoData \| null` | Hardcoded demo data (sources, path_steps, text) | `handleFlow2ChatSubmit` (on trigger) | ❌ No |

**NEW**: Remove `case2UploadedFiles` (redundant - use `flow2Documents` instead)

**NEW**: Add `case2BannerCollapsed` (parent-owned collapse state)

---

#### State Transition Table

| Event | Before | After | Side Effects |
|-------|--------|-------|--------------|
| **User types Case2 trigger keywords** | `case2State = 'idle'` | `case2State = 'triggered'` → `'tracing'` → `'synthesized'` | Initialize `case2Data`, `case2Id`. Show Case2 banner with thinking trace animation. |
| **User clicks "Accept Recommended Process" (without docs)** | `case2State = 'synthesized'`, `flow2Documents.length = 0` | No change | Show inline error: "Upload at least 3 documents" |
| **User clicks "Accept Recommended Process" (with docs)** | `case2State = 'synthesized'`, `flow2Documents.length >= 3`, `case2ProcessAccepted = false` | `case2State = 'accepted'`, `case2ProcessAccepted = true`, `case2BannerCollapsed = true` | **Call `/api/case2/topic-summaries` (backend + LLM)**, store result in `case2TopicSummaries`. Collapse banner. Show 4 recommended stages (grey/pending). |
| **User clicks "Run Process Review" (Case2 NOT accepted)** | `case2ProcessAccepted = false` | No Case2 state change. `flowMonitorStatus = 'running'` | Execute standard KYC review: call `/api/orchestrate`, send emails, create checkpoint. Update main Flow Monitor stages. |
| **User clicks "Run Process Review" (Case2 accepted)** | `case2ProcessAccepted = true`, `case2State = 'accepted'` | `case2State = 'started'`, `case2RecommendedStageStatuses = ['completed', 'completed', 'completed', 'completed']` | **Execute Case2 demo review (client-side only): NO `/api/orchestrate`, NO emails, NO checkpoints**. Animate 4 stages sequentially (1s each). Main Flow Monitor remains idle. |
| **[DEPRECATED] User uploads files to Case2 widget** | `case2State = 'accepted'` | `case2State = 'files_ready'` | **NOT USED after unification. State skips directly from 'accepted' to 'started' when demo review runs.** The `'files_ready'` value remains in the Case2State union type for backward compatibility but is never set. |
| **User clicks "Exit Case2" button** | `case2ProcessAccepted = true`, `case2State = any non-'idle'` | `case2State = 'idle'`, `case2ProcessAccepted = false`, all Case2 UI state reset | Reset ONLY Case2-specific state. **DO NOT clear `flow2Documents`**. DO NOT alter `flowMonitorStatus` if KYC review already ran. User can now run standard KYC review. |

---

#### 3-State Mode Indicator

**Location**: Above or beside "Run Process Review" button

**State Logic** (evaluated reactively):

```typescript
IF case2ProcessAccepted === true:
  → "⚙️ Mode: CS Integration Exception Process"
  
ELSE IF case2State !== 'idle' AND case2State !== 'started':
  → "⚠️ Mode: Case2 Triggered (Pending Acceptance)"
  
ELSE:
  → "⚙️ Mode: Standard KYC Review"
```

**Visual Design**:
- **Standard**: Grey text, regular weight
- **Triggered (Pending)**: Orange/amber badge, italic
- **Active (Accepted)**: Blue badge, bold

**Driving State**: Primary driver is `case2ProcessAccepted`. Secondary hint from `case2State` for "pending acceptance" state.

---

### 2. Collapse Behavior Specification

**Problem (Current)**: `isCollapsed` state is internal to `Case2ProcessBanner.tsx`. Parent cannot control collapse timing or persist collapse state across rerenders.

**Solution**: Parent (`app/document/page.tsx`) owns collapse state.

**Implementation**:
1. Add state variable: `const [case2BannerCollapsed, setCase2BannerCollapsed] = useState(false)`
2. Pass to child: `<Case2ProcessBanner collapsed={case2BannerCollapsed} onToggleCollapse={() => setCase2BannerCollapsed(!case2BannerCollapsed)} />`
3. Auto-collapse on accept: In `handleCase2AcceptProcess`, set `setCase2BannerCollapsed(true)` after successful API call
4. User can manually toggle: Click chevron icon calls `onToggleCollapse` callback

**Benefits**:
- Parent can programmatically collapse banner (e.g., on accept)
- Collapse state persists across rerenders (parent state survives)
- Parent can observe/react to collapse state if needed

---

### 3. Topic Summaries: Case2 Integration

**Status**: ✅ `TopicSummariesPanel` already supports custom `panelTitle` and `panelSubtitle` props. No component changes needed.

**New Configuration**: `app/lib/topicSummaries/configs.ts`

Add `CASE2_CS_INTEGRATION_CONFIG` (exact type-compliant version):

```typescript
export const CASE2_CS_INTEGRATION_CONFIG: TopicSummaryConfig = {
  template_id: 'case2_cs_integration',
  panel_title: 'CS Integration Exception Analysis',
  panel_subtitle: 'AI-generated analysis of legacy client integration and risk appetite conflicts',
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
  prompt_instructions: 'Analyze ALL documents and produce a consolidated summary for EACH of the 6 CS integration exception topics. Focus on: legacy CS onboarding requirements, UBS vs CS risk appetite conflicts, restricted jurisdiction implications, escalation paths, and required governance approvals.',
  max_bullets: 5,
  max_evidence: 2,
};
```

**New API Route**: `app/api/case2/topic-summaries/route.ts`
- Mirror structure of `/api/flow2/topic-summaries/route.ts`
- Accept `{ case2_id: string, documents: Flow2Document[] }`
- Call `callTopicSummariesEngine` with `CASE2_CS_INTEGRATION_CONFIG`
- Return `{ ok: true, case2_id, topic_summaries, model_used, duration_ms }`
- No risk linking (unlike KYC route)

**UI Rendering**: Modify `app/document/page.tsx` (lines 4224-4230)

```typescript
<TopicSummariesPanel
  panelTitle={
    case2ProcessAccepted 
      ? CASE2_CS_INTEGRATION_CONFIG.panel_title 
      : (case4Active ? IT_BULLETIN_CONFIG.panel_title : KYC_FLOW2_CONFIG.panel_title)
  }
  panelSubtitle={
    case2ProcessAccepted 
      ? CASE2_CS_INTEGRATION_CONFIG.panel_subtitle 
      : (case4Active ? IT_BULLETIN_CONFIG.panel_subtitle : KYC_FLOW2_CONFIG.panel_subtitle)
  }
  topicSummaries={
    case2ProcessAccepted 
      ? case2TopicSummaries 
      : (case4Active ? itBulletinTopicSummaries : flow2TopicSummaries)
  }
  isLoading={
    case2ProcessAccepted 
      ? isLoadingCase2TopicSummaries 
      : (case4Active ? isLoadingItTopicSummaries : isLoadingTopicSummaries)
  }
  documents={flow2Documents}
/>
```

**Backward Compatibility**: When `case2ProcessAccepted = false`, rendering logic falls through to existing KYC/IT logic. Zero impact on existing flows.

---

### 4. Demo UX Clarity

**Secondary Stages Panel Design**

**Component**: New file `app/components/case2/Case2RecommendedStagesPanel.tsx`

**Props**:
```typescript
interface Case2RecommendedStagesPanelProps {
  stages: { 
    id: string;
    label: string; 
    status: 'pending' | 'completed';
    detail?: string; // Optional: for tooltip or expanded view
  }[];
  visible: boolean; // Show only when case2ProcessAccepted = true
}
```

**Content** (4 stages from `CASE2_DEMO_DATA.path_steps`):
1. Data Gap Remediation
2. LOD1 Validation
3. Joint Steering Committee Review
4. Group Head Final Approval

**Microcopy** (EXACT TEXT - CRITICAL): 
- Title: "Recommended Review Path (CS Integration Exception)"
- Subtitle/badge: **"⚠️ Demo path (no orchestration / no emails / no checkpoints)"**
- Style: Italic, smaller font, amber/orange color

**UI Structure**:
```
┌─────────────────────────────────────────────────────────┐
│ 📋 Recommended Review Path (CS Integration Exception)  │
│                                                         │
│ ⚠️ Demo path (no orchestration / no emails / no       │
│    checkpoints)                                         │
│                                                         │
│  ⬜ 1. Data Gap Remediation           [pending/grey]   │
│  ⬜ 2. LOD1 Validation                [pending/grey]   │
│  ⬜ 3. Joint Steering Committee       [pending/grey]   │
│  ⬜ 4. Group Head Final Approval      [pending/grey]   │
│                                                         │
│  → Statuses update when "Run Process Review" is        │
│     clicked (animate 1→2→3→4 to green)                 │
└─────────────────────────────────────────────────────────┘
```

**Placement**: Render in `app/document/page.tsx` BELOW `<Flow2MonitorPanel />` when `case2ProcessAccepted === true`.

**Main Flow Monitor Guarantee**: During Case2 demo review, main Flow Monitor stages (1-6) remain grey/idle. `getCurrentStageIndex` is never called with Case2-specific data. No interference.

---

## C) UI BEHAVIOR SPEC: Step-by-Step User Journey

### Journey 1: Case2 Triggered → Accepted → Demo Review Completed

**Step 1: User uploads documents**
- User visits `/document?flow=2`
- Clicks "Upload Documents" control (top of page)
- Selects 3+ `.txt` or `.md` files
- Files stored in `flow2Documents` state
- UI shows document count/list

**Step 2: User triggers Case2 via chat**
- User types: "I have a high-net-worth client from legacy CS with restricted jurisdiction"
- System detects Case2 trigger (keyword matching in `handleFlow2ChatSubmit`)
- State: `case2State = 'triggered'` → `'tracing'` → `'synthesized'`
- UI shows: Case2 banner with thinking trace animation (3 sources retrieved)
- After trace: Shows suggested path graph + assistant text
- Mode indicator: "⚠️ Mode: Case2 Triggered (Pending Acceptance)" (orange)

**Step 3: User accepts recommended process**
- User clicks "Accept Recommended Process" button
- System validates: `flow2Documents.length >= 3` ✓
- System calls: `POST /api/case2/topic-summaries` with `case2_id` and `flow2Documents` **(backend + LLM call)**
- Loading state: Button shows "🔄 Analyzing documents..."
- On success:
  - State: `case2ProcessAccepted = true`, `case2State = 'accepted'`, `case2BannerCollapsed = true`
  - Store: `case2TopicSummaries` (6 topics from API)
  - UI updates:
    - Left panel: Shows 6 Case2 topics with title "CS Integration Exception Analysis"
    - Case2 banner: Collapses automatically
    - Mode indicator: "⚙️ Mode: CS Integration Exception Process" (blue)
    - Secondary stages panel: Appears below Flow Monitor showing 4 grey stages
    - Button text: "Run Process Review" (renamed from "Run Graph KYC Review")

**Step 4: User runs Case2 demo process review**
- User clicks "Run Process Review" button
- System checks: `case2ProcessAccepted === true` → branches to Case2 demo handler

**IMPORTANT - Clarification on "no backend":**
> Note: The Accept step (Step 3 above) DID call `/api/case2/topic-summaries` for LLM topic analysis (backend call). The following restrictions apply ONLY to the "Run Process Review" step:

- **NO API calls to `/api/orchestrate`**
- **NO emails sent**
- **NO checkpoint created**
- Client-side animation only:
  - Button shows: "🔄 Running Review..." (disabled)
  - Wait 1 second → Stage 1 turns green
  - Wait 1 second → Stage 2 turns green
  - Wait 1 second → Stage 3 turns green
  - Wait 1 second → Stage 4 turns green
  - State: `case2State = 'started'`
  - Button re-enables
- UI shows: Success message in Case2 banner (expand to show)
- Main Flow Monitor: Remains grey/idle throughout (no stages activated)

**Step 5: User reviews results**
- Left panel: 6 Case2 topics show AI-generated content
- Secondary stages panel: All 4 stages green (completed)
- Main Flow Monitor: Still grey (no KYC review was run)
- Case2 banner: Shows success message with disclaimer

---

### Journey 2: Case2 NOT Triggered → Standard KYC Review (Unchanged)

**Step 1: User uploads documents**
- Same as Journey 1, Step 1

**Step 2: User does NOT trigger Case2**
- User does NOT type Case2 keywords
- State: `case2State = 'idle'`, `case2ProcessAccepted = false`
- UI: No Case2 banner shown
- Mode indicator: "⚙️ Mode: Standard KYC Review" (grey)

**Step 3: User runs standard KYC review**
- User clicks "Run Process Review" button
- System checks: `case2ProcessAccepted === false` → branches to standard KYC handler
- Calls: `POST /api/orchestrate` with `mode: 'langgraph_kyc'`
- Calls: Topic summaries API with `KYC_FLOW2_CONFIG` (8 topics)
- Sends: Email to human reviewer
- Creates: Checkpoint with `run_id`
- UI updates:
  - Left panel: Shows 8 KYC topics
  - Main Flow Monitor: Stages 1-3 active, then pauses at Stage 4 (Human Review)
  - No Case2 UI elements appear

**Expected Result**: ✅ Identical to existing Flow2 KYC review behavior

---

### Journey 3: Case2 Triggered But User Uploads Documents After (Validation)

**Step 1: User triggers Case2 without documents**
- User visits `/document?flow=2` (no documents yet)
- User types Case2 trigger keywords
- State: `case2State = 'synthesized'`
- UI: Case2 banner shows with "Accept Recommended Process" button
- Mode indicator: "⚠️ Mode: Case2 Triggered (Pending Acceptance)" (orange)

**Step 2: User tries to accept without documents**
- User clicks "Accept Recommended Process" button
- System validates: `flow2Documents.length >= 3` ✗
- UI shows inline error: "⚠️ Please upload at least 3 documents using the Upload Documents control at the top of the page."
- No state change, no API call

**Step 3: User uploads documents**
- User clicks "Upload Documents" control
- Selects 3+ files
- Files stored in `flow2Documents`

**Step 4: User accepts (now valid)**
- User clicks "Accept Recommended Process" button again
- System validates: `flow2Documents.length >= 3` ✓
- Proceeds with Journey 1, Step 3

---

### Journey 4: Exit Case2 and Return to Standard KYC Review

**Step 1: User is in Case2 Active mode**
- Case2 triggered, accepted, secondary stages shown
- State: `case2ProcessAccepted = true`, `case2State = 'accepted'` or `'started'`
- Mode indicator: "⚙️ Mode: CS Integration Exception Process" (blue)
- Left panel: 6 Case2 topics
- Documents: 3+ files in `flow2Documents`

**Step 2: User clicks "Exit Case2" button**
- Button location: Near mode indicator, text: "← Exit Case2 / Switch to Standard Review"
- System calls: `handleExitCase2Mode()`
- State changes:
  - `case2ProcessAccepted = false`
  - `case2State = 'idle'`
  - `case2BannerCollapsed = false`
  - `case2TopicSummaries = []`
  - `case2RecommendedStageStatuses = ['pending', 'pending', 'pending', 'pending']`
  - `case2Data = null`
  - `case2Id = null`

**CRITICAL - What is NOT reset**:
- `flow2Documents` **remains unchanged** (uploaded files preserved)
- `flowMonitorStatus` **remains unchanged** (if KYC review already ran, state preserved)
- `flowMonitorRunId` **remains unchanged**
- `flowMonitorMetadata` **remains unchanged**

**Step 3: UI updates**
- Case2 banner: Disappears (state = 'idle')
- Secondary stages panel: Disappears
- Mode indicator: "⚙️ Mode: Standard KYC Review" (grey)
- Left panel: Reverts to empty or shows existing KYC topics (if review already ran)
- Uploaded documents: Still visible in documents list

**Step 4: User can now run standard KYC review**
- User clicks "Run Process Review" button
- System checks: `case2ProcessAccepted === false` → branches to standard KYC handler
- Executes normal Flow2 KYC review with existing documents

**Expected Result**: ✅ Clean exit from Case2 mode, no data loss, can run standard KYC review

---

## D) TOPIC SUMMARIES: Integration Without Breaking Existing Flows

### Pipeline Architecture (No Changes Needed)

**Generic Engine**: `app/lib/topicSummaries/engine.ts`
- `callTopicSummariesEngine(config, documents, apiKey)` - already supports any config
- Works with KYC (8 topics), IT (5 topics), or **Case2 (6 topics)** with zero code changes

**Existing Configs**: `app/lib/topicSummaries/configs.ts`
- `KYC_FLOW2_CONFIG` (8 topics) - **UNCHANGED**
- `IT_BULLETIN_CONFIG` (5 topics) - **UNCHANGED**

**New Config**: Add `CASE2_CS_INTEGRATION_CONFIG` (6 topics) - **ADDITIVE**

### API Route Strategy

**Existing Route**: `/api/flow2/topic-summaries`
- Uses `KYC_FLOW2_CONFIG`
- Used by standard Flow2 KYC review
- **NO CHANGES**

**New Route**: `/api/case2/topic-summaries` (new file)
- Uses `CASE2_CS_INTEGRATION_CONFIG`
- Called only when Case2 is accepted
- Mirrors structure of Flow2 route (code duplication intentional for isolation)

**Isolation Guarantee**: Two separate API routes, two separate configs, two separate state variables (`flow2TopicSummaries` vs `case2TopicSummaries`). Zero risk of cross-contamination.

### UI Component Reuse

**Component**: `app/components/shared/TopicSummariesPanel.tsx`
- Already supports `panelTitle` and `panelSubtitle` props ✅
- Renders any number of topics (generic loop)
- **NO CHANGES NEEDED**

**Rendering Logic**: `app/document/page.tsx` (lines 4224-4230)
- Add conditional: If `case2ProcessAccepted`, use Case2 title/subtitle/summaries
- Else if `case4Active`, use IT title/subtitle/summaries
- Else, use KYC title/subtitle/summaries
- **Backward Compatible**: Existing logic preserved when Case2 not active

### Rollback Safety

If Case2 causes issues, disable by:
1. Comment out Case2 trigger detection in `handleFlow2ChatSubmit`
2. Result: `case2State` always stays `'idle'`, `case2ProcessAccepted` always stays `false`
3. All Case2 UI hidden, all branching logic falls through to standard KYC path
4. Zero impact on existing flows

---

## E) FILE-BY-FILE CHANGE LIST (PLAN ONLY)

### 1. `app/lib/topicSummaries/configs.ts`

**Why**: Add Case2 topic configuration

**Changes**:
- Add `CASE2_CS_INTEGRATION_CONFIG` constant (exact TopicSummaryConfig type - see Section B.3)
- Export alongside existing `KYC_FLOW2_CONFIG` and `IT_BULLETIN_CONFIG`

**Lines**: Append after line 75 (after IT_BULLETIN_CONFIG)

**Risk**: Low (additive only)

---

### 2. `app/api/case2/topic-summaries/route.ts` (NEW FILE)

**Why**: Provide dedicated API endpoint for Case2 topics

**Structure**: Mirror `/api/flow2/topic-summaries/route.ts`

**Request Schema**:
```typescript
{ case2_id: string, documents: Flow2Document[] }
```

**Response Schema**:
```typescript
{ ok: true, case2_id: string, topic_summaries: GenericTopicSummary[], model_used: string, duration_ms: number }
```

**Logic**:
1. Validate request body
2. Check `ANTHROPIC_API_KEY`
3. Call `callTopicSummariesEngine(CASE2_CS_INTEGRATION_CONFIG, documents, apiKey)`
4. Return success response with 6 topics

**Risk**: Low (isolated endpoint, no shared state)

---

### 3. `app/components/case2/Case2ProcessBanner.tsx`

**Why**: Remove upload widget, externalize collapse state

**Changes**:
1. **Remove lines 161-230**: Entire "Upload Files (3 required)" section
2. **Remove props**: `uploadedFiles: File[]`, `onFileUpload: (files: File[]) => void`
3. **Modify props**: 
   - Add `collapsed: boolean`
   - Add `onToggleCollapse: () => void`
   - Add `isAcceptLoading?: boolean`
4. **Remove state**: Delete `const [isCollapsed, setIsCollapsed] = useState(false)` (line 42)
5. **Modify collapse logic**: 
   - Use `props.collapsed` instead of `isCollapsed`
   - Call `props.onToggleCollapse()` instead of `setIsCollapsed(...)`
6. **Update button**:
   - Change text: "Accept Process" → "Accept Recommended Process"
   - Show loading state when `isAcceptLoading` is true

**Lines Affected**: 23-31 (props), 42 (state), 94 (collapse toggle), 147-158 (button), 161-230 (upload section)

**Risk**: Medium (UI changes, but Case2 is demo-only feature)

---

### 4. `app/components/case2/Case2RecommendedStagesPanel.tsx` (NEW FILE)

**Why**: Render secondary stages list for Case2 demo path

**Props** (using real Case2PathStep shape):
```typescript
interface Case2RecommendedStagesPanelProps {
  stages: { 
    id: string;
    label: string; 
    status: 'pending' | 'completed';
    detail?: string; // Optional: for tooltip or expanded view
  }[];
  visible: boolean;
}
```

**Structure**:
- Title: "Recommended Review Path (CS Integration Exception)"
- **Microcopy badge (EXACT TEXT)**: **"⚠️ Demo path (no orchestration / no emails / no checkpoints)"**
- 4 stages in vertical list (no connecting lines)
- Grey badges for 'pending', green badges for 'completed'

**Risk**: Low (new isolated component)

---

### 5. `app/document/page.tsx` (MAJOR CHANGES)

**Why**: Unified uploads, state management, button branching, topic rendering, exit mechanism

#### 5a. State Variables (near line 655)

**Add**:
```typescript
const [case2ProcessAccepted, setCase2ProcessAccepted] = useState<boolean>(false);
const [case2BannerCollapsed, setCase2BannerCollapsed] = useState<boolean>(false);
const [case2TopicSummaries, setCase2TopicSummaries] = useState<GenericTopicSummary[]>([]);
const [case2RecommendedStageStatuses, setCase2RecommendedStageStatuses] = useState<('pending' | 'completed')[]>(
  ['pending', 'pending', 'pending', 'pending']
);
const [isLoadingCase2TopicSummaries, setIsLoadingCase2TopicSummaries] = useState<boolean>(false);
```

**Remove**:
```typescript
const [case2UploadedFiles, setCase2UploadedFiles] = useState<File[]>([]); // DELETE
```

**Risk**: Low (state additions, one removal)

#### 5b. Remove Handler: `handleCase2FileUpload` (lines 3746-3781)

**Why**: No longer needed (unified uploads via `flow2Documents`)

**Action**: Delete entire function

**Risk**: Low (unused after upload widget removal)

#### 5c. Modify Handler: `handleCase2Accept` → `handleCase2AcceptProcess` (lines 3735-3744)

**New Logic**:
1. Validate `flow2Documents.length >= 3`
   - If fails: Show error in Case2 banner, return early
2. Set `setIsLoadingCase2TopicSummaries(true)`
3. Call `POST /api/case2/topic-summaries` with `{ case2_id, documents: flow2Documents }`
4. On success:
   - Store: `setCase2TopicSummaries(response.topic_summaries)`
   - Update state: `setCase2State('accepted')`, `setCase2ProcessAccepted(true)`
   - Collapse banner: `setCase2BannerCollapsed(true)`
5. On error: Show error in Case2 banner
6. Finally: `setIsLoadingCase2TopicSummaries(false)`

**Risk**: Medium (critical path for Case2 acceptance)

#### 5d. New Handler: `handleCase2DemoProcessReview`

**Logic**:
```typescript
const handleCase2DemoProcessReview = async () => {
  setIsOrchestrating(true);
  
  // Animate stages sequentially (no orchestration / no emails / no checkpoints)
  await sleep(1000);
  setCase2RecommendedStageStatuses(['completed', 'pending', 'pending', 'pending']);
  
  await sleep(1000);
  setCase2RecommendedStageStatuses(['completed', 'completed', 'pending', 'pending']);
  
  await sleep(1000);
  setCase2RecommendedStageStatuses(['completed', 'completed', 'completed', 'pending']);
  
  await sleep(1000);
  setCase2RecommendedStageStatuses(['completed', 'completed', 'completed', 'completed']);
  
  setCase2State('started');
  setIsOrchestrating(false);
};
```

**Risk**: Low (client-side only, no backend impact)

#### 5e. Modify Handler: `handleGraphKycReview` (lines 1638-1837)

**Add branching at start**:
```typescript
const handleGraphKycReview = async () => {
  // Branch: Case2 demo review
  if (case2ProcessAccepted) {
    handleCase2DemoProcessReview();
    return;
  }
  
  // Existing KYC review logic (unchanged)
  if (!isFlow2) {
    console.warn('[Flow2] handleGraphKycReview called but not in Flow2 mode');
    return;
  }
  // ... rest of existing logic ...
};
```

**Risk**: Low (early return preserves existing logic)

#### 5f. Rendering: Case2ProcessBanner (lines 4178-4187)

**Modify**:
```typescript
{isFlow2 && case2State !== 'idle' && case2Data && (
  <Case2ProcessBanner
    state={case2State}
    data={case2Data}
    collapsed={case2BannerCollapsed}
    onToggleCollapse={() => setCase2BannerCollapsed(!case2BannerCollapsed)}
    onAccept={handleCase2AcceptProcess}
    isAcceptLoading={isLoadingCase2TopicSummaries}
    onStart={handleCase2Start}
    onTraceComplete={() => setCase2State('synthesized')}
  />
)}
```

**Changes**: Remove `uploadedFiles`, `onFileUpload`. Add `collapsed`, `onToggleCollapse`, `isAcceptLoading`.

**Risk**: Low (prop changes)

#### 5g. Rendering: TopicSummariesPanel (lines 4224-4230)

**Modify**:
```typescript
<TopicSummariesPanel
  panelTitle={
    case2ProcessAccepted 
      ? CASE2_CS_INTEGRATION_CONFIG.panel_title 
      : (case4Active ? IT_BULLETIN_CONFIG.panel_title : KYC_FLOW2_CONFIG.panel_title)
  }
  panelSubtitle={
    case2ProcessAccepted 
      ? CASE2_CS_INTEGRATION_CONFIG.panel_subtitle 
      : (case4Active ? IT_BULLETIN_CONFIG.panel_subtitle : KYC_FLOW2_CONFIG.panel_subtitle)
  }
  topicSummaries={
    case2ProcessAccepted 
      ? case2TopicSummaries 
      : (case4Active ? itBulletinTopicSummaries : flow2TopicSummaries)
  }
  isLoading={
    case2ProcessAccepted 
      ? isLoadingCase2TopicSummaries 
      : (case4Active ? isLoadingItTopicSummaries : isLoadingTopicSummaries)
  }
  documents={flow2Documents}
/>
```

**Risk**: Low (conditional props, backward compatible)

#### 5h. Rendering: 3-State Mode Indicator (new, near line 4502)

**Add before button**:
```typescript
{isFlow2 && (
  <div className="mb-2 text-center">
    {case2ProcessAccepted ? (
      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
        ⚙️ Mode: CS Integration Exception Process
      </span>
    ) : case2State !== 'idle' && case2State !== 'started' ? (
      <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold italic">
        ⚠️ Mode: Case2 Triggered (Pending Acceptance)
      </span>
    ) : (
      <span className="text-xs text-slate-500">
        ⚙️ Mode: Standard KYC Review
      </span>
    )}
  </div>
)}
```

**Risk**: Low (additive UI)

#### 5i. Rendering: Button Text (line 4526)

**Modify**:
```typescript
{isOrchestrating ? '🔄 Running Review...' : isFlow2 ? '🕹️ Run Process Review' : '🔍 Run Full Review'}
```

**Change**: `'🕸️ Run Graph KYC Review'` → `'🕹️ Run Process Review'`

**Risk**: Low (text only)

#### 5j. Rendering: Case2RecommendedStagesPanel (new, after Flow2MonitorPanel)

**Add after Flow2RightPanel** (using real Case2PathStep shape):
```typescript
{isFlow2 && case2ProcessAccepted && case2Data && (
  <Case2RecommendedStagesPanel
    stages={case2Data.path_steps.map((step, idx) => ({
      id: step.id,
      label: step.label,
      status: case2RecommendedStageStatuses[idx],
      detail: step.detail, // Optional: can be shown in tooltip
    }))}
    visible={true}
  />
)}
```

**Risk**: Low (conditional render, new component)

#### 5k. New Handler: `handleExitCase2Mode`

**Logic**:
```typescript
const handleExitCase2Mode = () => {
  // Reset Case2-specific state (routing + UI)
  setCase2ProcessAccepted(false);
  setCase2State('idle');
  setCase2BannerCollapsed(false);
  setCase2TopicSummaries([]);
  setCase2RecommendedStageStatuses(['pending', 'pending', 'pending', 'pending']);
  setCase2Data(null);
  setCase2Id(null);
  
  // DO NOT reset flow2Documents (preserve uploaded files)
  // DO NOT reset flowMonitorStatus (preserve any existing KYC review state)
  
  console.log('[Case2] Exited Case2 mode, returning to Standard KYC Review');
};
```

**Risk**: Low (state reset only, no backend calls)

#### 5l. Rendering: Exit Case2 Button (new, near mode indicator)

**Add below mode indicator**:
```typescript
{isFlow2 && (case2State !== 'idle' || case2ProcessAccepted) && (
  <button
    onClick={handleExitCase2Mode}
    className="text-xs text-slate-500 hover:text-slate-700 underline mb-2"
  >
    ← Exit Case2 / Switch to Standard Review
  </button>
)}
```

**Placement**: Below mode indicator, above "Run Process Review" button.

**Risk**: Low (additive UI control)

---

### 6. `app/components/shared/TopicSummariesPanel.tsx`

**Why**: Check if changes needed

**Conclusion**: ✅ **NO CHANGES NEEDED**. Component already supports `panelTitle` and `panelSubtitle` props.

**Risk**: None (no changes)

---

### 7. `app/components/flow2/Flow2MonitorPanel.tsx`

**Why**: Check if changes needed

**Conclusion**: ✅ **NO CHANGES NEEDED**. Case2 stages rendered separately. `getCurrentStageIndex` not modified.

**Risk**: None (no changes)

---

## F) RISKS & ROLLBACK

### Risk 1: Breaking Flow2 KYC Review When Case2 Not Active

**Likelihood**: Low

**Mitigation**:
- All Case2 logic gated by `case2ProcessAccepted` boolean
- Early return in `handleGraphKycReview` preserves existing logic
- No changes to `/api/orchestrate`, checkpoints, email logic

**Validation**:
1. Do NOT trigger Case2
2. Upload documents
3. Click "Run Process Review"
4. Verify `/api/orchestrate` called (network tab)
5. Verify 8 KYC topics shown
6. Verify email sent
7. Verify main Flow Monitor stages animate

**Rollback**: Comment out Case2 trigger detection → `case2ProcessAccepted` always false → no branching

---

### Risk 2: Case2 Topics Break KYC Topics

**Likelihood**: Very Low

**Mitigation**:
- Separate API routes: `/api/case2/topic-summaries` vs `/api/flow2/topic-summaries`
- Separate configs: `CASE2_CS_INTEGRATION_CONFIG` vs `KYC_FLOW2_CONFIG`
- Separate state: `case2TopicSummaries` vs `flow2TopicSummaries`
- Conditional rendering based on `case2ProcessAccepted`

**Validation**:
1. Run standard KYC review
2. Verify left panel shows 8 topics with "Topic Summary" title
3. Verify topics are LLM-generated from KYC config
4. Run Case2 demo
5. Verify left panel shows 6 topics with "CS Integration Exception Analysis" title

**Rollback**: Remove `case2ProcessAccepted` condition from TopicSummariesPanel rendering → always uses KYC topics

---

### Risk 3: Collapse State Loss on Rerender

**Likelihood**: Low (after fix)

**Mitigation**:
- Parent (`app/document/page.tsx`) owns `case2BannerCollapsed` state
- State survives rerenders (not recreated)
- Passed as prop to child component

**Validation**:
1. Trigger Case2, accept process
2. Verify banner auto-collapses
3. Manually expand banner (click chevron)
4. Trigger a rerender (e.g., upload another document)
5. Verify banner stays expanded (state persisted)

**Rollback**: N/A (bug fix, no rollback needed)

---

### Risk 4: Mode Indicator Incorrect State

**Likelihood**: Low

**Mitigation**:
- Simple boolean logic (3 states)
- Primary driver: `case2ProcessAccepted` (single source of truth)
- Secondary hint: `case2State` (for pending state)

**Validation**: See Acceptance Test #5 (3-state validation)

**Rollback**: Remove mode indicator (UI-only, no functional impact)

---

### Risk 5: Case2 Demo Review Interferes with Main Flow Monitor

**Likelihood**: Very Low

**Mitigation**:
- Case2 stages rendered in separate component (`Case2RecommendedStagesPanel`)
- No calls to `setFlowMonitorStatus`, `setFlowMonitorRunId`, `setFlowMonitorMetadata`
- `getCurrentStageIndex` not called with Case2 data
- Main Flow Monitor reads from unchanged state variables

**Validation**:
1. Trigger Case2, accept, run demo review
2. During animation, inspect main Flow Monitor
3. Verify all 6 stages remain grey
4. Verify no stage is highlighted/current
5. Verify `flowMonitorStatus` remains 'idle'

**Rollback**: Remove Case2RecommendedStagesPanel rendering → no secondary stages shown

---

### Risk 6: Exit Case2 Clears Important Data

**Likelihood**: Low (with correct implementation)

**Mitigation**:
- `handleExitCase2Mode` only resets Case2-specific state
- Explicitly does NOT reset `flow2Documents`
- Explicitly does NOT reset Flow Monitor state variables
- Clear documentation in code comments

**Validation**: See Acceptance Test #9 (Exit Case2 Mode)

**Rollback**: Remove exit button (user can refresh page to reset)

---

## G) ACCEPTANCE CHECKLIST

### Manual Tests (MUST ALL PASS)

#### Test 1: Case2 NOT Triggered - Standard KYC Review Unchanged

**Setup**: Clean state, Flow2 mode

**Steps**:
1. Visit `/document?flow=2`
2. Upload 3 documents via "Upload Documents" (do NOT trigger Case2)
3. **VERIFY**: Mode indicator shows "⚙️ Mode: Standard KYC Review" (grey)
4. Click "Run Process Review" button
5. **VERIFY**: Button shows "🔄 Running Review..." (disabled)
6. **VERIFY**: Network tab shows `POST /api/orchestrate` with `mode: langgraph_kyc`
7. **VERIFY**: Left panel shows 8 KYC topics with title "Topic Summary"
8. **VERIFY**: Main Flow Monitor shows stages 1-3 active, pauses at stage 4
9. **VERIFY**: Email sent to human reviewer (check server logs or email inbox)
10. **VERIFY**: No Case2 UI elements appear (no banner, no secondary stages)

**Expected**: ✅ Identical to existing Flow2 KYC review behavior

---

#### Test 2: Case2 Triggered → Accepted → Demo Review

**Setup**: Clean state, Flow2 mode

**Steps**:
1. Visit `/document?flow=2`
2. Upload 3 documents via "Upload Documents"
3. Type in chat: "high-net-worth client from legacy CS portfolio with restricted jurisdiction"
4. **VERIFY**: Case2 banner appears with thinking trace animation
5. Wait for trace to complete
6. **VERIFY**: Banner shows graph + assistant text
7. **VERIFY**: Mode indicator shows "⚠️ Mode: Case2 Triggered (Pending Acceptance)" (orange/amber)
8. **VERIFY**: "Accept Recommended Process" button visible
9. Click "Accept Recommended Process"
10. **VERIFY**: Button shows "🔄 Analyzing documents..." (loading)
11. **VERIFY**: Network tab shows `POST /api/case2/topic-summaries`
12. **VERIFY**: Left panel updates to "CS Integration Exception Analysis" with 6 topics
13. **VERIFY**: Case2 banner auto-collapses
14. **VERIFY**: Secondary stages panel appears below main Flow Monitor showing 4 grey stages
15. **VERIFY**: Microcopy badge: "⚠️ Demo path (no orchestration / no emails / no checkpoints)"
16. **VERIFY**: Mode indicator shows "⚙️ Mode: CS Integration Exception Process" (blue)
17. **VERIFY**: Main Flow Monitor remains grey (all 6 stages idle)
18. Click "Run Process Review"
19. **VERIFY**: Button shows "🔄 Running Review..." (disabled)
20. **VERIFY**: Network tab shows NO `POST /api/orchestrate` call
21. **VERIFY**: Secondary stages animate: Stage 1 → green (1s) → Stage 2 → green (1s) → Stage 3 → green (1s) → Stage 4 → green (1s)
22. **VERIFY**: Main Flow Monitor stays grey throughout (no change)
23. **VERIFY**: Button re-enables after animation completes
24. **VERIFY**: Case2 banner can be expanded to show success message

**Expected**: ✅ Case2 demo flow completes successfully, no backend orchestration/emails/checkpoints, main stages unaffected

---

#### Test 3: Case2 Validation - Upload Documents After Trigger

**Setup**: Clean state, Flow2 mode

**Steps**:
1. Visit `/document?flow=2` (do NOT upload documents yet)
2. Type in chat: "ubs risk appetite conflict with legacy cs policy"
3. **VERIFY**: Case2 banner appears
4. Wait for trace to complete
5. **VERIFY**: Mode indicator shows "⚠️ Mode: Case2 Triggered (Pending Acceptance)" (orange)
6. Click "Accept Recommended Process" WITHOUT uploading documents
7. **VERIFY**: Inline error appears: "⚠️ Please upload at least 3 documents using the Upload Documents control at the top of the page."
8. **VERIFY**: No API call made (network tab)
9. **VERIFY**: Mode indicator still shows "⚠️ Mode: Case2 Triggered (Pending Acceptance)"
10. **VERIFY**: Case2 banner does NOT collapse
11. Upload 3 documents via "Upload Documents"
12. Click "Accept Recommended Process" again
13. **VERIFY**: Error clears, API call succeeds
14. **VERIFY**: Banner collapses, mode indicator updates to "⚙️ Mode: CS Integration Exception Process"

**Expected**: ✅ Validation prevents premature acceptance, upload-after-trigger works correctly

---

#### Test 4: Collapse Behavior Persistence

**Setup**: Clean state, Flow2 mode, Case2 triggered and accepted

**Steps**:
1. Follow Test 2 steps 1-14 (Case2 accepted, banner auto-collapsed)
2. **VERIFY**: Case2 banner is collapsed
3. Click banner chevron to expand
4. **VERIFY**: Banner expands, shows success message
5. Upload another document (triggers rerender)
6. **VERIFY**: Banner stays expanded (state persisted)
7. Click chevron to collapse
8. **VERIFY**: Banner collapses
9. Scroll page up/down (potential rerender)
10. **VERIFY**: Banner stays collapsed

**Expected**: ✅ Collapse state persists across rerenders (parent-owned state)

---

#### Test 5: 3-State Mode Indicator Validation

**Setup**: Clean state, Flow2 mode

**Steps**:
1. Visit `/document?flow=2`
2. **VERIFY**: Mode indicator shows "⚙️ Mode: Standard KYC Review" (grey text)
3. Type Case2 trigger keywords
4. Wait for trace to complete (state = 'synthesized')
5. **VERIFY**: Mode indicator shows "⚠️ Mode: Case2 Triggered (Pending Acceptance)" (orange badge, italic)
6. Upload 3 documents, click "Accept Recommended Process"
7. **VERIFY**: Mode indicator updates to "⚙️ Mode: CS Integration Exception Process" (blue badge, bold)
8. Refresh page (if state doesn't persist, should revert to Standard)
9. **VERIFY**: Mode indicator resets to "⚙️ Mode: Standard KYC Review"

**Expected**: ✅ Mode indicator correctly reflects 3 states based on `case2ProcessAccepted` and `case2State`

---

#### Test 6: Case2 Topics Are Real (LLM-Generated)

**Setup**: Flow2 mode, Case2 triggered and accepted

**Steps**:
1. Follow Test 2 steps 1-13 (Case2 accepted, topics loaded)
2. Inspect left panel topic summaries
3. **VERIFY**: Panel title is "CS Integration Exception Analysis"
4. **VERIFY**: 6 topics shown (not 8 KYC topics)
5. **VERIFY**: Topic titles match CASE2_CS_INTEGRATION_CONFIG
6. **VERIFY**: Topic content is NOT hardcoded (varies by document content)
7. **VERIFY**: Each topic has bullet points and evidence snippets
8. Upload different documents and repeat
9. **VERIFY**: Topic summaries change accordingly (dynamic LLM generation)

**Expected**: ✅ Case2 topics are real LLM-generated content, not static text

---

#### Test 7: Main Flow Monitor Unaffected by Case2 Demo Review

**Setup**: Flow2 mode, Case2 accepted, demo review running

**Steps**:
1. Follow Test 2 steps 1-20 (demo review animation in progress)
2. While stages animate (1-4 seconds), inspect main Flow Monitor closely
3. **VERIFY**: All 6 main stages remain grey (no color change)
4. **VERIFY**: No stage has "current" ring indicator
5. **VERIFY**: No connecting lines turn green
6. **VERIFY**: `flowMonitorStatus` remains 'idle' (check React devtools)
7. After animation completes
8. **VERIFY**: Main Flow Monitor still grey (no final state change)
9. **VERIFY**: Only secondary stages panel shows green stages

**Expected**: ✅ Main Flow Monitor completely isolated from Case2 demo review

---

#### Test 8: Flow1 Unaffected

**Setup**: Clean state, Flow1 mode (NOT Flow2)

**Steps**:
1. Visit `/document` (no `?flow=2` parameter)
2. Upload documents
3. Type Case2 trigger keywords
4. **VERIFY**: No Case2 banner appears
5. **VERIFY**: No mode indicator appears
6. **VERIFY**: Existing Flow1 behavior unchanged

**Expected**: ✅ Flow1 remains completely unaffected

---

#### Test 9: Exit Case2 Mode

**Setup**: Flow2 mode, Case2 triggered and accepted

**Steps**:
1. Follow Test 2 steps 1-16 (Case2 accepted, secondary stages shown)
2. **VERIFY**: Mode indicator shows "⚙️ Mode: CS Integration Exception Process"
3. **VERIFY**: "← Exit Case2 / Switch to Standard Review" button visible
4. Click "Exit Case2 / Switch to Standard Review" button
5. **VERIFY**: Case2 banner disappears (state = 'idle')
6. **VERIFY**: Secondary stages panel disappears
7. **VERIFY**: Mode indicator shows "⚙️ Mode: Standard KYC Review"
8. **VERIFY**: Left panel reverts (empty or shows existing KYC topics if review already ran)
9. **VERIFY**: Uploaded documents still present in documents list (NOT wiped)
10. **VERIFY**: `flow2Documents` state still contains 3+ documents
11. Click "Run Process Review"
12. **VERIFY**: Branches to standard KYC handler (network tab shows `POST /api/orchestrate`)
13. **VERIFY**: 8 KYC topics appear in left panel
14. **VERIFY**: Main Flow Monitor stages animate normally

**Expected**: ✅ Clean exit from Case2 mode, documents preserved, can run standard KYC review

---

### Optional Automated Tests

#### Unit Tests

**File**: `app/lib/topicSummaries/configs.test.ts` (new)
```typescript
test('CASE2_CS_INTEGRATION_CONFIG has 6 unique topics', () => {
  expect(CASE2_CS_INTEGRATION_CONFIG.topic_ids).toHaveLength(6);
  const uniqueIds = new Set(CASE2_CS_INTEGRATION_CONFIG.topic_ids);
  expect(uniqueIds.size).toBe(6);
});

test('CASE2_CS_INTEGRATION_CONFIG matches TopicSummaryConfig type', () => {
  expect(CASE2_CS_INTEGRATION_CONFIG.template_id).toBe('case2_cs_integration');
  expect(CASE2_CS_INTEGRATION_CONFIG.max_bullets).toBe(5);
  expect(CASE2_CS_INTEGRATION_CONFIG.max_evidence).toBe(2);
});
```

**File**: `app/api/case2/topic-summaries/route.test.ts` (new)
- Mock `callTopicSummariesEngine`
- Test successful response with 6 topics
- Test error handling (missing API key, empty documents)

#### Integration Tests

**File**: `tests/integration/case2-topic-summaries.test.ts` (new)
- Test full flow: trigger → accept → API call → store topics
- Verify state transitions
- Verify no interference with KYC topics

#### E2E Tests (Playwright/Cypress)

**File**: `tests/e2e/case2-unified-flow.spec.ts` (new)
- Automate Test 2 (full Case2 journey)
- Automate Test 3 (validation)
- Automate Test 5 (3-state mode indicator)
- Automate Test 9 (exit Case2 mode)

---

## H) IMPLEMENTATION PHASES

**Phase 0**: Reconstruct authoritative plan from chat + errata (this document)

**Phase 1**: Remove Case2 Upload Widget + Unify Upload Source
- Target: `app/components/case2/Case2ProcessBanner.tsx`
- Remove upload UI, externalize collapse state, update button

**Phase 2**: Add Case2 Recommended Stages Secondary Panel
- Create: `app/components/case2/Case2RecommendedStagesPanel.tsx`
- Use real `Case2PathStep` shape, include microcopy badge

**Phase 3**: Add Case2 Topic Config + New API Route
- Update: `app/lib/topicSummaries/configs.ts`
- Create: `app/api/case2/topic-summaries/route.ts`

**Phase 4**: Wire State + Branching in `app/document/page.tsx`
- Add state variables, remove old state
- Implement handlers: accept, demo review, branching
- Render mode indicator, update button, render secondary stages

**Phase 5**: Exit Case2 Mechanism
- Implement `handleExitCase2Mode`
- Add UI control near mode indicator

**Phase 6**: Regression Verification
- Run full test suite
- Verify Flow1 and Flow2 KYC unchanged

---

## CONCLUSION

This revised plan (v2.1) incorporates all errata and amendments, providing a complete, implementation-ready specification for unifying Case2 with Flow2. Key achievements:

✅ **Single source of truth for uploads** (`flow2Documents`)  
✅ **Real LLM-based topic analysis** for Case2 (6 topics)  
✅ **Clear "Accept Recommended Process" UX** with validation  
✅ **Renamed button with 3-state mode indicator**  
✅ **Branched behavior**: KYC review vs. Case2 demo review  
✅ **Secondary stage list** for Case2 (does not interfere with main stages)  
✅ **Exit mechanism** to return to Standard KYC Review  
✅ **No breaking changes** to Flow1 or Flow2 KYC review  
✅ **No new dependencies**  
✅ **Comprehensive acceptance tests** (9 manual tests)  
✅ **Clarified backend usage**: Accept calls `/api/case2/topic-summaries`; demo review avoids orchestration/emails/checkpoints  

**Ready for implementation.**

---

**END OF PLAN v2.1**


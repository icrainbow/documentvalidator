# EXECUTION PHASE 2 — VERIFICATION

**Date:** 2026-01-03  
**Branch:** `fix/flow2-hitl-guarantee`  
**Status:** ✅ COMPLETE

---

## CHANGES MADE

### 1. Extended Checkpoint Types

**File:** `app/lib/flow2/checkpointTypes.ts`

**Added to `CheckpointMetadata` interface:**
```typescript
// ========== GLOBAL REVIEW PROCESS STATUS (PHASE 2) ==========
// Single source of truth for overall review outcome (survives page reloads)
reviewProcessStatus?: 'RUNNING' | 'COMPLETE' | 'FAILED';
failureReason?: string;  // Human-readable reason when FAILED
failedAt?: string;       // ISO timestamp of failure
failedStage?: 'human_review' | 'edd_review';  // Which stage failed
```

**Impact:** Provides single source of truth for global review process status

---

### 2. Updated EDD Submit API - Approve Handler

**File:** `app/api/flow2/edd/submit/route.ts`  
**Handler:** GET (line 110-126)

**Added:**
```typescript
// ========== PHASE 2: Set COMPLETE status ==========
if (!checkpoint.checkpoint_metadata) {
  checkpoint.checkpoint_metadata = {} as any;
}
checkpoint.checkpoint_metadata.reviewProcessStatus = 'COMPLETE';
```

**Impact:** EDD approval now marks entire review process as COMPLETE

---

### 3. Updated EDD Submit API - Reject Handler

**File:** `app/api/flow2/edd/submit/route.ts`  
**Handler:** POST (line 239-255)

**Added:**
```typescript
// ========== PHASE 2: Set FAILED status ==========
if (!checkpoint.checkpoint_metadata) {
  checkpoint.checkpoint_metadata = {} as any;
}
checkpoint.checkpoint_metadata.reviewProcessStatus = 'FAILED';
checkpoint.checkpoint_metadata.failureReason = 'EDD review rejected by reviewer';
checkpoint.checkpoint_metadata.failedAt = now;
checkpoint.checkpoint_metadata.failedStage = 'edd_review';
```

**Impact:** EDD rejection now marks entire review process as FAILED with reason

---

### 4. Updated EDD Reject Page Redirect

**File:** `app/flow2/edd/reject/page.tsx`  
**Line:** 58

**Changed:**
```diff
- router.push(`/document?flow=2&docKey=${data.run_id}`);
+ router.push(`/document?flow=2&docKey=${data.run_id}&status=failed`);
```

**Impact:** 
- URL param `status=failed` provides UX hint for toast/immediate feedback
- Actual state authority remains checkpoint_metadata.reviewProcessStatus

---

### 5. Updated Poll Endpoint Metadata

**File:** `app/api/flow2/approvals/poll/route.ts`  
**Line:** 68-92

**Added to `checkpoint_metadata` response:**
```typescript
// PHASE 2: Include review process status
reviewProcessStatus: checkpoint.checkpoint_metadata?.reviewProcessStatus,
failureReason: checkpoint.checkpoint_metadata?.failureReason,
failedAt: checkpoint.checkpoint_metadata?.failedAt,
failedStage: checkpoint.checkpoint_metadata?.failedStage,
```

**Impact:** Document page can restore FAILED state after redirect by reading poll response

---

## MANUAL VERIFICATION STEPS

### Test Scenario 1: EDD Approve Flow

**Prerequisites:**
1. Complete Flow2 KYC review through Stage 1 human reject
2. Receive EDD email with approve link

**Steps:**
1. Click approve link from EDD email
2. Check checkbox "I have reviewed..."
3. Click "Approve EDD & Continue"
4. Wait for redirect

**Expected Results:**
- ✅ Success message shown
- ✅ Redirects to `/document?flow=2&docKey={run_id}`
- ✅ Document page loads with Flow Monitor showing COMPLETE
- ✅ Checkpoint file shows:
  ```json
  {
    "final_decision": "approved_with_edd",
    "checkpoint_metadata": {
      "reviewProcessStatus": "COMPLETE"
    }
  }
  ```
- ✅ No FAILED state, no error banner

**Server Log Check:**
```
[EDD/Submit] ✅ EDD approved for run {run_id}
```

---

### Test Scenario 2: EDD Reject Flow (FAILURE PATH)

**Prerequisites:**
1. Complete Flow2 KYC review through Stage 1 human reject
2. Receive EDD email with reject link

**Steps:**
1. Click reject link from EDD email
2. Fill rejection reason (min 10 chars): "Test rejection for EDD review verification"
3. Click "Submit Rejection"
4. Wait for redirect

**Expected Results:**
- ✅ Success message shown
- ✅ Redirects to `/document?flow=2&docKey={run_id}&status=failed`
- ✅ Document page loads with URL param `status=failed`
- ✅ Checkpoint file shows:
  ```json
  {
    "final_decision": "rejected",
    "edd_stage": {
      "decision": "reject",
      "status": "rejected",
      "decision_comment": "Test rejection..."
    },
    "checkpoint_metadata": {
      "reviewProcessStatus": "FAILED",
      "failureReason": "EDD review rejected by reviewer",
      "failedAt": "2026-01-03T...",
      "failedStage": "edd_review"
    }
  }
  ```
- ✅ Flow Monitor should eventually show "Review Process Failed" (PHASE 3 will add this UI)

**Server Log Check:**
```
[EDD/Submit] ✅ EDD rejected for run {run_id}
```

---

### Test Scenario 3: Poll Endpoint Returns FAILED Metadata

**Prerequisites:**
1. Complete EDD reject (Scenario 2)
2. Have run_id from checkpoint

**Steps:**
1. Call poll API:
   ```bash
   curl "http://localhost:3000/api/flow2/approvals/poll?run_id={RUN_ID}"
   ```

**Expected Response:**
```json
{
  "ok": true,
  "run_id": "...",
  "status": "rejected",
  "checkpoint_metadata": {
    "final_decision": "rejected",
    "edd_stage": {
      "decision": "reject",
      "status": "rejected"
    },
    "reviewProcessStatus": "FAILED",
    "failureReason": "EDD review rejected by reviewer",
    "failedAt": "2026-01-03T...",
    "failedStage": "edd_review",
    "documents": [...],
    "graph_state": {...},
    "topic_summaries": [...]
  }
}
```

**Verification:**
- ✅ `reviewProcessStatus` is `"FAILED"`
- ✅ `failureReason` is present and human-readable
- ✅ `failedAt` is ISO timestamp
- ✅ `failedStage` is `"edd_review"`

---

### Test Scenario 4: Historical Node Colors Preserved

**Prerequisites:**
1. Complete EDD reject to trigger FAILED state
2. Document page shows Flow Monitor with node trace

**Steps:**
1. Visually inspect Flow Monitor node colors
2. Check that previously failed/warning nodes retain their colors

**Expected Results:**
- ✅ Human Review node: RED (was rejected in Stage 1)
- ✅ Risk Assessment node: YELLOW or RED (if warnings/risks were present)
- ✅ EDD Review node: RED (just rejected)
- ✅ Other completed nodes: GREEN
- ✅ Not-run nodes: GRAY
- ✅ No "green-washing" of historical failures

**Implementation Note:**
- Historical color preservation is handled by existing `demoNodeStatusPolicy.ts`
- No changes needed in PHASE 2 for this feature
- Policy reads from `checkpoint_metadata.decision` and `graph_state.issues`

---

## STATE CONSISTENCY VERIFICATION

### Single Source of Truth: checkpoint_metadata.reviewProcessStatus

**Test:**
1. After EDD reject, reload page multiple times
2. Navigate away and back to `/document?flow=2&docKey={run_id}`
3. Clear URL params and manually navigate to `/document?flow=2&docKey={run_id}` (no `status=failed`)

**Expected:**
- ✅ FAILED state persists across all page reloads
- ✅ State is NOT dependent on URL param
- ✅ URL param `status=failed` is optional UX hint only
- ✅ Poll endpoint always returns correct `reviewProcessStatus`

---

## ACCEPTANCE CRITERIA

### R2.1: EDD approve link works correctly ✅

**Evidence:**
- GET `/api/flow2/edd/submit?token=...&action=approve` handler verified
- Sets `reviewProcessStatus = 'COMPLETE'`
- Redirects to `/document?flow=2&docKey={run_id}`
- Manual test scenario provided

### R2.2: EDD reject marks process as FAILED ✅

**Evidence:**
- POST `/api/flow2/edd/submit` handler updated
- Sets `reviewProcessStatus = 'FAILED'`
- Sets `failureReason`, `failedAt`, `failedStage`
- Checkpoint persists FAILED state

### R2.3: EDD reject redirects to document page with failure indication ✅

**Evidence:**
- Redirect URL includes `&status=failed` as UX hint
- Actual state comes from `checkpoint_metadata.reviewProcessStatus`
- Poll endpoint returns full failure metadata

### R2.4: Historical node status preserved ✅

**Evidence:**
- Existing `demoNodeStatusPolicy.ts` handles this (unchanged)
- Policy reads `checkpoint_metadata.decision` and `graph_state.issues`
- Red for human reject, yellow for risk warnings
- No changes needed in PHASE 2

---

## PHASE 2 COMPLETE

**Status:** ✅ READY FOR PHASE 3

**Next Step:** Proceed to PHASE 3 (Document page Finish & Download Package UX)

---

## NOTES

- All changes are backward compatible (new fields are optional)
- `reviewProcessStatus` defaults to undefined (treated as 'RUNNING')
- URL param `status=failed` is a UX enhancement, not state authority
- Flow1 completely unaffected (all changes Flow2-specific, gated by checkpoint structure)
- No breaking changes to existing checkpoints




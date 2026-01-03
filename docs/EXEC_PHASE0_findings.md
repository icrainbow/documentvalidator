# EXECUTION PHASE 0 — FINDINGS

**Date:** 2026-01-03  
**Branch:** `fix/flow2-hitl-guarantee`  
**Status:** ✅ COMPLETE

---

## GIT STATUS

```
On branch fix/flow2-hitl-guarantee
Your branch is ahead of 'origin/fix/flow2-hitl-guarantee' by 7 commits.

Untracked files:
  docs/ASIS_FLOW2_CASE2_TRACE.md
  docs/PLAN_fix_email_approval_and_failure_finish.md
```

**Recent commits:**
```
1bab2b5 fix(flow2): make Start New Review button work on first click
06dfd6c docs: add urgent fix instructions for infinite API loop
150a791 fix(flow2): eliminate infinite loop in handlePhase8Complete
0818d96 fix(flow2): improve checkpoint corruption recovery and add size limits
8b80b06 fix(flow2): prevent checkpoint file corruption from concurrent writes
```

---

## 1. EMAIL LINK BUILDERS AND URLS

### Human Review (Stage 1)

**Email Sent From:** `app/lib/email/smtpAdapter.ts`  
**Function:** `sendApprovalEmail()`

**Links Generated (line 59-60):**
```typescript
const approveUrl = `${params.base_url}/flow2/approve?token=${params.approval_token}`;
const rejectUrl = `${params.base_url}/flow2/reject?token=${params.approval_token}`;
```

**Email Subject:** `[Flow2 Approval] Review Required - Run {run_id.slice(0, 8)}`

**Token Type:** `stage1` (from checkpoint token index)

---

### EDD Review (Stage 2)

**Email Sent From:** `app/lib/email/smtpAdapter.ts`  
**Function:** `sendEddApprovalEmail()`

**Links Generated (line 406-407):**
```typescript
const approveUrl = `${params.base_url}/flow2/edd/approve?token=${params.approval_token}`;
const rejectUrl = `${params.base_url}/flow2/edd/reject?token=${params.approval_token}`;
```

**Email Subject:** `[Flow2 EDD] Additional Approval Required - Run {run_id.slice(0, 13)}...`

**Token Type:** `edd` (from checkpoint token index)

---

## 2. STAGE 1 ENDPOINTS AND PAYLOAD SCHEMA

### Stage 1 Approve Page

**File:** `app/flow2/approve/page.tsx`

**API Call (line 24-32):**
```typescript
const response = await fetch('/api/flow2/approvals/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token,
    decision: 'approve',  // ❌ WRONG FIELD NAME
    signer: 'Email Approval',
  }),
});
```

**Redirect on Success (line 45):**
```typescript
router.push(`/document?flow=2&docKey=${data.run_id || ''}`);
```

---

### Stage 1 Submit API

**File:** `app/api/flow2/approvals/submit/route.ts`

**POST Handler Expected Fields (line 169):**
```typescript
const { token, action, reason, signer } = body;  // ✅ Expects 'action', not 'decision'
```

**Validation (line 181):**
```typescript
if (!action || (action !== 'approve' && action !== 'reject')) {
  return NextResponse.json({
    ok: false,
    status: 'validation_failed',
    error_code: 'INVALID_ACTION',
    message: 'action must be "approve" or "reject"',
  }, { status: 400 });
}
```

**Response Schema (line 257-263):**
```typescript
{
  ok: true,
  status: 'finalized' | 'already_finalized' | 'not_found' | 'conflict' | ...,
  run_id: string,
  decision: 'approve' | 'reject',
  message: string,
}
```

---

## 3. EDD ENDPOINTS AND PAYLOAD SCHEMA

### EDD Approve Page

**File:** `app/flow2/edd/approve/page.tsx`

**API Call (line 56):**
```typescript
const res = await fetch(`/api/flow2/edd/submit?token=${token}&action=approve`);
```

**Method:** **GET** (query params only)

**Redirect on Success (line 65):**
```typescript
router.push(`/document?flow=2&docKey=${data.run_id}`);
```

---

### EDD Reject Page

**File:** `app/flow2/edd/reject/page.tsx`

**API Call (line 40-48):**
```typescript
const res = await fetch('/api/flow2/edd/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: token.trim(),
    action: 'reject',
    reason: reason.trim(),
  }),
});
```

**Method:** **POST** (body with reason)

**Redirect on Success (line 58):**
```typescript
router.push(`/document?flow=2&docKey=${data.run_id}`);
```

---

### EDD Submit API

**File:** `app/api/flow2/edd/submit/route.ts`

**GET Handler (line 21-145):**
- Supports **ONLY** `action=approve`
- Query params: `?token=...&action=approve`
- Updates checkpoint:
  ```typescript
  checkpoint.edd_stage.status = 'approved';
  checkpoint.edd_stage.decision = 'approve';
  checkpoint.final_decision = 'approved_with_edd';
  checkpoint.status = 'completed';
  ```
- Response:
  ```typescript
  { ok: true, message: '...', run_id, final_decision: 'approved_with_edd' }
  ```

**POST Handler (line 151-273):**
- Supports **ONLY** `action=reject`
- Body: `{ token, action: 'reject', reason }`
- Updates checkpoint (line 239-254):
  ```typescript
  checkpoint.edd_stage.status = 'rejected';
  checkpoint.edd_stage.decision = 'reject';
  checkpoint.edd_stage.decision_comment = reason.trim();
  checkpoint.final_decision = 'rejected';  // ✅ Global failure
  // BUT: checkpoint.status is NOT set to 'failed'
  ```
- Response:
  ```typescript
  { ok: true, message: '...', run_id, final_decision: 'rejected' }
  ```

---

## 4. CHOSEN UNIFIED INTERFACE FOR EDD SUBMIT

**Decision:** **KEEP CURRENT DUAL INTERFACE** (GET for approve, POST for reject)

**Rationale:**
1. **Approve via GET** is standard for one-click email links (no form needed)
2. **Reject via POST** is correct because it requires a reason field (min 10 chars)
3. Current implementation is already consistent across pages and API
4. No security risk: Approval tokens are single-use, validated, and tied to specific run_id
5. GET approve is idempotent (checked at line 92-108)
6. POST reject is idempotent (checked at line 220-237)

**No changes needed** to EDD interface design.

---

## 5. ROOT CAUSE: CASE1 FIELD MISMATCH

### Issue

**Page sends:** `{ decision: 'approve', signer: 'Email Approval' }`  
**API expects:** `{ action: 'approve', signer: 'Email Approval' }`

**Result:** API validation fails at line 181 because `action` is `undefined`

### Fix

**Change:** `app/flow2/approve/page.tsx` line 29  
**From:** `decision: 'approve'`  
**To:** `action: 'approve'`

---

## 6. MISSING: GLOBAL FAILED STATE MODEL

### Current State

**Checkpoint fields:**
- `checkpoint.status`: `'paused' | 'resumed' | 'completed' | 'failed'`
- `checkpoint.final_decision`: `'approved' | 'rejected' | 'approved_with_edd'`
- `checkpoint.edd_stage.decision`: `'approve' | 'reject'`

**Problem:**
- When EDD rejects, `final_decision = 'rejected'` is set (line 246 in `edd/submit/route.ts`)
- But `checkpoint.status` is NOT updated to `'failed'`
- No dedicated field for "review process globally failed" vs "workflow execution failed"

### Proposed Solution

**Add to `CheckpointMetadata` interface:**
```typescript
reviewProcessStatus?: 'RUNNING' | 'COMPLETE' | 'FAILED';
failureReason?: string;
failedAt?: string;
failedStage?: 'human_review' | 'edd_review';
```

**Update EDD reject to set:**
```typescript
if (!checkpoint.checkpoint_metadata) checkpoint.checkpoint_metadata = {};
checkpoint.checkpoint_metadata.reviewProcessStatus = 'FAILED';
checkpoint.checkpoint_metadata.failureReason = 'EDD review rejected by reviewer';
checkpoint.checkpoint_metadata.failedAt = now;
checkpoint.checkpoint_metadata.failedStage = 'edd_review';
```

**Update EDD approve to set:**
```typescript
checkpoint.checkpoint_metadata.reviewProcessStatus = 'COMPLETE';
```

---

## 7. POLL ENDPOINT PAYLOAD INSPECTION

**File:** `app/api/flow2/approvals/poll/route.ts`

**GET `/api/flow2/approvals/poll?run_id=...`**

**Response when decision exists (line 58-96):**
```typescript
{
  ok: true,
  run_id: string,
  status: 'approved' | 'rejected',
  decision: {
    action: 'approve' | 'reject',
    approver: string,
    timestamp: string,
    reason?: string,
  },
  checkpoint_metadata: {
    approval_email_to: string,
    approval_sent_at: string,
    reminder_sent_at?: string,
    decision_comment?: string,
    decided_by: string,
    decided_at: string,
    
    // ✅ GOOD: Full data included for restoration
    documents: Array<{filename, text, size, uploaded_at}>,
    graph_state: { issues, trace, ... },
    topic_summaries: Array<TopicSummary>,
    
    // ✅ GOOD: EDD data included
    edd_stage?: { decision, status, ... },
    final_decision: 'approved' | 'rejected' | 'approved_with_edd',
    
    // Demo fields
    demo_mode?: boolean,
    demo_evidence?: any,
    demo_trace?: any,
  },
  // Backward compat
  decided_at: string,
  decided_by: string,
  decision_comment?: string,
}
```

**Assessment:**
✅ Poll endpoint returns **COMPLETE DATA** including:
- Full documents array
- Full graph_state with trace/issues
- Full topic_summaries
- EDD stage data
- Demo evidence

**Conclusion:** No need for separate download endpoint. Poll payload is sufficient for packaging.

---

## 8. KEY FINDINGS SUMMARY

| Issue | Location | Root Cause | Fix Required |
|-------|----------|------------|--------------|
| **Case1 approve fails** | `app/flow2/approve/page.tsx:29` | Field name mismatch: `decision` → `action` | Change 1 line |
| **No global FAILED state** | Checkpoint metadata | Missing `reviewProcessStatus` field | Add to types + update EDD reject |
| **EDD reject doesn't mark failure** | `app/api/flow2/edd/submit/route.ts:246` | Sets `final_decision='rejected'` but not process status | Add metadata update |
| **EDD redirects lack failure flag** | `app/flow2/edd/reject/page.tsx:58` | No URL param to trigger failure UI | Add `&status=failed` param (UX hint only) |
| **Poll payload complete** | `app/api/flow2/approvals/poll/route.ts` | ✅ Already includes all data needed | No fix needed |

---

## 9. PHASE 1 READINESS

✅ **Ready to proceed with PHASE 1:**
- Exact line to fix identified: `app/flow2/approve/page.tsx:29`
- Expected API response schema documented
- Test cases clear: valid token approve + invalid token 4xx

---

## 10. PHASE 2 READINESS

✅ **Ready to proceed with PHASE 2:**
- EDD interface design confirmed (GET approve, POST reject)
- Checkpoint updates needed identified (add `reviewProcessStatus`)
- Redirect URLs confirmed (add `&status=failed` for UX hint)

---

## 11. PHASE 3 READINESS

✅ **Ready to proceed with PHASE 3:**
- Poll endpoint payload is sufficient (no new API needed)
- Package structure can be assembled client-side from poll data
- Checkpoint metadata fields defined for types

---

**END OF PHASE 0 FINDINGS**

**Next Step:** Proceed to PHASE 1 (Case1 fix) immediately.




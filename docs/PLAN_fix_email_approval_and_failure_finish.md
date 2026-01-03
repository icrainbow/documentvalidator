# PLAN: Fix Email Approval Links and Failure/Finish Flow

**Document Version:** 1.0  
**Created:** 2026-01-03  
**Status:** AWAITING APPROVAL  
**Branch:** `fix/flow2-hitl-guarantee`

---

## EXECUTIVE SUMMARY

This plan addresses three critical issues with Flow2 email-based approval workflows:

1. **Case1 (Human Review)**: Approve link leads to error page ("Failed to submit approval")
2. **EDD Review**: Verify and fix both approve/reject links for EDD stage
3. **Failure Finish UX**: Add proper failure state handling with "Finish" button that resets workspace AND downloads approval package

**Key Decision**: Use checkpoint metadata to track global process status (`RUNNING | COMPLETE | FAILED`) and package full trace/evidence into downloadable JSON on failure finish.

---

## A) CURRENT-STATE INVESTIGATION CHECKLIST

### Step 0.1: Map All Email Link Routes

**Commands to run:**
```bash
# Find all email link generation points
rg -n "sendApprovalEmail|sendEddApprovalEmail|sendReminderEmail" app/lib

# Find all approval page routes
find app/flow2 -name "page.tsx" -type f

# Find all API submission endpoints
find app/api/flow2 -name "route.ts" | grep -E "submit|approve|reject"

# Check token validation logic
rg -n "getTokenMetadata|getRunIdByToken" app/lib/flow2
```

**Expected Output Mapping:**
| Email Type | Link Generated | Page Route | API Endpoint | Token Type |
|-----------|----------------|------------|--------------|------------|
| Human Review (Stage 1) | `/flow2/approve?token=XXX` | `app/flow2/approve/page.tsx` | POST `/api/flow2/approvals/submit` | `stage1` |
| Human Review (Stage 1) | `/flow2/reject?token=XXX` | `app/flow2/reject/page.tsx` | POST `/api/flow2/approvals/submit` | `stage1` |
| EDD Review (Stage 2) | `/flow2/edd/approve?token=XXX` | `app/flow2/edd/approve/page.tsx` | GET `/api/flow2/edd/submit` | `edd` |
| EDD Review (Stage 2) | `/flow2/edd/reject?token=XXX` | `app/flow2/edd/reject/page.tsx` | GET `/api/flow2/edd/submit` | `edd` |

### Step 0.2: Inspect Current Token Flow

**Files to examine:**
- `app/lib/flow2/checkpointStore.ts` - Token index management
- `app/lib/flow2/submitDecision.ts` - Decision finalization logic
- `app/lib/email/smtpAdapter.ts` - Email link construction

**Key Questions:**
1. How are tokens generated? (Answer: `crypto.randomBytes(16).toString('hex')` - 32 chars)
2. Where are tokens stored? (Answer: `.local/flow2-checkpoints/_token_index.json`)
3. How long are tokens valid? (Answer: No explicit expiration, but checkpoint may be deleted)
4. What's the token → run_id → checkpoint lookup chain?

**Validation Command:**
```bash
# Check token index structure
cat .local/flow2-checkpoints/_token_index.json 2>/dev/null | jq '.'

# List all checkpoints
ls -lh .local/flow2-checkpoints/*.json | head -10
```

---

## B) ROOT-CAUSE HYPOTHESES

### Hypothesis 1: Case1 Approve Fails Due to Wrong Token Type Detection

**Evidence:**
- `app/api/flow2/approvals/submit/route.ts` (line 63-72) explicitly checks if token is EDD type
- If EDD token is used on `/api/flow2/approvals/submit`, returns 400 error: "This is an EDD token"
- Page logic at `app/flow2/approve/page.tsx` (line 24-38) calls `/api/flow2/approvals/submit` with POST body: `{token, decision: 'approve', signer: 'Email Approval'}`

**Root Cause:**
- The API expects `action` field (line 181: `action !== 'approve' && action !== 'reject'`)
- But the page sends `decision` field (line 29: `decision: 'approve'`)
- **FIELD NAME MISMATCH** → API validation fails → error returned

**Proof:**
```typescript
// app/flow2/approve/page.tsx line 27-31
body: JSON.stringify({
  token,
  decision: 'approve',  // ❌ WRONG FIELD NAME
  signer: 'Email Approval',
})

// app/api/flow2/approvals/submit/route.ts line 169
const { token, action, reason, signer } = body;  // ✓ Expects 'action', not 'decision'
```

### Hypothesis 2: EDD Reject May Have Similar Issues

**Evidence:**
- `app/flow2/edd/reject/page.tsx` exists but needs inspection
- EDD flows go through different API: `/api/flow2/edd/submit` (not `/api/flow2/approvals/submit`)
- Need to verify if EDD reject properly marks process as FAILED

**Files to Inspect:**
- `app/api/flow2/edd/submit/route.ts`
- `app/lib/flow2/eddSubReview.ts`

### Hypothesis 3: No Global FAILED State Model Exists

**Evidence:**
- Current checkpoint status types: `'paused' | 'resumed' | 'completed' | 'failed'` (in `checkpointTypes.ts`)
- BUT Flow Monitor uses different status enum: `'idle' | 'running' | 'waiting_human' | 'resuming' | 'completed' | 'rejected' | 'error'`
- `final_decision` field exists: `'approved' | 'rejected' | 'approved_with_edd'`
- **Gap:** No unified "process FAILED" status that survives across page reloads

**Proposed Solution:**
Add `reviewProcessStatus: 'RUNNING' | 'COMPLETE' | 'FAILED'` to checkpoint metadata, separate from flow status.

---

## C) PROPOSED CODE CHANGES (GROUPED BY MODULE)

### Module 1: Fix Case1 Approve Field Name Mismatch

**File:** `app/flow2/approve/page.tsx`

**Line 27-31 (BEFORE):**
```typescript
body: JSON.stringify({
  token,
  decision: 'approve',
  signer: 'Email Approval',
}),
```

**Line 27-31 (AFTER):**
```typescript
body: JSON.stringify({
  token,
  action: 'approve',  // ✅ FIXED: Changed 'decision' to 'action'
  signer: 'Email Approval',
}),
```

**Impact:** Allows Stage 1 approve to succeed.

---

### Module 2: Verify and Fix EDD Flows

#### 2.1: Inspect EDD Submit API

**File:** `app/api/flow2/edd/submit/route.ts` (needs full read)

**Required Checks:**
1. Does GET endpoint accept `?token=XXX&action=approve`?
2. Does GET endpoint accept `?token=XXX&action=reject`?
3. Does reject action update `edd_stage.decision = 'reject'`?
4. Does reject action set `final_decision = 'rejected'`? (IMPORTANT FOR FAILED STATE)
5. Does reject action update `status = 'failed'` or `status = 'completed'`?

**Expected Fix (if needed):**
```typescript
// In /api/flow2/edd/submit GET handler
if (action === 'reject') {
  // Update checkpoint
  checkpoint.edd_stage.decision = 'reject';
  checkpoint.edd_stage.status = 'rejected';
  checkpoint.final_decision = 'rejected';  // ✅ Mark global failure
  checkpoint.status = 'failed';  // ✅ Or 'completed' with failed metadata
  
  // NEW: Add reviewProcessStatus for UI consumption
  if (!checkpoint.checkpoint_metadata) checkpoint.checkpoint_metadata = {};
  checkpoint.checkpoint_metadata.reviewProcessStatus = 'FAILED';
  checkpoint.checkpoint_metadata.failureReason = 'EDD review rejected';
  checkpoint.checkpoint_metadata.failedAt = new Date().toISOString();
}
```

#### 2.2: Update EDD Reject Page Redirect

**File:** `app/flow2/edd/reject/page.tsx`

**Expected Change (line ~140):**
```typescript
// AFTER rejection submission success
setTimeout(() => {
  // NEW: Add failureFlag to URL so Document page knows to show failure state
  router.push(`/document?flow=2&docKey=${data.run_id}&status=failed`);
}, 2000);
```

---

### Module 3: Add Global Process Status Model

#### 3.1: Extend Checkpoint Types

**File:** `app/lib/flow2/checkpointTypes.ts`

**Addition to `CheckpointMetadata` interface (after line 115):**
```typescript
export interface CheckpointMetadata {
  // ... existing fields ...
  
  // NEW: Global review process status (survives page reloads)
  reviewProcessStatus?: 'RUNNING' | 'COMPLETE' | 'FAILED';
  failureReason?: string;  // Human-readable reason (e.g., "EDD review rejected")
  failedAt?: string;       // ISO timestamp of failure
  failedStage?: 'human_review' | 'edd_review';  // Which stage failed
  
  // Existing fields preserved below...
  demo_mode?: boolean;
  // ...
}
```

#### 3.2: Update Flow Monitor to Read Process Status

**File:** `app/components/flow2/Flow2MonitorPanel.tsx`

**Changes:**
1. **Props:** Add `processStatus?: 'RUNNING' | 'COMPLETE' | 'FAILED'` (read from `checkpointMetadata.reviewProcessStatus`)

2. **Status Badge Logic (around line 280-320):**
```typescript
// BEFORE: Only shows APPROVED & COMPLETED or IN PROGRESS

// AFTER: Add FAILED badge
{processStatus === 'FAILED' && (
  <div className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold flex items-center gap-2">
    ❌ REVIEW PROCESS FAILED
  </div>
)}

{isFullyCompleted && processStatus === 'COMPLETE' && (
  <div className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold flex items-center gap-2">
    ✅ APPROVED & COMPLETED
  </div>
)}

{!isFullyCompleted && processStatus !== 'FAILED' && (
  <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold flex items-center gap-2">
    🔄 IN PROGRESS
  </div>
)}
```

3. **Failure Details Section (NEW):**
```typescript
{processStatus === 'FAILED' && checkpointMetadata?.failureReason && (
  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-sm text-red-800">
      <strong>Reason:</strong> {checkpointMetadata.failureReason}
    </p>
    {checkpointMetadata.failedAt && (
      <p className="text-xs text-red-600 mt-2">
        Failed at: {new Date(checkpointMetadata.failedAt).toLocaleString()}
      </p>
    )}
  </div>
)}
```

#### 3.3: Update Document Page State Management

**File:** `app/document/page.tsx`

**New State Variable (around line 240):**
```typescript
const [reviewProcessStatus, setReviewProcessStatus] = useState<'RUNNING' | 'COMPLETE' | 'FAILED' | null>(null);
```

**Update in checkpoint restoration logic (around line 3480-3540):**
```typescript
// When restoring from checkpoint (polling or page load)
if (data.checkpoint_metadata) {
  const meta = data.checkpoint_metadata;
  
  // Restore process status
  if (meta.reviewProcessStatus) {
    setReviewProcessStatus(meta.reviewProcessStatus);
  }
  
  // If process failed, show appropriate UI
  if (meta.reviewProcessStatus === 'FAILED') {
    setFlowMonitorStatus('error');  // Or keep existing status
    setMessages(prev => [...prev, {
      role: 'agent',
      agent: 'System',
      content: `❌ Review process failed: ${meta.failureReason || 'Unknown reason'}`
    }]);
  }
}
```

**Pass to Flow Monitor (around line 4370):**
```typescript
<Flow2MonitorPanel
  runId={flowMonitorRunId}
  initialStatus={flowMonitorStatus}
  checkpointMetadata={flowMonitorMetadata}
  processStatus={reviewProcessStatus}  // ✅ NEW PROP
  riskData={riskDataForMonitor}
  onStartNewReview={handleStartNewReview}
  onStatusChange={setFlowMonitorStatus}
/>
```

---

### Module 4: Rename "Start New Review" to "Finish" When Failed

#### 4.1: Conditional Button Label

**File:** `app/components/flow2/Flow2MonitorPanel.tsx`

**Change Button Rendering (around line 440-460):**
```typescript
// BEFORE:
<button
  onClick={onStartNewReview}
  className="..."
>
  🔄 Start New Review
</button>

// AFTER:
{processStatus === 'FAILED' ? (
  <button
    onClick={handleFinish}  // ✅ NEW HANDLER
    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md"
  >
    ✓ Finish & Download Package
  </button>
) : (
  <button
    onClick={onStartNewReview}
    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md"
  >
    🔄 Start New Review
  </button>
)}
```

---

### Module 5: Implement "Finish" Logic (Reset + Download Package)

#### 5.1: Add handleFinish to Flow Monitor

**File:** `app/components/flow2/Flow2MonitorPanel.tsx`

**New Handler (after line 220):**
```typescript
const handleFinish = useCallback(async () => {
  if (!runId || processStatus !== 'FAILED') return;
  
  console.log('[Flow2Monitor] Finish clicked - packaging and resetting');
  
  // Step 1: Trigger package download
  try {
    await downloadApprovalPackage(runId, checkpointMetadata);
  } catch (error) {
    console.error('[Flow2Monitor] Package download failed:', error);
    // Continue with reset even if download fails
  }
  
  // Step 2: Reset workspace
  if (onStartNewReview) {
    onStartNewReview();
  }
}, [runId, processStatus, checkpointMetadata, onStartNewReview]);
```

#### 5.2: Implement Package Download Function

**New File:** `app/lib/flow2/packageApprovalData.ts`

```typescript
/**
 * Package full approval trace + evidence for download
 * 
 * Creates a deterministic JSON package containing:
 * - Document metadata
 * - Full graph trace (all nodes + statuses + timestamps)
 * - Topic summaries
 * - Evidence dashboard artifacts (if demo)
 * - Approval decisions (stage 1 + EDD)
 * - Final outcome
 */

export interface ApprovalPackage {
  packageVersion: '1.0';
  generatedAt: string;
  documentId: string;
  
  // Documents
  documents: {
    count: number;
    filenames: string[];
    totalSizeBytes?: number;
  };
  
  // Graph execution trace
  graphTrace: {
    graphId: string;
    version: string;
    runId: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
    
    // Node execution history
    nodes: Array<{
      nodeId: string;
      nodeName: string;
      status: 'executed' | 'failed' | 'skipped' | 'waiting';
      startedAt?: string;
      endedAt?: string;
      durationMs?: number;
      decision?: string;
      metadata?: any;
    }>;
  };
  
  // Risk assessment results
  riskAssessment: {
    overallLevel: 'low' | 'medium' | 'high' | 'critical';
    signals: Array<{
      category: string;
      severity: string;
      title: string;
      detail: string;
    }>;
  };
  
  // Topic summaries (LLM-generated)
  topicSummaries: Array<{
    topic_id: string;
    title: string;
    coverage: string;
    bullets: string[];
    evidence?: any[];
  }>;
  
  // Evidence dashboard (demo-only)
  evidenceDashboard?: {
    triggered: boolean;
    findings: any[];
    evidenceSummary?: string;
  };
  
  // Approval decisions
  approvals: {
    stage1: {
      decision: 'approve' | 'reject';
      decidedBy: string;
      decidedAt: string;
      comment?: string;
    };
    edd?: {
      decision: 'approve' | 'reject';
      decidedBy: string;
      decidedAt: string;
      comment?: string;
    };
  };
  
  // Final outcome
  finalOutcome: {
    status: 'COMPLETE' | 'FAILED';
    decision: 'approved' | 'rejected' | 'approved_with_edd';
    reason?: string;
    completedAt: string;
  };
}

export async function createApprovalPackage(
  runId: string,
  checkpointMetadata: any
): Promise<ApprovalPackage> {
  // Fetch full checkpoint data
  const response = await fetch(`/api/flow2/approvals/poll?run_id=${runId}`);
  const data = await response.json();
  
  // Build package (deterministic)
  const pkg: ApprovalPackage = {
    packageVersion: '1.0',
    generatedAt: new Date().toISOString(),
    documentId: runId,
    
    documents: {
      count: checkpointMetadata?.document_count || 0,
      filenames: checkpointMetadata?.documents?.map((d: any) => d.filename) || [],
    },
    
    graphTrace: {
      graphId: 'flow2_kyc_v1',
      version: '1.0.0',
      runId: runId,
      startedAt: checkpointMetadata?.created_at || '',
      completedAt: checkpointMetadata?.decided_at || new Date().toISOString(),
      durationMs: 0,  // Calculate if timestamps available
      nodes: extractNodeHistory(data.checkpoint_metadata?.graph_state),
    },
    
    riskAssessment: extractRiskData(data.checkpoint_metadata?.graph_state),
    
    topicSummaries: data.checkpoint_metadata?.topic_summaries || [],
    
    approvals: {
      stage1: {
        decision: checkpointMetadata?.decision || 'approve',
        decidedBy: checkpointMetadata?.decided_by || 'Unknown',
        decidedAt: checkpointMetadata?.decided_at || '',
        comment: checkpointMetadata?.decision_comment,
      },
      edd: checkpointMetadata?.edd_stage ? {
        decision: checkpointMetadata.edd_stage.decision,
        decidedBy: checkpointMetadata.edd_stage.decided_by || 'Unknown',
        decidedAt: checkpointMetadata.edd_stage.decided_at || '',
      } : undefined,
    },
    
    finalOutcome: {
      status: checkpointMetadata?.reviewProcessStatus || 'FAILED',
      decision: checkpointMetadata?.final_decision || 'rejected',
      reason: checkpointMetadata?.failureReason,
      completedAt: checkpointMetadata?.decided_at || new Date().toISOString(),
    },
  };
  
  // Add evidence dashboard if demo mode
  if (checkpointMetadata?.demo_evidence) {
    pkg.evidenceDashboard = {
      triggered: true,
      findings: checkpointMetadata.demo_evidence.findings || [],
      evidenceSummary: checkpointMetadata.demo_evidence.evidence_summary,
    };
  }
  
  return pkg;
}

export function downloadApprovalPackage(
  runId: string,
  checkpointMetadata: any
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const pkg = await createApprovalPackage(runId, checkpointMetadata);
      
      // Serialize to JSON
      const jsonString = JSON.stringify(pkg, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `approval-package_${runId.slice(0, 8)}_${timestamp}.json`;
      
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`[ApprovalPackage] Downloaded: ${filename}`);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// Helper: Extract node execution history from graph_state
function extractNodeHistory(graphState: any): any[] {
  if (!graphState?.trace?.events) return [];
  
  return graphState.trace.events.map((event: any) => ({
    nodeId: event.node || event.nodeId,
    nodeName: event.node || event.nodeId,
    status: event.status || 'executed',
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    durationMs: event.durationMs,
    decision: event.decision,
    metadata: event.metadata || event.reason,
  }));
}

// Helper: Extract risk data
function extractRiskData(graphState: any): any {
  const issues = graphState?.issues || [];
  const riskIssues = issues.filter((i: any) => i.category === 'kyc_risk');
  
  return {
    overallLevel: determineOverallRisk(riskIssues),
    signals: riskIssues.map((i: any) => ({
      category: i.category,
      severity: i.severity,
      title: i.message || i.title,
      detail: i.detail || '',
    })),
  };
}

function determineOverallRisk(issues: any[]): 'low' | 'medium' | 'high' | 'critical' {
  if (issues.some(i => i.severity === 'critical' || i.severity === 'high')) return 'high';
  if (issues.some(i => i.severity === 'medium' || i.severity === 'warning')) return 'medium';
  return 'low';
}
```

**Import in Flow Monitor:**
```typescript
import { downloadApprovalPackage } from '@/app/lib/flow2/packageApprovalData';
```

---

## D) TEST PLAN

### D.1: Unit Tests

**New File:** `tests/lib/flow2/packageApprovalData.test.ts`

```typescript
import { createApprovalPackage, downloadApprovalPackage } from '@/app/lib/flow2/packageApprovalData';

describe('createApprovalPackage', () => {
  it('should create valid package structure', async () => {
    const mockMetadata = {
      created_at: '2026-01-01T00:00:00Z',
      decided_at: '2026-01-01T01:00:00Z',
      decision: 'reject',
      reviewProcessStatus: 'FAILED',
      failureReason: 'EDD review rejected',
      document_count: 3,
    };
    
    const pkg = await createApprovalPackage('test-run-id', mockMetadata);
    
    expect(pkg.packageVersion).toBe('1.0');
    expect(pkg.documentId).toBe('test-run-id');
    expect(pkg.finalOutcome.status).toBe('FAILED');
    expect(pkg.finalOutcome.reason).toBe('EDD review rejected');
  });
  
  it('should include EDD approval if present', async () => {
    const mockMetadata = {
      decision: 'reject',
      edd_stage: {
        decision: 'approve',
        decided_by: 'edd@example.com',
        decided_at: '2026-01-01T02:00:00Z',
      },
    };
    
    const pkg = await createApprovalPackage('test-run-id', mockMetadata);
    
    expect(pkg.approvals.edd).toBeDefined();
    expect(pkg.approvals.edd?.decision).toBe('approve');
  });
});

describe('downloadApprovalPackage', () => {
  it('should trigger browser download', async () => {
    // Mock Blob and URL.createObjectURL
    global.Blob = jest.fn((content, options) => ({ content, options })) as any;
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();
    const mockClick = jest.fn();
    
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;
    
    jest.spyOn(document, 'createElement').mockReturnValue({
      click: mockClick,
    } as any);
    
    await downloadApprovalPackage('test-run', {});
    
    expect(mockClick).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
  });
});
```

### D.2: API Tests

**New File:** `tests/api/flow2-approvals-submit.test.ts`

```typescript
import { POST } from '@/app/api/flow2/approvals/submit/route';

describe('POST /api/flow2/approvals/submit', () => {
  it('should reject request with "decision" instead of "action"', async () => {
    const req = new Request('http://localhost/api/flow2/approvals/submit', {
      method: 'POST',
      body: JSON.stringify({
        token: 'test-token-12345678901234567890',
        decision: 'approve',  // Wrong field name
        signer: 'Test',
      }),
    });
    
    const res = await POST(req as any);
    const data = await res.json();
    
    // Should fail validation because 'action' is missing
    expect(res.status).toBe(400);
    expect(data.error_code).toBe('INVALID_ACTION');
  });
  
  it('should accept request with correct "action" field', async () => {
    // Mock checkpoint store
    jest.mock('@/app/lib/flow2/checkpointStore');
    jest.mock('@/app/lib/flow2/submitDecision');
    
    const req = new Request('http://localhost/api/flow2/approvals/submit', {
      method: 'POST',
      body: JSON.stringify({
        token: 'test-token-12345678901234567890',
        action: 'approve',  // Correct field name
        signer: 'Test',
      }),
    });
    
    const res = await POST(req as any);
    const data = await res.json();
    
    expect(res.status).toBe(200);  // Or 404 if mock not set up
  });
});
```

### D.3: Manual Test Scenarios

#### Scenario 1: Case1 Approve (Stage 1)
1. Start Flow2 KYC review with documents
2. Wait for "waiting_human" status
3. Check server logs for email sent confirmation
4. Copy approve link from `.local/flow2-checkpoints/{run_id}.json` or email
5. Open link in browser: `/flow2/approve?token=...`
6. **Expected:**
   - Loading spinner appears
   - "Workflow Approved!" success message
   - Auto-redirect to `/document?flow=2&docKey={run_id}`
   - Document page shows "APPROVED & COMPLETED" (or waiting for EDD if rejected)

#### Scenario 2: Case1 Reject (Stage 1)
1. Click reject link from email
2. Fill out rejection reason (min 10 chars)
3. Submit
4. **Expected:**
   - Success message
   - Redirect to document page
   - EDD review email sent
   - Flow Monitor shows stage 5 (EDD Review) highlighted

#### Scenario 3: EDD Approve
1. After Stage 1 reject, open EDD approve link
2. Check checkbox "I have reviewed..."
3. Click "Approve EDD & Continue"
4. **Expected:**
   - Success message
   - Redirect to `/document?flow=2&docKey={run_id}`
   - Flow Monitor shows stage 6 (Final Report) complete
   - Status badge: "✅ APPROVED & COMPLETED"

#### Scenario 4: EDD Reject (FAILURE PATH)
1. After Stage 1 reject, open EDD reject link
2. Fill out rejection reason
3. Submit
4. **Expected:**
   - Success message
   - Redirect to `/document?flow=2&docKey={run_id}&status=failed`
   - Flow Monitor shows "❌ REVIEW PROCESS FAILED" badge
   - Failure details box shows reason
   - Button label: "✓ Finish & Download Package" (not "Start New Review")

#### Scenario 5: Finish After Failure
1. From failed state (Scenario 4), click "Finish & Download Package"
2. **Expected:**
   - Browser downloads `approval-package_{run_id}_{timestamp}.json`
   - JSON contains full trace, evidence, decisions
   - Page resets to clean state (empty workspace)
   - Flow Monitor shows "idle" status
   - Button label back to "Start New Review"

### D.4: E2E Tests (if Playwright exists)

**New File:** `tests/e2e/flow2-approval-links.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Flow2 Approval Links', () => {
  test('Stage 1 approve link redirects to completed document page', async ({ page }) => {
    // Setup: Create a test checkpoint with known token
    const testToken = 'e2e-test-token-1234567890123456';
    // ... create checkpoint via API ...
    
    // Navigate to approve link
    await page.goto(`http://localhost:3000/flow2/approve?token=${testToken}`);
    
    // Wait for success message
    await expect(page.locator('text=Workflow Approved!')).toBeVisible();
    
    // Wait for redirect
    await page.waitForURL(/\/document\?flow=2&docKey=/);
    
    // Verify Flow Monitor shows complete status
    await expect(page.locator('text=APPROVED & COMPLETED')).toBeVisible();
  });
  
  test('EDD reject link shows failure state with Finish button', async ({ page }) => {
    const testToken = 'e2e-test-edd-reject-token-123456';
    // ... create EDD checkpoint via API ...
    
    await page.goto(`http://localhost:3000/flow2/edd/reject?token=${testToken}`);
    
    // Fill reject form
    await page.fill('textarea[placeholder*="reason"]', 'Test rejection reason for e2e');
    await page.click('button:has-text("Submit Rejection")');
    
    // Wait for redirect
    await page.waitForURL(/\/document\?flow=2&docKey=.*&status=failed/);
    
    // Verify failure state
    await expect(page.locator('text=REVIEW PROCESS FAILED')).toBeVisible();
    await expect(page.locator('button:has-text("Finish & Download Package")')).toBeVisible();
  });
  
  test('Finish button downloads package and resets', async ({ page }) => {
    // Navigate to failed state
    await page.goto('http://localhost:3000/document?flow=2&docKey=test-failed&status=failed');
    
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click Finish
    await page.click('button:has-text("Finish & Download Package")');
    
    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/approval-package_.+\.json/);
    
    // Verify reset
    await expect(page.locator('button:has-text("Start New Review")')).toBeVisible();
    await expect(page.locator('text=REVIEW PROCESS FAILED')).not.toBeVisible();
  });
});
```

---

## E) ACCEPTANCE CRITERIA MAPPING

### R1: Fix Case1 Human Review Approve Link

**AC1.1:** Clicking approve link successfully submits approval  
✅ **Test:** Manual Scenario 1 + E2E test 1  
✅ **Fix:** Module 1 (field name change `decision` → `action`)

**AC1.2:** After approval, redirect to document page showing COMPLETE  
✅ **Test:** Manual Scenario 1  
✅ **Fix:** Module 1 + Module 3.3 (pass `reviewProcessStatus` to monitor)

**AC1.3:** Invalid/expired token shows friendly error with "Go to Document Page" button  
✅ **Test:** Manual test with fake token  
✅ **Already works:** `app/flow2/approve/page.tsx` line 79-92

### R2: Verify and Fix EDD Approve/Reject Flows

**AC2.1:** EDD approve link works correctly  
✅ **Test:** Manual Scenario 3  
✅ **Verification:** Check current code (likely already works based on commit history)

**AC2.2:** EDD reject marks process as FAILED  
✅ **Test:** Manual Scenario 4 + E2E test 2  
✅ **Fix:** Module 2.1 (add `reviewProcessStatus = 'FAILED'` to checkpoint)

**AC2.3:** EDD reject redirects to document page with failure banner  
✅ **Test:** Manual Scenario 4  
✅ **Fix:** Module 2.2 (add `status=failed` URL param) + Module 3.2 (render failure badge)

**AC2.4:** Historical node status preserved (red/yellow not green-washed)  
✅ **Test:** Visual inspection after EDD reject  
✅ **Already works:** `demoNodeStatusPolicy.ts` already implements this (commit e9a4c32)

### R3: Document Page "Finish" Behavior After Failure

**AC3.1:** When FAILED, button label shows "Finish & Download Package"  
✅ **Test:** Manual Scenario 4, E2E test 2  
✅ **Fix:** Module 4.1 (conditional rendering based on `processStatus`)

**AC3.2:** Clicking Finish downloads approval package JSON  
✅ **Test:** Manual Scenario 5, E2E test 3, Unit tests in D.1  
✅ **Fix:** Module 5 (new `packageApprovalData.ts` + download trigger)

**AC3.3:** Package contains full trace, evidence, decisions, timestamps  
✅ **Test:** Manual inspection of downloaded JSON, Unit tests  
✅ **Fix:** Module 5.2 (`ApprovalPackage` interface + `createApprovalPackage()`)

**AC3.4:** Clicking Finish resets workspace to clean state  
✅ **Test:** Manual Scenario 5, E2E test 3  
✅ **Fix:** Module 5.1 (call `onStartNewReview()` after download)

**AC3.5:** Package generation is deterministic (no external services)  
✅ **Test:** Unit tests with mocked data  
✅ **Fix:** Module 5.2 (all data from in-memory state or API, no external deps)

---

## F) FILES TO BE CHANGED (SUMMARY)

### Core Fixes (Critical)
1. ✅ `app/flow2/approve/page.tsx` - Fix field name `decision` → `action`
2. ✅ `app/api/flow2/edd/submit/route.ts` - Add `reviewProcessStatus = 'FAILED'` on reject
3. ✅ `app/flow2/edd/reject/page.tsx` - Add `status=failed` URL param on redirect
4. ✅ `app/lib/flow2/checkpointTypes.ts` - Extend `CheckpointMetadata` with process status fields

### UI Updates (High Priority)
5. ✅ `app/components/flow2/Flow2MonitorPanel.tsx` - Add FAILED badge, conditional Finish button, handleFinish
6. ✅ `app/document/page.tsx` - Add `reviewProcessStatus` state, pass to monitor

### New Feature (Finish + Package)
7. ✅ `app/lib/flow2/packageApprovalData.ts` - **NEW FILE** - Package creation + download logic

### Tests (Validation)
8. ✅ `tests/lib/flow2/packageApprovalData.test.ts` - **NEW FILE** - Unit tests for packaging
9. ✅ `tests/api/flow2-approvals-submit.test.ts` - **NEW FILE** - API validation tests
10. ✅ `tests/e2e/flow2-approval-links.spec.ts` - **NEW FILE** - E2E approval flows

### Documentation
11. ✅ `docs/PLAN_fix_email_approval_and_failure_finish.md` - **THIS FILE**

---

## G) ROLLOUT STRATEGY & RISK MITIGATION

### Rollout Phases

**Phase 1: Critical Fixes (Deploy First)**
- Module 1: Fix Case1 approve field name
- Module 2.1: EDD reject failure marking
- Low risk, high impact

**Phase 2: UI State Updates**
- Module 3: Process status model
- Module 4: Conditional button label
- Medium risk (UI changes)

**Phase 3: Finish Feature**
- Module 5: Package download + reset
- Higher complexity, but self-contained

### Risk Mitigation

**Risk 1: Breaking Flow1**  
✅ **Mitigation:** All changes are Flow2-specific (gated by `isFlow2` checks)  
✅ **Validation:** Flow1 sections/batch review unaffected

**Risk 2: Breaking Non-Demo Flow2**  
✅ **Mitigation:** `reviewProcessStatus` is optional field (backward compatible)  
✅ **Validation:** Existing checkpoints without new fields still work

**Risk 3: Download Fails in Some Browsers**  
✅ **Mitigation:** Graceful error handling (download fails → still reset workspace)  
✅ **Fallback:** User can still see data on screen, manual copy/paste

**Risk 4: Package Too Large**  
✅ **Mitigation:** JSON is text-based, gzipped by browser if > 1KB  
✅ **Limit:** Exclude full document text from package (only metadata)

### Feature Flags (Optional)

If extra safety needed, add to `.env.local`:
```bash
ENABLE_FINISH_DOWNLOAD=true  # Enable package download feature
ENABLE_FAILURE_STATE=true    # Enable FAILED status tracking
```

But given this is demo-only and self-contained, flags may be overkill.

---

## H) BACKWARD COMPATIBILITY NOTES

### ✅ Flow1 Unaffected
- No changes to Flow1 code paths
- All new logic gated by `isFlow2` checks
- Section review, batch review, sign-off unchanged

### ✅ Existing Flow2 Checkpoints Compatible
- New `reviewProcessStatus` field is **optional**
- Old checkpoints without this field → treated as `'RUNNING'` (default)
- No migration needed

### ✅ Token Index Unchanged
- Token → run_id mapping logic unchanged
- `type: 'stage1' | 'edd'` already supported

### ⚠️ Breaking Change: Case1 Approve API Contract
- **Before:** Client sent `{ decision: 'approve' }`
- **After:** Client sends `{ action: 'approve' }`
- **Impact:** Only affects `/flow2/approve` page (which was broken anyway)
- **Risk:** Low (endpoint already expected `action`, page was sending wrong field)

---

## I) OPEN QUESTIONS & DECISIONS NEEDED

### Q1: Should we add .zip support for package download?

**Options:**
- A) JSON only (simple, deterministic)
- B) .zip with JSON + original docs (better UX, requires JSZip library)

**Recommendation:** Start with JSON only (Phase 3), add .zip in future if requested.

### Q2: Should "Finish" also delete the checkpoint file?

**Options:**
- A) Keep checkpoint (allows future audit/reload)
- B) Delete checkpoint (clean up disk space)

**Recommendation:** Keep checkpoint for now (safer, allows re-opening), add cleanup API later.

### Q3: Should we email package to reviewer automatically?

**Options:**
- A) Only browser download
- B) Also email package as attachment

**Recommendation:** Browser download only (Phase 3), email later if requested.

### Q4: Should package include full document text?

**Options:**
- A) Full text (complete audit trail)
- B) Metadata only (smaller file size)

**Recommendation:** Metadata only (filenames + byte counts), exclude full text to keep size reasonable.

---

## J) NEXT STEPS (AFTER PLAN APPROVAL)

1. **Get Approval:** Wait for user to review and approve this plan
2. **Create Branch:** `git checkout -b fix/email-approval-failure-finish`
3. **Implement Phase 1:** Critical fixes (Modules 1-2)
4. **Test Phase 1:** Manual scenarios 1-4
5. **Implement Phase 2:** UI updates (Modules 3-4)
6. **Implement Phase 3:** Finish feature (Module 5)
7. **Write Tests:** Unit + API tests (Modules 8-9)
8. **Full Regression:** All manual scenarios + visual checks
9. **Commit & Document:** Clean commit messages + update AS-IS doc if needed
10. **Deploy:** Merge to main branch

---

## K) ESTIMATED EFFORT

| Phase | Modules | Effort | Risk |
|-------|---------|--------|------|
| Phase 1: Critical Fixes | 1-2 | 1-2 hours | Low |
| Phase 2: UI State | 3-4 | 2-3 hours | Medium |
| Phase 3: Finish Feature | 5 | 3-4 hours | Medium |
| Testing | 8-10 | 2-3 hours | Low |
| **Total** | | **8-12 hours** | |

---

**END OF PLAN**

**Status:** AWAITING APPROVAL  
**Next Action:** User reviews plan and approves/requests changes




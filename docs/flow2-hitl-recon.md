# Flow2 HITL Email Approval - Code Reconnaissance Report

**Date:** 2025-01-15  
**Purpose:** Document existing code structure for HITL email approval implementation

---

## 1. CHECKPOINT TYPE STRUCTURE

### File: `app/lib/flow2/checkpointTypes.ts`

**Current Fields:**
```typescript
interface Flow2Checkpoint {
  run_id: string;                    // UUID v4
  graph_id: string;                  // e.g., "flow2_kyc_v1"
  flow: 'flow2';                     // Validation marker
  current_node_id: string;           // Last completed node
  paused_at_node_id: string;         // Node awaiting human input
  graph_state: GraphState;           // Full graph execution state
  documents: Flow2Document[];        // Documents for UI display
  created_at: string;                // ISO timestamp
  paused_at: string;                 // ISO timestamp
  resumed_at?: string;               // ISO timestamp (optional)
  status: CheckpointStatus;          // 'paused' | 'resumed' | 'completed' | 'failed'
}
```

**Missing (to be added in Phase 1):**
- approval_token, approval_email_to, approval_email_sent, approval_sent_at
- approval_message_id, approval_email_subject
- reminder_email_sent, reminder_sent_at, reminder_due_at
- decision, decision_comment, decided_at, decided_by

---

## 2. GRAPHSTATE STRUCTURE

### File: `app/lib/graphKyc/types.ts`

**Key Fields for Approval Packet:**
```typescript
interface GraphState {
  // Input
  documents: { name: string; content: string }[];
  
  // Assembled
  topicSections?: TopicSection[];
  
  // Risk & routing
  riskScore?: number;              // 0-100
  routePath?: GraphPath;           // 'fast' | 'crosscheck' | 'escalate' | 'human_gate'
  triageReasons?: string[];
  
  // Execution results
  conflicts?: Conflict[];
  coverageGaps?: Coverage[];
  policyFlags?: string[];
  issues?: any[];                  // Compatible with Flow1 format
  
  // Human gate
  humanGate?: { required: boolean; prompt: string; options: string[] };
  
  // Human decision tracking
  human_approved?: boolean;
  human_rejected?: boolean;
  human_decision_ts?: string;
  human_rejection_reason?: string;
  execution_terminated?: boolean;
  
  // Trace
  trace?: GraphTraceEvent[];
}
```

**GraphTraceEvent Structure:**
```typescript
interface GraphTraceEvent {
  node: string;
  status: 'executed' | 'skipped' | 'waiting' | 'failed';
  decision?: string;
  reason?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  inputsSummary?: string;
  outputsSummary?: string;
}
```

---

## 3. FLOW2DOCUMENT STRUCTURE

### File: `app/lib/flow2/types.ts`

```typescript
interface Flow2Document {
  doc_id: string;
  filename: string;
  doc_type_hint: Flow2DocTypeHint;  // "Client Identity" | "Source of Wealth" | etc.
  text: string;                     // FULL RAW CONTENT (NEVER include in email packet)
}
```

**⚠️ CRITICAL:** `text` field contains full document content. Must NEVER be included in HTML attachment.

**Available for Packet:**
- `filename` ✅
- `doc_type_hint` ✅
- `text.length` for size estimation ✅
- NO summary field currently exists ❌ (will show "(no summary available)")

---

## 4. ORCHESTRATOR PAUSE BRANCH

### File: `app/lib/graphKyc/orchestrator.ts`

**Pause Logic Location:** Lines 286-354

**Current Flow:**
1. Execute `executeHumanReviewNode()` after parallel checks
2. If `humanReviewResult.pauseExecution === true`:
   - Create checkpoint with `status: 'paused'`
   - Save to `.local/flow2-checkpoints/{run_id}.json`
   - Return response with `status: 'waiting_human'`
3. Add trace event: `{ node: 'human_review', status: 'waiting', reason: '...' }`

**Documents Mapping:**
```typescript
documents: state.documents.map((d, idx) => ({
  doc_id: `doc-${idx}`,
  filename: d.name,
  text: d.content,
  doc_type_hint: 'kyc_form' as any
}))
```

**⚠️ Needs Modification in Phase 4:**
- Generate `approval_token` BEFORE creating checkpoint
- Send email AFTER saving checkpoint
- Update checkpoint with email metadata

---

## 5. CHECKPOINT STORE

### File: `app/lib/flow2/checkpointStore.ts`

**Storage Location:** `.local/flow2-checkpoints/{run_id}.json`

**Existing Functions:**
- `saveCheckpoint(checkpoint)` - Atomic write (temp + rename)
- `loadCheckpoint(run_id)` - Returns checkpoint or null
- `updateCheckpointStatus(run_id, status, updates)` - Partial update
- `listCheckpoints()` - Returns metadata array
- `deleteCheckpoint(run_id)` - Remove checkpoint file

**⚠️ Missing (Phase 1.5):**
- Token index for fast lookup (`.local/flow2-checkpoints/_token_index.json`)
- `getRunIdByToken(token)` helper
- `loadCheckpointByToken(token)` helper

---

## 6. EMAIL ADAPTER

### Status: ❌ DOES NOT EXIST

**Must Create in Phase 3:**
- `app/lib/email/smtpAdapter.ts`
- Use nodemailer (install as dependency)
- Functions: `sendApprovalEmail()`, `sendReminderEmail()`

**Dependencies Required:**
```bash
npm install nodemailer @types/nodemailer
```

---

## 7. EXISTING APPROVAL ENDPOINTS

### Status: ❌ NO APPROVAL ENDPOINTS EXIST

**Directory:** `app/api/flow2/` contains only:
- `topics/fuse/route.ts` (topic fusion for "More Inputs" feature)

**Must Create in Phases 5-7:**
- `app/api/flow2/approvals/poll/route.ts` (GET: polling + reminder)
- `app/api/flow2/approvals/submit/route.ts` (GET approve, POST reject)
- `app/api/flow2/approvals/verify-token/route.ts` (GET: token validation)

---

## 8. CRITICAL DATA MAPPINGS FOR APPROVAL PACKET

### Progress Milestones (Fixed for Demo Stability)
```typescript
const FIXED_MILESTONES = [
  { step_id: 'topic_assembler', label: 'Topic Assembly' },
  { step_id: 'risk_triage', label: 'Risk Triage' },
  { step_id: 'parallel_checks', label: 'Parallel Checks' },
  { step_id: 'human_review', label: 'Human Review Gate' },
  { step_id: 'finalize', label: 'Finalization' }
];
```

### Warnings Extraction (Fallback Chain)
1. `checkpoint.graph_state?.warnings` (if exists)
2. `checkpoint.graph_state.trace?.filter(e => e.status === 'warning')` (if trace exists)
3. Empty array `[]`

### Issues Extraction (Fallback Chain)
1. `checkpoint.graph_state?.issues` (primary)
2. Empty array `[]`

### Risk Score
- `checkpoint.graph_state?.riskScore` (0-100 or undefined)

### Documents Summary
- Count: `checkpoint.documents.length`
- Names: `checkpoint.documents.map(d => d.filename)`
- Sizes: `checkpoint.documents.map(d => d.text.length)` (bytes)
- ⚠️ NO summary field - use "(no summary available)"

---

## 9. IMPORT ALIAS PATTERN

**Project uses Next.js with TypeScript path aliases.**

**Correct Import Pattern:**
```typescript
// ❌ BAD (deep relative imports in routes)
import { loadCheckpoint } from '../../../lib/flow2/checkpointStore';

// ✅ GOOD (use alias)
import { loadCheckpoint } from '@/lib/flow2/checkpointStore';
```

**Verify in `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./app/*"]
    }
  }
}
```

---

## 10. NEXT STEPS

**Phase 1:** Extend checkpoint types + validation (backward compatible)  
**Phase 1.5:** Add token index to checkpointStore (performance)  
**Phase 2:** Create approvalPacket.ts (HTML builder with escaping)  
**Phase 3:** Create smtpAdapter.ts (nodemailer + attachments)  
**Phase 4:** Modify orchestrator pause branch (token generation + email send)  
**Phase 5:** Create poll endpoint (reminder exactly once + countdown)  
**Phase 6:** Create submit endpoint (GET approve, POST reject, idempotent)  
**Phase 7:** Create verify-token endpoint + reject page  
**Phase 8:** Update UI polling (countdown display)  
**Phase 9:** Test + verify

---

**END OF RECON REPORT**


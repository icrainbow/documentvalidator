# AS-IS TRACE: Flow2/Case2 Implementation Analysis

**Branch:** `fix/flow2-hitl-guarantee`  
**Last Commit:** `1bab2b5 - fix(flow2): make Start New Review button work on first click`  
**Analysis Date:** 2026-01-03  
**Query:** "Regarding the CS integration, how do we handle onboarding for a high-net-worth client from a Restricted Jurisdiction"

---

## A) HAPPY PATH SEQUENCE DIAGRAM (Text Format)

```
┌─────────────────────────────────────────────────────────────────┐
│                   CASE 2 (CS Integration Exception)             │
│                    DETERMINISTIC DEMO FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. USER INPUT (Chat)
   ├─ UI Component: app/document/page.tsx (line 3718)
   ├─ Handler: handleSendMessage() → handleFlow2ChatSubmit()
   ├─ Trigger Detection: detectCase2Trigger(userInput)
   │  └─ File: app/lib/case2/case2Trigger.ts (line 13-42)
   │  └─ Logic: Checks for ALL keyword groups:
   │     - "cs integration" OR "credit suisse integration"
   │     - "high-net-worth" OR "hnw" OR "high net worth"
   │     - "restricted jurisdiction" OR "restricted region"
   │     - "ubs" OR "united bank" AND "risk appetite"
   │  └─ Result: TRUE (all groups present in sample query)
   └─ Payload: NONE (no API call, pure client-side)

2. STATE INITIALIZATION (Client-Side Only)
   ├─ Sets: case2State = 'triggered'
   ├─ Loads: CASE2_DEMO_DATA (hardcoded)
   │  └─ File: app/lib/case2/demoCase2Data.ts
   │  └─ Contents:
   │     - sources: 3 hardcoded PPT/Confluence/Email-PDF entries
   │     - path_steps: 4 hardcoded approval steps
   │     - assistant_text: Pre-written response (not LLM-generated)
   │     - required_documents: 3 specific docs needed
   ├─ Generates: case2Id = `case2_${Date.now()}`
   └─ Transitions: case2State → 'tracing' (after 100ms timeout)

3. USER INTERACTIONS (Case 2 Specific UI)
   ├─ Component: <Case2ProcessBanner /> (app/components/case2/Case2ProcessBanner.tsx)
   ├─ States:
   │  - 'tracing': Animated retrieval of 3 sources (fake timing: 1800ms, 2400ms, 2800ms)
   │  - 'findings': Shows assistant_text + 4 path steps
   │  - 'accepted': User clicks "Accept Process"
   │  - 'files_uploaded': User uploads 3 required docs
   │  - 'files_ready': All 3 docs mapped successfully
   │  - 'started': User clicks "Start Exception Approval Flow"
   │  - 'completed': Simulated completion message
   └─ NO API CALLS: Entire flow is client-side state machine

┌─────────────────────────────────────────────────────────────────┐
│                   FLOW2 (KYC Graph Review)                      │
│                BACKEND ORCHESTRATION + HITL                     │
└─────────────────────────────────────────────────────────────────┘

4. USER UPLOADS DOCUMENTS & CLICKS "RUN KYC GRAPH REVIEW"
   ├─ UI Component: app/document/page.tsx (line 1638)
   ├─ Handler: handleGraphKycReview()
   ├─ Guards:
   │  - isFlow2 = true
   │  - case3Active = false (guardrail not triggered)
   │  - flow2Documents.length > 0
   ├─ Request:
   │  POST /api/orchestrate
   │  Body: {
   │    mode: 'langgraph_kyc',
   │    documents: [{ name, content }],
   │    // NO humanDecision (initial run)
   │  }
   └─ Sets: isOrchestrating = true, flowMonitorStatus = 'running'

5. BACKEND ORCHESTRATION (/api/orchestrate → orchestrator.ts)
   ├─ Entry: app/lib/graphKyc/orchestrator.ts::runGraphKycReview() (line 82)
   ├─ Mode: 'run' (fresh execution, not resume)
   ├─ Generates: run_id = randomUUID()
   └─ Graph Flow:
   
   5.1) NODE: topic_assembler
        ├─ Function: assembleTopics() (app/lib/graphKyc/topicAssembler.ts)
        ├─ Input: state.documents (uploaded by user)
        ├─ Logic: DETERMINISTIC - Uses mock/demo KYC topics
        ├─ Output: topicSections[] (10 predefined KYC topics)
        └─ Topics: ['client_identity', 'source_of_wealth', 'source_of_funds',
                   'ownership_ubo_control', 'business_activity_profile',
                   'geography_jurisdiction_risk', 'sanctions_pep_adverse_media',
                   'account_product_risk', 'transaction_patterns_red_flags',
                   'ongoing_monitoring_reporting']
   
   5.2) NODE: risk_triage
        ├─ Function: triageRisk() (app/lib/graphKyc/riskTriage.ts)
        ├─ Input: topicSections[]
        ├─ Logic: DETERMINISTIC - Fixed routing based on document count
        │  └─ Route: 'standard' | 'edd' | 'expedited'
        │  └─ For demo: Usually returns 'edd' route
        ├─ Output: { routePath: 'edd', score: X }
        └─ Determines: Which parallel checks to run
   
   5.3) NODE: parallel_checks
        ├─ Function: executeParallelChecks() (app/lib/graphKyc/executor.ts)
        ├─ Input: topicSections[], routePath
        ├─ Skills Invoked (in parallel):
        │  - conflict_sweep: Detect contradictions
        │  - gap_collector: Find missing info
        │  - policy_flag: Check compliance violations
        └─ Output: { conflicts[], coverageGaps[], policyIssues[] }
        
   5.4) NODE: human_review (HITL GATE - PAUSE POINT)
        ├─ File: app/lib/graphKyc/nodes/humanReviewNode.ts::executeHumanReviewNode() (line ~50)
        ├─ Function: assessKYCRisks() (app/lib/graphKyc/riskAssessment.ts)
        ├─ Input: topicSections[], conflicts[], gaps[]
        ├─ Logic: DETERMINISTIC - Maps issues to risk signals
        │  └─ Severity: 'high' | 'medium' | 'low'
        │  └─ If ANY high/medium risk: Pause for human approval
        ├─ Decision: PAUSE = true (because risks detected)
        └─ Checkpoint Creation:
           ├─ File: app/lib/flow2/checkpointStore.ts::saveCheckpoint()
           ├─ Location: .local/flow2-checkpoints/{run_id}.json
           ├─ Contents: {
           │    run_id, graph_id, flow: 'flow2',
           │    current_node_id: 'parallel_checks',
           │    paused_at_node_id: 'human_review',
           │    graph_state: { ...full state },
           │    documents: [...original docs],
           │    status: 'paused',
           │    approval_token: '32-char-hex',
           │    approval_email_to: 'shenyanran@gmail.com' (from env),
           │    approval_email_sent: false (set to true after email)
           │  }

6. EMAIL SENDING (Stage 1 - Human Review)
   ├─ Trigger: After checkpoint saved (orchestrator.ts line ~430)
   ├─ Function: sendApprovalEmail() (app/lib/email/smtpAdapter.ts line 46)
   ├─ SMTP Config: From .env.local
   │  - SMTP_HOST=smtp.gmail.com
   │  - SMTP_PORT=465
   │  - SMTP_USER=shenyanran@gmail.com
   │  - SMTP_PASS=mvakuzfiigswirap (App Password)
   ├─ Email Body: HTML with:
   │  - Issues summary (from graph_state.issues)
   │  - Topic summaries (generated via LLM - see step 6.5)
   │  - Attached documents (original user uploads as .txt files)
   │  - Approve/Reject buttons with token links
   └─ Buttons:
      - Approve: /flow2/approve?token={approval_token}
      - Reject: /flow2/reject?token={approval_token}

   6.5) TOPIC SUMMARIES GENERATION (LLM-BASED)
        ├─ Trigger: After human_review pause (document/page.tsx line 1766)
        ├─ API: POST /api/flow2/topic-summaries
        │  └─ File: app/api/flow2/topic-summaries/route.ts
        ├─ Input:
        │  - run_id
        │  - documents: [...flow2Documents, ...demoEvidenceDocs (if demo)]
        │  - topics: KYC_TOPIC_IDS (10 topics)
        │  - risks: mapIssuesToRiskInputs(issues)
        ├─ LLM Call: Anthropic Claude (via app/lib/topicSummaries/...)
        │  └─ Prompt: Structured extraction for each topic
        │  └─ Output: { topic_id, title, coverage: 'PRESENT'|'WEAK'|'ABSENT',
        │              bullets: [], evidence: [], linked_risks: [] }
        └─ Result: Saved to checkpoint.topic_summaries (for email inclusion)

7. FRONTEND RESPONSE (Paused State)
   ├─ Response: { status: 'waiting_human', run_id, checkpoint_metadata, issues[], ... }
   ├─ UI Updates:
   │  - flowMonitorStatus = 'waiting_human'
   │  - Flow Monitor Panel: Shows stages with stage 4 highlighted (Human Review)
   │  - Topic Summaries Panel: Displays generated summaries
   │  - Messages: "⏸️ Workflow Paused for Human Review"
   └─ Polling: Starts (every 5s) → GET /api/flow2/approvals/poll?run_id={run_id}

8. HUMAN DECISION (Email Click)
   ├─ User clicks "❌ Reject" in email
   ├─ Browser: GET /flow2/reject?token={approval_token}
   ├─ Page: app/flow2/reject/page.tsx
   ├─ Logic:
   │  - Validates token
   │  - Shows rejection form (optional comment)
   │  - Submits: POST /api/flow2/approvals/submit
   │     Body: { approval_token, decision: 'reject', comment: '...' }
   │  - API updates checkpoint: decision = 'reject', status = 'paused'
   │  - Triggers EDD sub-review (Phase 8 - Post-Reject Analysis)
   └─ Redirects: /document?flow=2&docKey={run_id}

9. EDD SUB-REVIEW (Stage 2 - Enhanced Due Diligence)
   ├─ Trigger: Checkpoint status = 'paused' + decision = 'reject'
   ├─ Backend: app/lib/flow2/eddSubReview.ts::triggerEddSubReview()
   ├─ Logic: DETERMINISTIC DEMO
   │  └─ File: app/lib/flow2/demoEddGenerator.ts
   │  └─ Generates: {
   │       findings: 3 hardcoded findings (wealth source, UBO, policy),
   │       evidence_summary: Pre-written text,
   │       graph_patch: Fake node injection for demo
   │     }
   ├─ Checkpoint Update: edd_stage = { status: 'waiting_edd_approval', ... }
   └─ Email: sendEddApprovalEmail() (similar to stage 1)

10. FRONTEND POST-REJECT ANIMATION (Phase 8)
    ├─ Component: <PostRejectAnalysisPanel /> (app/components/flow2/PostRejectAnalysisPanel.tsx)
    ├─ Trigger: data.triggered = true (from checkpoint metadata)
    ├─ Animation Sequence (fake concurrency):
    │  - Tasks: De-obfuscation (A/B/C) - 600ms
    │  - Skills: 3 parallel skills (wealth, offshore, policy) - 1500ms each
    │  - Findings: Highlight 3 EDD findings
    │  - Evidence: Show evidence dashboard (deterministic)
    ├─ Data Source: GET /api/flow2/demo/post-reject-analysis?run_id={run_id}
    │  └─ Returns: Hardcoded demoEddOutputs
    └─ Completion: Appends findings to topic summaries (handlePhase8Complete)

11. EDD APPROVAL (Stage 2 Complete)
    ├─ User clicks "✅ Approve EDD & Continue" in email
    ├─ Browser: GET /flow2/edd/approve?token={approval_token}
    ├─ Page: app/flow2/edd/approve/page.tsx
    ├─ API: POST /api/flow2/edd/submit
    │  Body: { approval_token, decision: 'approve' }
    ├─ Checkpoint Update:
    │  - edd_stage.decision = 'approve'
    │  - edd_stage.status = 'approved'
    │  - final_decision = 'approved_with_edd'
    │  - status = 'completed'
    └─ Redirects: /document?flow=2&docKey={run_id}

12. FINAL STATE (Fully Completed)
    ├─ Flow Monitor: currentStageIndex = 6 (Final Report)
    ├─ Status Badge: "✅ APPROVED & COMPLETED"
    ├─ All stages: Green (except historical red/yellow for rejected/warnings)
    ├─ Button: "Start New Review" (resets entire workspace)
    └─ User can download/export results (not implemented)

```

---

## B) STAGE MAPPING TABLE

| Stage Name | Stage ID | Status Source | UI Component | API Involved | Deterministic? | Notes |
|------------|----------|---------------|--------------|--------------|----------------|-------|
| **Document Analysis** | 1 | `currentStageIndex >= 1` | Flow2MonitorPanel.tsx (line 52) | None | Yes | Completed when documents uploaded |
| **Risk Assessment** | 2 | `orchestrator.ts::triageRisk()` | Flow2MonitorPanel.tsx + Flow2RiskDetailsPanel.tsx | POST /api/orchestrate | Yes (demo) | Color: Red/Yellow/Green based on riskLevel |
| **Compliance Review** | 3 | `orchestrator.ts::executeParallelChecks()` | Flow2MonitorPanel.tsx | POST /api/orchestrate | Yes (demo) | Runs conflict/gap/policy checks |
| **Human Review** | 4 | `humanReviewNode.ts::executeHumanReviewNode()` | Flow2MonitorPanel.tsx | POST /api/orchestrate → pause | No (human) | HITL Gate - pauses for email approval |
| **EDD Review** | 5 | `eddStage.status === 'waiting_edd_approval'` | Flow2MonitorPanel.tsx + PostRejectAnalysisPanel.tsx | POST /api/flow2/edd/submit | Yes (demo) | Only if Stage 4 rejected |
| **Final Report** | 6 | `currentStageIndex === 6` | Flow2MonitorPanel.tsx | None | N/A | Virtual stage - represents completion |

**Stage Status Calculation Logic:**
- **Source File:** `app/components/flow2/Flow2MonitorPanel.tsx::getCurrentStageIndex()` (line 61-91)
- **Algorithm:**
  ```typescript
  switch (status) {
    case 'idle': return 0;
    case 'running': return 2;
    case 'waiting_human':
      if (eddStage && eddStage.status === 'waiting_edd_approval') return 5;
      return 4;
    case 'resuming': return eddStage ? 5 : 4;
    case 'completed': 
      if (eddStage && eddStage.decision === 'approve') return 6;
      return 6;
    case 'rejected':
      if (eddStage && eddStage.decision === 'approve') return 6; // Override
      if (eddStage && eddStage.status === 'rejected') return 5;
      return 4;
  }
  ```

**Historical Color Preservation (DEMO-ONLY):**
- **Source File:** `app/lib/flow2/demoNodeStatusPolicy.ts::applyFlow2DemoNodeStatusPolicy()` (line 34-90)
- **Rules:**
  1. Human Review (Stage 4): If ever rejected → stays RED
  2. Risk Assessment (Stage 2): If warnings → stays YELLOW; if high risk → stays RED
  3. Other stages: Follow default logic (green if complete, gray if not run)
- **Detection:** `isFlow2DemoMode(checkpointMetadata)` checks for:
  - `demo_mode = true`
  - OR `edd_stage` exists (proof of rejection)
  - OR `demo_evidence` exists

---

## C) SAMPLE INPUT TEXT BEHAVIOR ANALYSIS

**Input:** "Regarding the CS integration, how do we handle onboarding for a high-net-worth client from a Restricted Jurisdiction"

### What Happens:

1. **Trigger Detection:** ✅ YES
   - Matched Groups:
     - ✓ "cs integration"
     - ✓ "high-net-worth"
     - ✓ "restricted jurisdiction"
     - ✗ "ubs" (NOT in query) → **FAILS**
     - ✗ "risk appetite" (NOT in query) → **FAILS**
   - **Result:** `detectCase2Trigger()` returns **FALSE**
   - **Outcome:** Case 2 NOT triggered!

2. **Fallback Behavior:**
   - Falls through to default Flow2 chat handler (line 3704)
   - Response: "Flow2 mode active. You can ask about CS integration, restricted jurisdictions, or high-net-worth client exceptions to trigger Case 2 analysis."
   - **No workflow created**
   - **No data analyzed**

### To Actually Trigger Case 2:

User must say:
> "Regarding the CS integration, how do we handle onboarding for a high-net-worth client from a Restricted Jurisdiction **when UBS risk appetite conflicts with legacy rules**?"

OR:
> "For CS integration, what's the process for **high-net-worth** clients in **restricted jurisdictions** given **UBS and Credit Suisse risk appetite** differences?"

### What Data is "Analyzed" (if Case 2 triggers):

**Source:** `app/lib/case2/demoCase2Data.ts` (line 36-122)

1. **3 Hardcoded Sources (NOT real retrieval):**
   - PPT: "CS Integration: Wealth Management Market Strategy 2025"
   - Confluence: "Legacy CS Risk Policy – Section 4.2"
   - Email-PDF: "Policy Memo: Risk Alignment Post-Merger"
   
2. **4 Hardcoded Path Steps (NOT agent-generated):**
   - Data Gap Remediation (retrieve CS archives)
   - LOD1 Validation (Strategic Value Waiver)
   - Joint Steering Committee Review
   - Group Head Final Approval

3. **Pre-written Assistant Text (NOT LLM-generated):**
   - 600+ character response with business recommendations
   - References to specific policy docs (fake IDs)

**Agent Does NOT:**
- Retrieve from real Confluence/SharePoint
- Query any vector database
- Call any LLM for analysis
- Access any real CS integration docs
- Perform any actual risk analysis

**Agent DOES:**
- Show animated "retrieval" UI (fake timing delays)
- Display hardcoded content as if retrieved
- Present as if analyzed, but it's static demo data

---

## D) GAPS vs INTENDED DEMO STORY

### Intended Narrative:
> "Agent intelligently retrieves relevant policies from multiple sources (PPT, Confluence, internal emails), analyzes the complex CS integration scenario, identifies the correct approval path considering UBS vs CS risk appetite conflicts, and provides actionable guidance."

### Actual Implementation:

| Component | Intended (Demo Story) | Actual (As-Is Code) | Gap |
|-----------|----------------------|---------------------|-----|
| **Policy Retrieval** | Agent searches 1000s of docs | 3 hardcoded strings in `demoCase2Data.ts` | No real retrieval, search, or RAG |
| **Analysis** | AI determines approval path | Pre-written `assistant_text` | No LLM involved, no reasoning |
| **Path Steps** | Agent reasons about process | 4 hardcoded steps with fake references | No dynamic generation |
| **Source Timing** | Real API latency simulation | `setTimeout()` with fixed delays (1800/2400/2800ms) | Fake "loading" UX |
| **Document Requirements** | AI identifies needed docs | Hardcoded list of 3 docs | No intelligence |
| **Approval Flow Start** | Backend workflow initiated | Client-side state change only | No backend integration |

### What's Simulated (Deterministic):

1. **Case 2 Trigger Detection:** Real keyword matching (deterministic rules)
2. **Source "Retrieval":** Fake async delays + static content
3. **Assistant Response:** Pre-written text (no LLM)
4. **Document Upload Mapping:** Simple filename pattern matching
5. **Process States:** Client-side state machine (no backend)

### What's Missing for Real "Agent Analysis":

1. **Vector DB / RAG:**
   - No embeddings of policies
   - No semantic search
   - No retrieval pipeline
   
2. **LLM Reasoning:**
   - No prompt engineering for analysis
   - No structured output parsing
   - No agent tools/function calling
   
3. **Backend Workflow:**
   - No approval tracking in database
   - No escalation routing
   - No integration with actual systems
   
4. **Real Data Sources:**
   - No Confluence connector
   - No SharePoint integration
   - No email search

5. **Dynamic Content:**
   - Response identical for ANY matching query
   - Cannot adapt to variations
   - No context awareness

### Bridge Between Case 2 and Flow2:

**Reality:** NONE. They are completely separate.

- Case 2: Triggers if specific keywords detected → Shows demo UI → Client-side only
- Flow2: Triggers on "Run KYC Graph Review" button → Backend orchestration → Checkpoint/email workflow

**User Confusion Potential:**
- User might think Case 2 feeds into Flow2
- User might expect documents uploaded to Case 2 to be used by Flow2 graph
- **Actual:** No data transfer between Case 2 and Flow2
- **Workaround:** User must upload docs separately for Flow2 KYC review

---

## E) DEBUG LOG RECOMMENDATIONS (Not Implemented Yet)

### If Adding Debug Logs (Guarded by DEMO Flag):

```typescript
// In app/lib/case2/case2Trigger.ts
export function detectCase2Trigger(input: string): boolean {
  const normalized = input.toLowerCase().trim();
  const DEBUG = process.env.NEXT_PUBLIC_CASE2_DEBUG === 'true';
  
  if (DEBUG) {
    console.log('[Case2Debug] Input:', input);
    console.log('[Case2Debug] Checking keyword groups...');
    keywordGroups.forEach((group, idx) => {
      const matched = group.some(kw => normalized.includes(kw));
      console.log(`  Group ${idx+1}: ${matched ? '✓' : '✗'} (${group.join('|')})`);
    });
    console.log(`[Case2Debug] Risk appetite: ${hasRiskAppetite ? '✓' : '✗'}`);
  }
  
  return allGroupsPresent && hasRiskAppetite;
}

// In app/document/page.tsx (handleFlow2ChatSubmit)
if (detectCase2Trigger(userInput)) {
  if (process.env.NEXT_PUBLIC_CASE2_DEBUG === 'true') {
    console.log('[Case2Debug] TRIGGERED - Loading demo data');
    console.log('[Case2Debug] Data:', CASE2_DEMO_DATA);
  }
  // ... rest of logic
}

// In app/lib/graphKyc/orchestrator.ts (runGraphKycReview)
if (process.env.DEBUG_ORCHESTRATOR === 'true') {
  console.log('[OrchestratorDebug] Node:', nodeId);
  console.log('[OrchestratorDebug] State:', JSON.stringify(flow2State, null, 2));
  console.log('[OrchestratorDebug] Checkpoint saved:', checkpoint.run_id);
}
```

### Where to Add Logs:

1. **Case 2 Trigger:** `app/lib/case2/case2Trigger.ts` (line 14-41)
   - Log each keyword group match/fail
   - Show why trigger succeeded/failed

2. **Case 2 State Machine:** `app/document/page.tsx` (line 3645-3789)
   - Log state transitions (triggered → tracing → findings → accepted → ...)
   - Log document mapping logic (line 3751-3760)

3. **Orchestrator Graph Execution:** `app/lib/graphKyc/orchestrator.ts`
   - Log node entry/exit (already partially done)
   - Log checkpoint save/load operations
   - Log HITL pause decision logic

4. **Checkpoint Store:** `app/lib/flow2/checkpointStore.ts`
   - Log file I/O operations (already has detailed error logging)
   - Log corruption recovery attempts

5. **Email Sending:** `app/lib/email/smtpAdapter.ts`
   - Log email payload (sanitized, no secrets)
   - Log SMTP connection status

### Environment Variables for Debug Mode:

```bash
# .env.local
NEXT_PUBLIC_CASE2_DEBUG=true          # Client-side Case 2 logging
DEBUG_ORCHESTRATOR=true               # Server-side graph execution
DEBUG_CHECKPOINT=true                 # Checkpoint I/O logging
DEBUG_EMAIL=true                      # Email sending logging
```

---

## F) KEY FILE REFERENCES

### Case 2 (CS Integration Exception)

| Component | File Path | Key Functions | Lines |
|-----------|-----------|---------------|-------|
| Trigger Detection | `app/lib/case2/case2Trigger.ts` | `detectCase2Trigger()` | 13-42 |
| Demo Data | `app/lib/case2/demoCase2Data.ts` | `CASE2_DEMO_DATA` | 36-122 |
| UI Component | `app/components/case2/Case2ProcessBanner.tsx` | Component render | Full file |
| Chat Handler | `app/document/page.tsx` | `handleFlow2ChatSubmit()` | 3641-3713 |
| State Management | `app/document/page.tsx` | State variables | 3665-3789 |

### Flow2 (KYC Graph Review)

| Component | File Path | Key Functions | Lines |
|-----------|-----------|---------------|-------|
| Entry Point (UI) | `app/document/page.tsx` | `handleGraphKycReview()` | 1638-1850 |
| Orchestrator | `app/lib/graphKyc/orchestrator.ts` | `runGraphKycReview()` | 82-759 |
| Graph Definition | `app/lib/graphs/flow2GraphV1.ts` | `flow2GraphV1` | 20-270 |
| Human Review Node | `app/lib/graphKyc/nodes/humanReviewNode.ts` | `executeHumanReviewNode()` | Full file |
| Risk Assessment | `app/lib/graphKyc/riskAssessment.ts` | `assessKYCRisks()` | Full file |
| Checkpoint Store | `app/lib/flow2/checkpointStore.ts` | `saveCheckpoint()`, `loadCheckpoint()` | 130-242 |
| Email Sender | `app/lib/email/smtpAdapter.ts` | `sendApprovalEmail()` | 46-198 |
| Topic Summaries (LLM) | `app/api/flow2/topic-summaries/route.ts` | POST handler | Full file |

### UI Components (Flow Monitor)

| Component | File Path | Purpose | Key Elements |
|-----------|-----------|---------|--------------|
| Flow Monitor | `app/components/flow2/Flow2MonitorPanel.tsx` | Stage visualization | `BUSINESS_STAGES`, `getCurrentStageIndex()` |
| Right Panel | `app/components/flow2/Flow2RightPanel.tsx` | Container for monitor | Passes status/metadata |
| Post-Reject Analysis | `app/components/flow2/PostRejectAnalysisPanel.tsx` | Phase 8 animation | `scheduleAnimation()` |
| Topic Summaries | `app/components/shared/TopicSummariesPanel.tsx` | LLM-generated summaries | Render bullets/evidence |

### Checkpoint & State Persistence

| Component | File Path | Storage Location | Format |
|-----------|-----------|------------------|--------|
| Checkpoint Files | `app/lib/flow2/checkpointStore.ts` | `.local/flow2-checkpoints/{run_id}.json` | JSON (atomic write) |
| Token Index | `app/lib/flow2/checkpointStore.ts` | `.local/flow2-checkpoints/_token_index.json` | JSON (token → run_id map) |
| Demo Evidence | `app/lib/flow2/demoEddGenerator.ts` | In-memory (hardcoded) | Deterministic outputs |

---

## G) CONCLUSION & ANSWERS TO ORIGINAL QUESTIONS

### 1) What logic runs end-to-end for the sample input?

**Answer:** With the EXACT query provided ("Regarding the CS integration, how do we handle onboarding for a high-net-worth client from a Restricted Jurisdiction"), **NO Case 2 logic runs** because it's missing required keywords "ubs"/"united bank" AND "risk appetite".

**What Actually Happens:**
1. User types query in chat
2. `handleFlow2ChatSubmit()` is called
3. `detectCase2Trigger()` returns `false` (missing keywords)
4. Falls through to default handler (line 3704)
5. Shows generic message: "Flow2 mode active. You can ask about CS integration..."
6. **No workflow, no analysis, no data retrieval**

### 2) What is deterministic vs LLM-generated vs hardcoded demo?

| Feature | Deterministic | LLM-Generated | Hardcoded Demo |
|---------|---------------|---------------|----------------|
| **Case 2 Trigger Detection** | ✓ (keyword matching) | ✗ | ✗ |
| **Case 2 Source "Retrieval"** | ✗ | ✗ | ✓ (3 static strings) |
| **Case 2 Assistant Response** | ✗ | ✗ | ✓ (pre-written text) |
| **Case 2 Path Steps** | ✗ | ✗ | ✓ (4 hardcoded steps) |
| **Flow2 Topic Assembly** | ✓ (predefined 10 topics) | ✗ | ✓ (KYC_TOPIC_IDS) |
| **Flow2 Risk Triage** | ✓ (fixed routing rules) | ✗ | ✗ |
| **Flow2 Topic Summaries** | ✗ | ✓ (Anthropic Claude) | ✗ |
| **Flow2 EDD Findings** | ✗ | ✗ | ✓ (demoEddOutputs) |
| **Email HTML Body** | ✓ (template + data) | Part (topic summaries) | ✗ |

**LLM is ONLY used for:** Topic Summaries generation (`/api/flow2/topic-summaries`)

### 3) How is the review workflow created, persisted, and rendered?

**Creation:**
- Graph: Defined in `flow2GraphV1.ts` (static structure)
- Execution: Orchestrator traverses nodes deterministically
- Stage Mapping: Business stages derived from node states (not 1:1)

**Persistence:**
- Checkpoints: JSON files in `.local/flow2-checkpoints/`
- Atomic writes: Temp file + rename pattern
- Token index: Maps approval_token → run_id for email links

**Rendering:**
- `Flow2MonitorPanel`: Shows 6 business stages (not raw graph nodes)
- `getCurrentStageIndex()`: Maps `(status, edd_stage)` → stage number
- Historical colors: Demo-only policy preserves red/yellow semantics

### 4) Pipeline Story with File References:

See Section A (Happy Path Sequence Diagram) and Section F (Key File References) above.

**Core Pipeline:**
```
User Input → Case 2 Trigger? → NO → Generic Response
          ↓
       YES (with right keywords)
          ↓
       Case 2 Demo UI (client-side state machine)
          ↓
       User Uploads Docs → "Run KYC Graph Review"
          ↓
       POST /api/orchestrate → orchestrator.ts
          ↓
       Graph Execution: topic_assembler → risk_triage → parallel_checks → human_review (PAUSE)
          ↓
       Checkpoint Saved → Email Sent → Polling Starts
          ↓
       User Clicks Email Link → Decision Submitted
          ↓
       If Reject: EDD Sub-Review (Phase 8) → Second Email
          ↓
       If EDD Approve: Final Completion State
```

---

**END OF AS-IS TRACE DOCUMENT**




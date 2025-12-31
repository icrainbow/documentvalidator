# Demo Runbook: Complete Walkthrough

**Duration:** 8-10 minutes  
**Audience:** Hiring manager, AI PM, Engineering lead  
**Goal:** Demonstrate intelligent document review with adaptive routing and explainability

---

## Prerequisites

### Required
- **Node.js:** v18+ (check: `node -v`)
- **Ports:** 3000 must be free
- **Environment:** Development mode (not production build)

### Optional
- Remote skills server (Phase 2 demo): Port 4010 free

### No API Keys Required
All demos use mock providers and deterministic test data.

---

## Startup Commands

```bash
# 1. Install dependencies (if first time)
npm install

# 2. Start dev server
npm run dev

# Server ready at: http://localhost:3000
# Wait for "✓ Ready in X seconds" message
```

**Optional: Enable reflection rerun mode (for demo repeatability)**
```bash
# Terminal 1
export REFLECTION_TEST_MODE=rerun
export REFLECTION_PROVIDER=mock
npm run dev
```

---

## Demo Segment 1: Flow1 — Intelligent Scope Planning (2-3 minutes)

### What to Say (Opening)
*"First, I'll show Flow1—our production-ready batch review system with intelligent scope planning. The key innovation here is that it doesn't blindly re-review every section when you make an edit. It understands what changed and adapts the review scope accordingly."*

### Steps

**1. Navigate to Flow1**
- URL: `http://localhost:3000/document?flow=1`
- Page loads with empty document workspace

**2. Load Sample Document**
- Click **"📁 Upload Document"** button
- Select `demo_assets/flow1_sample.txt` OR paste its content
- Click **"Confirm Sections"**
- **Expected Result:** 5 sections appear in left panel

**What to Say:**
*"This is a standard compliance document with 5 sections. Now watch what happens when I edit just one section..."*

**3. Edit Section 2**
- Click **Section 2** card
- Modal opens with section content
- Add text: `"Note: GDPR compliance review required."`
- Click **"Save Changes"**
- **Expected Result:** Section 2 badge turns **grey** (unreviewed state)

**What to Say:**
*"Notice the badge turned grey—the system now knows this section is 'dirty' and needs re-review. But instead of re-running the entire document..."*

**4. Run Full Review**
- Click **"🔍 Run Full Review"** (top-right button, `data-testid="flow1-run-review"`)
- **Expected Result:** Progress indicator → Review completes in ~3 seconds
- Section 2 badge updates to green/yellow/red based on issues

**5. Open Agent Panel**
- Click **"🤖 Agents"** button (right sidebar, `data-testid="agent-panel-button"`)
- Agent drawer slides in from right

**6. Show Scope Planning Tab**
- Click **"🎯 Scope Planning"** tab
- **Expected Visible:**
  ```
  Review Mode: section-only
  Sections to Review: ["section-2"]
  Agents Selected: ["compliance"]
  Global Checks: [] (skipped)
  Reasoning: "1 dirty section, no heavy edits, no high-risk keywords detected"
  ```

**What to Say (Key Message):**
*"See? The Scope Planner agent detected only 1 dirty section and chose 'section-only' mode. It only reviewed Section 2 with the compliance agent. This saved 80% of API costs compared to a full document review. If the edit had been heavy or contained high-risk keywords like 'sanction' or 'fraud', it would automatically escalate to cross-section or full-document review."*

**7. Explain Adaptation**
*"The system tracks three things: which sections were edited, how severe the edits are, and whether any risk keywords appear. Based on that, it picks the minimal review scope. This makes it production-ready—fast, cost-effective, but still safe."*

---

## Demo Segment 2: Flow2 — Agentic Graph with Reflection (4-5 minutes)

### What to Say (Transition)
*"Now let's look at Flow2—this is our more advanced agentic system using a graph execution model. Instead of a fixed pipeline, it routes dynamically based on risk and can pause mid-execution to reflect and decide its next action. This is better for complex, high-stakes reviews where the right approach isn't obvious upfront."*

### Steps

**1. Navigate to Flow2**
- URL: `http://localhost:3000/document?flow=2&scenario=crosscheck`
- Page loads with Flow2 workspace
- **Button enabled:** "Load Sample KYC Pack" (`data-testid="flow2-load-sample-button"`)

**What to Say:**
*"Flow2 is designed for KYC (Know Your Customer) reviews—think bank compliance. I'm loading a pre-built 'crosscheck' scenario with 3 KYC documents."*

**2. Load Sample KYC Pack**
- Click **"Load Sample KYC Pack"**
- **Expected Result:** 3 documents appear:
  - `Client_Identity_John_Smith.pdf`
  - `Source_of_Wealth_Statement.pdf`
  - `Account_Purpose_Statement.pdf`
- Status: **"Loaded Documents (3)"**

**3. Run Graph KYC Review**
- Click **"🕸️ Run Graph KYC Review"** (`data-testid="flow2-run-graph-review"`)
- **Expected Result:** Progress indicator → Review completes in ~5 seconds
- Issues panel updates with detected gaps/conflicts

**What to Say:**
*"The review just completed. Now let me show you what happened under the hood..."*

**4. Open Agent Panel**
- Click **"🤖 Agents"** button (`data-testid="agent-panel-button"`)
- Agent drawer opens

**5. Show Graph Trace Tab**
- Click **"🕸️ Graph Trace"** tab
- **Expected Visible:**
  ```
  [EXECUTED] topic_assembler → Assembled 3 documents into KYC topics
  [EXECUTED] risk_triage → Risk score: 0.50 → Path: crosscheck
  [EXECUTED] gap_collector (parallel)
  [EXECUTED] conflict_sweep (parallel)
  [EXECUTED] policy_flags_check (parallel)
  [EXECUTED] reflect_and_replan → Decision: skip, Confidence: 0.75
  [EXECUTED] routing_decision → Continue to finalize
  [EXECUTED] finalize → Generated 7 issues
  ```

**What to Say (Walk Through Events):**
1. *"First, topic_assembler organized the 3 docs into standard KYC topics—identity, source of wealth, transaction patterns, etc."*
2. *"Then risk_triage scored this at 0.5 (medium risk) and routed to the 'crosscheck' path."*
3. *"Next, three checks ran in parallel—gap collector (missing info), conflict sweep (contradictions), and policy flags. This parallelism speeds things up."*
4. **[KEY POINT]** *"Here's the magic: reflect_and_replan node. After the parallel checks, the agent paused and asked itself: 'Do I have enough info? Should I rerun with stricter checks? Do I need human input?' In this case, confidence was 0.75 (high), so it decided to 'skip' and continue to finalize."*
5. *"If confidence had been low (< 0.6) or if major conflicts were detected, it could trigger a rerun or escalate to a human gate. This adaptive routing is what makes it 'agentic' vs. just a fixed workflow."*

**6. Show Results (Optional)**
- Click **"🧾 Gaps/EDD"** tab → Shows 7 coverage gaps (missing KYC topics)
- Click **"⚔️ Conflicts"** tab → Shows any cross-document contradictions (if present)

**What to Say:**
*"The system found 7 gaps—missing information about transaction patterns, beneficial ownership, etc. In a real bank scenario, this would trigger an EDD (Enhanced Due Diligence) request to the client."*

**7. Explain Graph vs Pipeline**
**What to Say (Key Message):**
*"Why use a graph instead of a simple pipeline? Three reasons: First, explicit state transitions—you can see exactly where you are. Second, resumability—if we hit a human gate, we can pause, wait for human input, then resume. Third, testability—we can inject mock decisions at any node and test every possible path. This makes it production-grade despite being 'agentic'."*

---

## Demo Segment 3: Phase 4 — Graph Draft Editor (2-3 minutes)

### What to Say (Transition)
*"One more thing I want to show you—Phase 4 adds a draft editor for the graph itself. This lets you manually tweak the graph definition, validate it, save it, and see what changed. It's like 'infrastructure as code' but for agentic workflows."*

### Steps

**1. Navigate to Graph Definition Tab**
- In Agent Panel (still open from previous segment)
- Click **"📐 Graph"** tab (`data-testid="graph-definition-tab-button"`)
- **Expected Visible:**
  - **Metadata Summary:** graphId, version, checksum
  - **Definition Viewer:** Expandable JSON (8 nodes, 12 edges)
  - **Draft Editor** section below

**What to Say:**
*"This shows the current graph definition—8 nodes, 12 edges. Now let me edit it..."*

**2. Scroll to Draft Editor**
- Section: **"✏️ Draft Editor (Phase 4 MVP)"**
- **Visible:**
  - Large JSON textarea (`data-testid="graph-draft-json-editor"`)
  - **"🔍 Validate"** button (`data-testid="graph-draft-validate-button"`)
  - **"💾 Save Draft"** button (`data-testid="graph-draft-save-button"`, disabled)

**3. Edit the JSON**
- Find `parallel_checks` node in the JSON
- Change: `"parallelism": "unlimited"` → `"parallelism": "3"`
- OR find `reflect_and_replan` description
- Change: `"Self-reflection: analyzes trace and decides next action"` → `"EDITED: Custom reflection logic"`

**What to Say:**
*"I'm changing the parallelism from unlimited to 3—this would limit how many checks can run concurrently. In production, you'd want to tune this based on your infrastructure."*

**4. Validate**
- Click **"🔍 Validate"**
- **Expected Result:** Green box appears:
  ```
  ✅ Valid! Ready to save.
  ```
- **Save Draft** button becomes enabled

**What to Say:**
*"Validation passed. It checked that the JSON structure is correct, all node IDs are valid, edges connect properly, etc."*

**5. Save Draft**
- Click **"💾 Save Draft"**
- **Expected Result:** Save result appears:
  ```
  ✅ Draft saved successfully!
  Draft ID: abc123-def4-5678-90ab-cdef12345678
  Saved at: 2025-12-31T20:30:00Z
  File: .local/graph-drafts/flow2GraphDraft.abc123-...json
  ```

**What to Say:**
*"It saved the draft as a file under .local/graph-drafts. In a real system, this would go to a database or version control."*

**6. Show Diff**
- **Expected Visible (below save result):**
  ```
  📝 Changes (1)
  node_modified: nodes[parallel_checks].config
  Old: {"parallelism": "unlimited"}
  New: {"parallelism": "3"}
  ```

**What to Say (Key Message):**
*"And here's the diff—it shows exactly what changed. This is critical for governance in production. You can review, approve, and roll back graph changes just like you would with application code. This makes 'agentic' systems auditable and maintainable."*

**7. Verify File (Terminal, Optional)**
```bash
ls -la .local/graph-drafts/
cat .local/graph-drafts/flow2GraphDraft.*.json | jq .
```

**Expected Output:**
```json
{
  "draft": { "graphId": "flow2_kyc_v1", "version": "1.0.0", ... },
  "metadata": {
    "draftId": "abc123-...",
    "createdAt": "2025-12-31T...",
    "createdBy": "local-dev",
    "baseVersion": "1.0.0",
    "baseChecksum": "a3f7d9e21b8c"
  }
}
```

---

## Closing: Three Takeaways (1 minute)

### What to Say

**1. Intelligence at Every Layer**
*"Flow1 shows intelligence at the scope planning layer—it adapts review depth based on what changed. Flow2 shows intelligence at the execution layer—it routes dynamically and can reflect mid-run. Together, they demonstrate a spectrum from 'smart workflow' to 'full agent'."*

**2. Production-Grade Agentic Systems**
*"What makes these production-ready? Three things: deterministic testing (we use mock providers), explicit state (graph traces show every decision), and graceful degradation (failures don't crash the system). Most 'agentic demos' are toys. This is designed to deploy at scale."*

**3. Explainability + Governance**
*"The graph definition is explicit and versioned. Trace events show why every node executed. Diffs show what changed. This gives you the auditability banks and regulated industries need. You're not just running an agent—you're operating a system you can explain to regulators."*

---

## How This Maps to Real Bank Compliance

### What to Say (if asked)

**Flow1 (Scope Planning):**
*"Think of a loan officer updating a credit memo. Flow1 knows which sections changed and re-runs only the fraud check or credit risk model for those sections. Saves time and API costs."*

**Flow2 (Agentic Graph):**
*"Think of KYC onboarding. The bank receives 10 documents from a client. Flow2 routes based on client risk—low-risk clients get a fast path, high-risk clients trigger enhanced due diligence or human review. The reflection step is like a senior analyst pausing to say 'Do I need more info before I approve this?'"*

**Phase 4 (Graph Editing):**
*"Compliance rules change quarterly. Flow2's graph editor lets the compliance team update routing logic (e.g., new sanction screening rules) without deploying code. It's 'infrastructure as code' for compliance workflows."*

---

## Hard Stop Fallback

### If Something Breaks During Demo

**Fallback Strategy: Narrative + Screenshots**

1. **Acknowledge calmly:**
   *"Looks like we hit a network issue / port conflict. Let me walk you through what you would see..."*

2. **Use docs/demo/DEMO.md screenshots** (if available) or:
   - Show trace JSON in docs/phases/PHASE_3_COMPLETION_REPORT.md
   - Show graph definition JSON in app/lib/graphs/flow2GraphV1.ts

3. **Continue narrative:**
   *"Here's the trace output—you'd see 8 nodes executed, with reflect_and_replan showing confidence 0.75 and decision 'skip'. The key innovation is that it's not hardcoded—it decides dynamically based on what it sees."*

4. **Pivot to architecture:**
   *"Let me show you the architecture instead. [Open diagram or README]. The graph executor runs these nodes, each node is testable in isolation, and the orchestrator maintains state between nodes..."*

5. **Offer follow-up:**
   *"I can send you a video walkthrough after this call, or we can reschedule for a live demo once I've debugged the port issue."*

---

## Demo Variations

### Short Version (5 minutes)
- Skip Flow1 entirely
- Flow2: Load sample → Run review → Show trace (focus on reflect_and_replan node only)
- Phase 4: Show draft editor → Validate → Save → Show diff (1 minute)

### Technical Deep Dive (15 minutes)
- Add: Show Skills tab (Phase 2), explain local vs remote transport
- Add: Trigger reflection rerun mode (set `REFLECTION_TEST_MODE=rerun`)
- Add: Show E2E test code (tests/e2e/flow2-reflection.spec.ts)
- Add: Show orchestrator code (app/lib/graphKyc/orchestrator.ts)

### Exec Summary (2 minutes)
1. *"We built two review systems: Flow1 adapts scope, Flow2 adapts routing. Both save costs and improve quality."*
2. Open Flow2 → Run review → Show trace → Point to reflect_and_replan node
3. *"This is the key innovation—self-reflection mid-execution. Makes it adaptive, not just automated."*

---

**End of Runbook**


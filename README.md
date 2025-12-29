# AI Investment Assistant Demo

A demo-only web application showcasing a chat-first, multi-agent document evaluation experience with intelligent routing and manual document sectioning.

## Overview

This is a **DEMO APPLICATION** - not a production system. It demonstrates:

- Chat as the primary entry point
- Intelligent document routing based on format
- Manual document sectioning via drag-and-select
- Multi-agent collaboration with visible decision logs
- Per-section Evaluate / Modify actions
- Compliance agent intervention
- Clear visual states (grey/green/red)

## Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**

## Getting Started

### Installation

```bash
npm install
```

### Development

**Recommended (with auto-cleanup):**
```bash
npm run dev
```
This uses a smart dev script that automatically cleans stale cache to prevent "Cannot find module" errors.

**Force dev without cleanup:**
```bash
npm run dev:force
```

**Manual clean + dev:**
```bash
npm run dev:clean
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Application Flows

## Troubleshooting

### "Cannot find module './XXX.js'" Error

This is a Next.js webpack cache corruption issue. **This should now be prevented automatically** by the enhanced dev workflow.

**✅ Automatic Prevention (NEW):**

The default `npm run dev` command now includes:
- Auto-detection of stale cache (cleans every hour automatically)
- Disabled filesystem cache in dev mode
- Deterministic module IDs to prevent corruption
- Smart cleanup script that runs transparently

**Quick Fix (if error still occurs):**

```bash
npm run dev:clean
```

Or manually:

```bash
# Stop the dev server (Ctrl+C)
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

**Why This Happens:**

Next.js webpack can create corrupted cache entries during hot-reload. Module references point to non-existent chunk files.

**What We've Done to Fix It:**

1. **Disabled webpack filesystem cache** in dev mode (`next.config.js`)
2. **Smart dev script** auto-cleans stale cache every hour
3. **Deterministic module IDs** prevent reference corruption
4. **Reduced watch pressure** with optimized watchOptions

**Available Commands:**

- `npm run dev` - Smart dev with auto-cleanup (recommended)
- `npm run dev:force` - Raw Next.js dev without auto-cleanup
- `npm run dev:clean` - Force clean + dev
- `npm run clean` - Just clean cache
- Disabling certain aggressive optimizations in dev mode

If the issue persists frequently, try:
1. Restarting your computer (clears file system cache)
2. Updating Next.js to the latest version: `npm update next`
3. Increasing your system's file descriptor limit (macOS): `ulimit -n 10240`

---

## Application Flows

## Orchestration Flows

This demo includes two multi-agent orchestration workflows that can be invoked via the `/api/orchestrate` endpoint.

### Flow 1: compliance-review-v1 (Regulatory Compliance)

**Purpose**: Evaluate documents for regulatory and policy compliance violations.

**Decision Outcomes**:
- `rejected` - Critical policy violations prevent approval
- `request_more_info` - High/medium issues require additional information or evidence
- `ready_to_send` - Document approved (with or without minor advisory notes)

**Agent Sequence**:
1. `extract-facts-agent` - Extract entities, amounts, dates, risks
2. `map-policy-agent` - Map facts to internal policy rules
3. `redteam-review-agent` - Adversarial review for violations
4. `[conditional]` `request-evidence-agent` - Generate evidence requests if needed
5. `draft-client-comms-agent` - Draft compliance summary for client
6. `write-audit-agent` - Log compliance review decision

**Example Usage**:
```bash
curl -X POST http://localhost:3002/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "flow_id": "compliance-review-v1",
    "document_id": "DOC-001",
    "sections": [{"id": "sec1", "title": "Investment Strategy", "content": "..."}]
  }'
```

---

### Flow 2: contract-risk-review-v1 (Contractual Risk Assessment)

**Purpose**: Assess legal and financial risk exposure in contracts and agreements.

**Decision Outcomes**:
- `escalate_legal` - Critical legal risks (unlimited liability, missing signatures) require legal counsel
- `negotiate_terms` - High financial exposure or non-standard terms should be negotiated
- `acceptable_risk` - Minor risks identified but within tolerance
- `ready_to_sign` - Contract terms are standard and acceptable

**Agent Sequence**:
1. `extract-facts-agent` - Extract parties, obligations, liability clauses, payment terms (hint: `extractionFocus: 'contractual'`)
2. `map-policy-agent` - Map terms to contract standards templates (hint: `matchingStrategy: 'contract_template'`)
3. `redteam-review-agent` - Adversarial contract review for one-sided terms (hint: `reviewMode: 'contract_risk'`)
4. `[conditional]` `request-evidence-agent` - Generate negotiation points and evidence requests if needed
5. `draft-client-comms-agent` - Draft contract risk summary
6. `write-audit-agent` - Log contract review decision

**Example Usage**:
```bash
curl -X POST http://localhost:3002/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "flow_id": "contract-risk-review-v1",
    "document_id": "CONTRACT-001",
    "sections": [{"id": "sec1", "title": "Service Agreement", "content": "..."}],
    "options": {
      "client_name": "Legal Team",
      "reviewer": "Contract Review System"
    }
  }'
```

**Key Differences from Compliance Review**:
| Aspect | Compliance Review | Contract Risk Review |
|--------|------------------|---------------------|
| Focus | Regulatory violations | Contractual risk exposure |
| Risk Types | Prohibited content, KYC/AML | Liability, indemnification, payment terms |
| Decision Outcomes | rejected / request_more_info / ready_to_send | escalate_legal / negotiate_terms / acceptable_risk / ready_to_sign |
| Blocking Conditions | Critical policy violations | Unlimited liability, missing signatures |
| Agent Corpus | Policy rules (tobacco, AML, etc.) | Contract standards (indemnification, termination, IP) |

---

### Testing Orchestration Flows

**List available flows**:
```bash
curl http://localhost:3002/api/orchestrate
```

**Test contract risk review** (see `scripts/test-contract-flow.ts`):
```bash
npx ts-node scripts/test-contract-flow.ts
```

**Expected Response Structure**:
```json
{
  "ok": true,
  "parent_trace_id": "orch_...",
  "mode": "fake",
  "decision": {
    "next_action": "escalate_legal",
    "reason": "1 critical risk(s)...",
    "confidence": 1.0,
    "recommended_actions": ["Forward to legal...", "..."],
    "blocking_issues": ["Unlimited liability clause"]
  },
  "artifacts": {
    "facts": {...},
    "policy_mappings": {...},
    "review_issues": {...},
    "evidence_requests": {...},
    "client_communication": {...},
    "audit_log": {...}
  },
  "execution": {
    "steps": [...],
    "total_latency_ms": 250,
    "total_tokens": 0
  }
}
```

---

## Application Flows

### Flow 1: Chat-Only Input (User-Provided Content)

1. **Home Page** - Answer 3 questions in chat:
   - Investment Background
   - Risk Assessment
   - Technical Strategy
2. **Auto-Navigation** - After 3rd answer, automatically goes to document page
3. **Document Page** - Shows YOUR actual input as section content
4. **Multi-Agent Evaluation** - Evaluate, modify, and iterate with agents

**Content Source:** Real user-typed input

---

### Flow 2: Normal Document Upload (Auto-Segmentation)

1. **Home Page** - Click "Upload Document"
2. **Upload any normal file** (e.g., `portfolio.pdf`, `investment.docx`)
3. **Agent Message:**
   ```
   [System]: Document uploaded successfully. 
   Automatic segmentation completed.
   ```
4. **Auto-Navigation** - Goes directly to document page
5. **Document Page** - Shows fake demo sections (predefined)
6. **Multi-Agent Evaluation** - Full workflow available

**Content Source:** Fake predefined demo content

---

### Flow 3: Badly Formatted Document (Manual Sectioning)

1. **Home Page** - Click "Upload Document"
2. **Upload file named** `badformat.word` (or containing "badformat")
3. **Agent Messages:**
   ```
   [System]: This document format cannot be automatically segmented.
   Manual section definition is required.
   
   [Evaluate Agent]: The uploaded document lacks reliable structural markers.
   Please manually define sections using our drag-and-select tool.
   ```
4. **Auto-Navigation** - Goes to Manual Sectioning Page
5. **Sectioning Page:**
   - Left: Full document text with drag-to-select
   - Right: Sections preview
   - Drag 3 rectangles → Click "Add Section" each time
   - After 3 sections, click "Confirm Sections & Continue"
6. **Document Page** - Shows fake demo sections (predefined)
7. **Multi-Agent Evaluation** - Full workflow available

**Content Source:** Fake predefined demo content

---

## Page Descriptions

### Page 1: Chat Entry (`/`)

**Purpose:** Primary entry point with intelligent routing

**Features:**
- Interactive Q&A chat (3 questions)
- Document upload with format detection
- Smart routing based on input type

**Buttons:**
- **Upload Document** - Opens file picker
- **Evaluate** - Shows placeholder message

---

### Page 2: Manual Sectioning (`/sectioning`)

**Purpose:** Visual demonstration of user-driven section definition

**Layout:**
- **Left Panel:** Full document view with drag-to-select
- **Right Panel:** Confirmed sections preview

**Interaction:**
1. Drag over document to create selection rectangle
2. Rectangle stays visible (doesn't disappear)
3. Click "Add Section" to confirm
4. Section appears in right panel
5. Repeat 3 times
6. Click "Confirm Sections & Continue"

**Action Buttons:**
- **↶ Undo** - Remove last rectangle
- **✕ Reset** - Clear all rectangles
- **+ Add Section** - Confirm current selection

**Demo Logic:**
- Drag #1 → Section 1 (Investment Background)
- Drag #2 → Section 2 (Risk Assessment)
- Drag #3 → Section 3 (Technical Strategy)

---

### Page 3: Document Evaluation (`/document`)

**Purpose:** Core multi-agent collaboration workflow

**Layout:**
- **Left Panel (2/3):** Document sections with controls
- **Right Panel (1/3):** Chat & Agent messages

**Each Section Shows:**
- Title and status badge (PASS/FAIL/UNEVALUATED)
- **Decision Log** - Last 3 agent actions with color coding:
  - 🟣 [Evaluate] - Purple
  - 🔵 [Optimize] - Blue
  - 🔴 [Compliance] - Red
  - ⚫ [Policy] - Gray
- Section content (editable when in modify mode)
- **Evaluate** button - Tests section against criteria
- **Modify** button - Enables editing (changes to "Save")

**Decision Log Example:**
```
[Evaluate] FAIL: Too long, unclear risk methodology
[Optimize] Proposal: Shorten to 100 words, clarify approach
[Compliance] BLOCKED: Prohibited term detected
[Optimize] Content optimized, status updated to PASS
```

**Global Actions:**
- **Global Evaluate** - Evaluates all sections together
- **Submit** - Only enabled when all sections PASS

**Chat Panel:**
- Displays all agent communications
- Compliance Agent messages highlighted in red
- Interactive commands:
  - `"global evaluate"` - Evaluate all sections
  - `"fix section 2"` or `"fix Risk Assessment"` - Fix specific section
  - `"modify section 1"` - Enter edit mode for section

---

## Multi-Agent Collaboration Features

### Agent Types

1. **Evaluate Agent** (Purple)
   - Assesses section quality
   - Provides PASS/FAIL decisions
   - Explains evaluation criteria

2. **Optimize Agent** (Blue)
   - Handles content modifications
   - Proposes improvements
   - Manages edit/save workflow

3. **Compliance Agent** (Red)
   - Enforces KYC/regulatory rules
   - Blocks prohibited content
   - Provides compliance warnings

4. **Policy Agent** (Gray)
   - Enforces mandatory requirements
   - Adds required disclaimers

5. **System Agent**
   - General coordination
   - Navigation messages

---

## Special Demo Features

### Compliance Blocking (Section 3 Only)

When modifying Section 3 (Technical Strategy):
- Type **"tobacco industry"** in the content
- Click **Save**
- **Compliance Agent blocks the save:**
  - Textarea border turns RED
  - Warning message appears
  - "Cannot Save" indicator shows
  - Agent explains KYC violation
  - Section remains in edit mode
- Remove the term to successfully save

### Submit Validation

- Submit button is **disabled** until all sections PASS
- Warning message: "⚠️ All sections must pass evaluation before submission"
- Once all green, button enables
- Clicking Submit shows preview page with download option

### Section Status Logic

- **Section 1:** Always evaluates to PASS
- **Section 2:** Initially FAIL, turns PASS when fixed/modified
- **Section 3:** Initially FAIL, turns PASS when fixed/modified
- **Status persists** once changed to PASS

---

## Content Mapping Rules (Critical)

### Manual Sectioning Flow
- Source: Fake predefined demo content
- Used when: `badformat.word` uploaded → Manual page used

### Normal Upload Flow  
- Source: Fake predefined demo content
- Used when: Normal file uploaded → Auto-segmentation

### Chat-Only Flow
- Source: Real user-typed input
- Used when: User answers 3 questions → No file upload

**Do NOT mix content sources!**

---

## Chat Commands

Type these in the chat panel on the document page:

| Command | Effect |
|---------|--------|
| `"global evaluate"` | Evaluates all sections (1=PASS, 2=FAIL, 3=PASS) |
| `"fix section 2"` | Fixes Section 2, status → PASS |
| `"fix section 3"` | Fixes Section 3, status → PASS |
| `"fix Risk Assessment"` | Same as "fix section 2" |
| `"fix Technical Strategy"` | Same as "fix section 3" |
| `"modify section X"` | Enters edit mode for section X |

---

## Demo Testing Scenarios

### Scenario 1: Quick Demo
1. Home → Answer 3 questions
2. Auto-navigate to document page
3. Type `"fix section 2"` and `"fix section 3"` in chat
4. All sections green → Click Submit
5. Download document

### Scenario 2: Manual Sectioning
1. Home → Upload file named `badformat.word`
2. See agent explanation
3. Navigate to sectioning page
4. Drag 3 rectangles → Add each as section
5. Confirm → Navigate to document page
6. Manually modify Section 2 and 3
7. All sections green → Submit

### Scenario 3: Compliance Blocking
1. Get to document page (any flow)
2. Click "Modify" on Section 3
3. Type "tobacco industry" in content
4. Click "Save"
5. See Compliance Agent block the save
6. Remove "tobacco industry"
7. Click "Save" again → Success

---

## Visual Design Principles

### Color States
- **Grey/White** - Unevaluated
- **Green** - Pass
- **Red** - Fail
- **Blue** - In edit mode
- **Red (Compliance)** - Blocked content

### Agent Visual Differentiation
- Messages use different background colors
- Decision logs use color-coded agent labels
- Clear hierarchy of information

### Persistence & Clarity
- Rectangles stay visible after creation
- Status changes are immediate
- Decision logs show iteration history
- No "magic" transitions

---

## Important Notes

⚠️ **This is a DEMO ONLY**

- No backend logic
- No real file parsing
- No real LLM/agent orchestration
- No authentication or persistence
- All responses are mocked/hardcoded
- Text extraction is fake (predefined mappings)

**Clarity > Realism**

The goal is to demonstrate the CONCEPT of multi-agent collaboration, not to build a production system.

---

## Success Criteria

A viewer should immediately understand:

✅ Sections are defined by user intent (chat or drag)  
✅ Multiple agents collaborate on each section  
✅ Agents have different roles (Evaluate, Optimize, Compliance, Policy)  
✅ Iteration happens through visible decision logs  
✅ Compliance can block changes  
✅ All sections must pass before submission  

If this mental model is clear from the UI, the demo is successful.

---

## License

Demo project - Educational purposes only

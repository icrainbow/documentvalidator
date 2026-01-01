# Flow2 UX Redesign Demo Runbook

## Quick Demo (5 Steps)

**Goal:** Demonstrate the new Flow2 minimal, graph-first UX with Derived Topics and More Inputs.

### 1. Load Sample Pack
- Go to: `http://localhost:3000/document?flow=2&scenario=crosscheck`
- Select demo scenario from dropdown (e.g., "KYC Review - Crosscheck Mode")
- Click **"Load Sample KYC Pack"**
- **Expected:** 3 documents load, "Loaded Documents" list appears
- **Expected:** "Derived Topics" panel appears with 2-3 topic cards (Client Identity, Source of Wealth, etc.)

### 2. Show Agent Panel (4 Tabs)
- Click **"🤖 Agents"** button (top right)
- **Expected:** Drawer opens showing ONLY 4 tabs:
  - 🕸️ Graph Trace
  - 📐 Graph
  - 🔄 Runs
  - ⚙️ Config
- **Note:** Flow1 tabs like "Overview", "Skills", "Gaps" are NOT present at top level in Flow2
- **Note:** Skills and Outputs (Gaps/EDD) are now collapsible sections inside Graph and Graph Trace tabs

### 3. Show Derived Topics
- Scroll down in left panel to "Derived Topics" section
- Expand a topic card
- **Expected:** Each topic shows:
  - Title + summary
  - Source Files list (with filenames)
  - Evidence Snippets (expandable)
  - "More Inputs" button

### 4. Click an Issue → Jump to Topic
- In Agent Panel, go to **"🕸️ Graph Trace"** tab
- Run a review first if needed (click "🕸️ Run Graph KYC Review")
- Wait for review to complete (~3-5 seconds)
- Expand **"🧾 Outputs (Issues & EDD)"** section
- Click on any issue row
- **Expected:** 
  - Agent panel stays open
  - Left panel scrolls to the corresponding topic card
  - Topic card highlights (yellow border) for 3 seconds
  - Then highlight fades

### 5. More Inputs (Incremental Fusion)
- In a topic card, click **"+ More Inputs"**
- **Expected:** Modal opens showing current sources
- Upload a small text file (e.g., `tests/fixtures/test-kyc-doc.txt`)
- Click **"Upload & Fuse"**
- **Expected:**
  - Modal closes
  - Topic sources list now includes the new filename
  - Snippets updated (if you expand them)

---

## Key Talking Points

1. **Flow2 is now graph-first, minimal, and distinct from Flow1**
   - No hard-coded sections (documents are analyzed by agents, not user-structured)
   - No Review Type radio buttons (graph routing is automatic)
   - No Submit Document workflow (Flow2 outputs trace + issues for downstream processing)

2. **Agent Panel simplified for Flow2**
   - Only 4 tabs: Graph Trace / Graph / Runs / Config
   - Skills and Outputs (Gaps/EDD) moved into collapsible sections (not top-level tabs)

3. **Derived Topics show agent-generated document grouping**
   - Topics are built from uploaded documents
   - Each topic shows sources and evidence
   - Users can add more inputs to specific topics (incremental fusion)

4. **Issue → Topic navigation enables quick investigation**
   - Clicking an issue scrolls to and highlights the relevant topic
   - Provides traceability from review output back to input documents

5. **Flow1 remains 100% unchanged**
   - All section-based review features work exactly as before
   - No visual or behavioral regressions

---

## Troubleshooting

- **Derived Topics don't appear:** Ensure you loaded a sample pack with documents (not just opened the page)
- **More Inputs modal doesn't open:** Check that you clicked the button on a topic card, not elsewhere
- **Issue click doesn't scroll:** Ensure derived topics exist and the issue has a valid topic mapping (check console for errors)

---

## Flow1 vs Flow2 Comparison

| Feature | Flow1 | Flow2 (New UX) |
|---------|-------|----------------|
| Document structure | Sections (user-defined) | Documents (agent-analyzed) |
| Right panel | Review Type + Submit | Run Graph KYC Review + Agents |
| Agent Panel tabs | 7 tabs (Overview, Skills, Gaps, etc.) | 4 tabs (Graph Trace, Graph, Runs, Config) |
| Left panel | Section cards | Loaded Documents + Derived Topics |
| Issue investigation | Manual | Click issue → jump to topic |

---

## Next Steps

- **Phase 7 (future):** Real-time topic updates during graph execution
- **Phase 8 (future):** Topic-scoped re-review (rerun only affected nodes)
- **Phase 9 (future):** Export derived topics as structured output (JSON/PDF)


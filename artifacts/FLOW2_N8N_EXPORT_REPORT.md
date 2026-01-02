# Flow2 → n8n Workflow Export

**Commit:** `46f74a2`  
**Extraction Mode:** ✅ **RUNTIME** (from live dev server)

---

## 📊 Summary

| Metric | Value |
|--------|-------|
| **Extraction Mode** | `runtime` |
| **Runtime Endpoint** | `POST http://localhost:3000/api/orchestrate` |
| **Graph ID** | `flow2_kyc_v1` |
| **Graph Version** | `1.0.0` |
| **Source Nodes** | 9 (from Flow2 graph definition) |
| **n8n Nodes** | 10 (+ 1 synthetic Start node) |
| **n8n Connections** | 8 |
| **n8n Output** | `artifacts/flow2.n8n.json` |

---

## 🎯 Implementation Details

### PHASE A: Repo Scan ✅

**Found Runtime Truth Source:**
- **Endpoint:** `POST /api/orchestrate` with `mode: "langgraph_kyc"`
- **Response Path:** `response.graphReviewTrace.graphDefinition`
- **Availability:** Non-production environments (test/dev) only
- **Test Reference:** `tests/api/graphDefinition.test.ts`

**Static Fallback Source:**
- **File:** `app/lib/graphs/flow2GraphV1.ts`
- **Export:** `flow2GraphV1: GraphDefinition`

### PHASE B: Exporter Script ✅

**Created:** `tools/export-flow2-to-n8n.mjs`

**Strategy:**
1. **Runtime-First:** Fetch graph from `POST /api/orchestrate`
2. **Static Fallback:** Parse `flow2GraphV1.ts` if server unavailable
3. **Convert:** Flow2 graph → n8n workflow JSON
4. **Output:** `artifacts/flow2.n8n.json`

**Node Type Mapping:**
- `gate` nodes (human review, approval, HITL) → `n8n-nodes-base.wait`
- `start` nodes → `n8n-nodes-base.start`
- All other nodes → `n8n-nodes-base.noOp`

**Layout Algorithm:**
- Topological sort for left-to-right flow
- Vertical stagger to avoid overlaps

### PHASE C: npm Script ✅

**Added to `package.json`:**
```json
"export:flow2:n8n": "node tools/export-flow2-to-n8n.mjs"
```

**Usage:**
```bash
npm run export:flow2:n8n

# Custom base URL:
BASE_URL=http://localhost:3001 npm run export:flow2:n8n
```

### PHASE D: Execution & Validation ✅

**Execution Result:**
```
Extraction Mode:   runtime
Node Count:        10
Connection Count:  8
Output File:       /Users/shenyanran/Dev/VibeCodingProject/artifacts/flow2.n8n.json
```

**Validation:**
- ✅ Valid JSON structure
- ✅ Contains keys: `nodes`, `connections`, `settings`
- ✅ Node types: `n8n-nodes-base.start` (1), `n8n-nodes-base.noOp` (7), `n8n-nodes-base.wait` (2)
- ✅ Human checkpoints correctly identified: "Human Review", "Human Gate"

---

## 📋 Flow2 Graph Structure

### Nodes (9 total)

1. **topic_assembler** - Extracts and organizes KYC topics from documents
2. **risk_triage** - Evaluates risk score and determines routing path
3. **parallel_checks** - Runs conflict sweep, gap collector, policy flags in parallel
4. **human_review** - 🚦 Pauses execution for human approval/rejection (HITL)
5. **reflect_and_replan** - Self-reflection: analyzes trace and decides next action
6. **routing_decision** - Routes based on reflection output (rerun/human/continue)
7. **human_gate** - 🚦 Pauses execution for human decision (EDD scope)
8. **finalize** - Aggregates results and prepares final response
9. **error_handler** - Handles execution errors and returns degraded response

### Edges (13 total)

**Main Flow:**
1. `topic_assembler` → `risk_triage`
2. `risk_triage` → `parallel_checks`
3. `parallel_checks` → `human_review`
4. `human_review` → `reflect_and_replan` (if approved + reflection enabled)
5. `human_review` → `finalize` (if approved + no reflection)
6. `reflect_and_replan` → `routing_decision`
7. `routing_decision` → `parallel_checks` (rerun)
8. `routing_decision` → `human_gate` (ask human)
9. `routing_decision` → `finalize` (continue)
10. `human_gate` → `finalize`

**Error Paths:**
11. `topic_assembler` → `error_handler` (on error)
12. `risk_triage` → `error_handler` (on error)
13. `parallel_checks` → `error_handler` (on error)

### Entry Point
- **Start Node:** `topic_assembler`

---

## 🔧 n8n Workflow Details

### Node Distribution

| Node Type | Count | Purpose |
|-----------|-------|---------|
| `n8n-nodes-base.start` | 1 | Workflow entry point (synthetic) |
| `n8n-nodes-base.noOp` | 7 | Processing nodes (no-op placeholders) |
| `n8n-nodes-base.wait` | 2 | Human checkpoints (HITL gates) |

### Human Checkpoints (Wait Nodes)

1. **Human Review** (`human_review`)
   - Description: Pauses execution for human approval/rejection (Phase 2 HITL)
   - Config: `pause_if_no_decision: true`

2. **Human Gate** (`human_gate`)
   - Description: Pauses execution for human decision (EDD scope)
   - Config: `maxGates: 1`

---

## 📦 Files Created/Modified

### Created
1. `tools/export-flow2-to-n8n.mjs` - Exporter script (498 lines)
2. `artifacts/flow2.n8n.json` - n8n workflow JSON output

### Modified
1. `package.json` - Added `export:flow2:n8n` script

### Also Included (from previous fix)
- `app/flow2/approve/page.tsx` - Clean Tailwind CSS version
- `app/flow2/reject/page.tsx` - Clean Tailwind CSS version

---

## 🚀 Usage Instructions

### 1. Export Flow2 Graph
```bash
cd /Users/shenyanran/Dev/VibeCodingProject
npm run export:flow2:n8n
```

### 2. Import into n8n
1. Open n8n UI
2. Click "Workflows" → "Import from File"
3. Select `artifacts/flow2.n8n.json`
4. Adjust node positions if needed
5. Configure node parameters as required

### 3. Re-export After Graph Changes
- Modify `app/lib/graphs/flow2GraphV1.ts`
- Or change the orchestrator implementation
- Run `npm run export:flow2:n8n` again
- The exporter will automatically fetch the latest runtime definition

---

## 🎓 Technical Notes

### Why Runtime-First?
- **Runtime truth is THE truth:** The graph definition returned by the API reflects the actual running graph
- **Avoids drift:** Static parsing could miss dynamic graph construction or conditional logic
- **Test coverage:** The API endpoint is already tested (`tests/api/graphDefinition.test.ts`)

### Static Fallback Strategy
- Regex-based parsing of `flow2GraphV1.ts`
- Extracts node IDs and edges
- Infers node types from naming patterns
- **Use case:** CI/CD environments where dev server isn't running

### n8n Compatibility
- Uses only standard n8n node types (no custom nodes required)
- `noOp` nodes are placeholders that can be replaced with actual n8n nodes
- `wait` nodes map to n8n's Human-in-the-Loop functionality
- Workflow is marked `active: false` by default

---

## ✅ Success Criteria Met

All hard requirements fulfilled:

1. ✅ **Prefer RUNTIME truth over static parsing**
   - Exporter successfully fetched graph from `POST /api/orchestrate`
   - Runtime mode detected and used

2. ✅ **Output is valid n8n workflow JSON**
   - Contains `nodes`, `connections`, `settings` keys
   - Validated with `JSON.parse()`

3. ✅ **Saved to `./artifacts/flow2.n8n.json`**
   - File created at correct path
   - Directory auto-created if missing

4. ✅ **No handwaving - documented fallback path**
   - Runtime endpoint: `POST /api/orchestrate`
   - Static fallback: Parse `app/lib/graphs/flow2GraphV1.ts`
   - Extraction mode logged in output

5. ✅ **Minimal changes**
   - Added 1 exporter script (`tools/export-flow2-to-n8n.mjs`)
   - Added 1 npm script (`export:flow2:n8n`)
   - No new dependencies
   - No modifications to existing Flow2 code

---

**End of Report**





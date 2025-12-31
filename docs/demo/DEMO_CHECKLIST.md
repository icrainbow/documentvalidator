# Demo Pre-Flight Checklist

**Purpose:** 10-minute verification before live demo  
**When to run:** 30 minutes before demo, and again 5 minutes before

---

## Quick Start Checklist

```bash
# 1. Kill any processes on port 3000
lsof -ti :3000 | xargs kill -9 2>/dev/null || echo "Port 3000 is free"

# 2. Start dev server
npm run dev

# 3. Wait for "✓ Ready" message (~3-5 seconds)

# 4. Verify demo URLs open
open http://localhost:3000/document?flow=1
open http://localhost:3000/document?flow=2&scenario=crosscheck
```

---

## Detailed Checklist

### ☑️ 1. Environment Check (2 minutes)

- [ ] **Node version:** `node -v` → Should be v18.x or v20.x
- [ ] **Dependencies installed:** `ls node_modules | wc -l` → Should be > 100
- [ ] **Port 3000 free:** `lsof -ti :3000` → Should return nothing
- [ ] **No stale Next.js build:** `rm -rf .next` (optional, if issues)

**Green Signal:** Node version correct, port free

---

### ☑️ 2. Server Startup (1 minute)

```bash
# Clean start
npm run dev
```

**Watch for:**
- [ ] `✓ Ready in X seconds` message appears
- [ ] `○ Compiling /` appears
- [ ] `✓ Compiled /` appears (~3-5 seconds)
- [ ] No error messages in console
- [ ] Server shows: `Local: http://localhost:3000`

**Green Signal:** "✓ Ready" message, no errors

**Troubleshoot:** If stuck at "Starting...", kill and restart:
```bash
lsof -ti :3000 | xargs kill -9
npm run dev
```

---

### ☑️ 3. Flow1 Smoke Test (2 minutes)

**URL:** `http://localhost:3000/document?flow=1`

- [ ] Page loads (no blank screen)
- [ ] "📁 Upload Document" button visible
- [ ] Can paste sample text (copy from `demo_assets/flow1_sample.txt`)
- [ ] Click "Confirm Sections" → 5 sections appear
- [ ] Click "🔍 Run Full Review" → Review completes in ~3 seconds
- [ ] Click "🤖 Agents" → Drawer opens
- [ ] "🎯 Scope Planning" tab visible → Data populated

**Green Signals:**
- 5 sections load
- Review completes without timeout
- Scope Planning tab shows `reviewMode: "full-document"` or `"section-only"`

**Fallback:** If sections don't load, refresh and try again

---

### ☑️ 4. Flow2 Smoke Test (3 minutes)

**URL:** `http://localhost:3000/document?flow=2&scenario=crosscheck`

- [ ] Page loads with Flow2 workspace
- [ ] "Load Sample KYC Pack" button ENABLED (not greyed out)
- [ ] Click button → 3 documents load
- [ ] "Loaded Documents (3)" heading visible
- [ ] Click "🕸️ Run Graph KYC Review" → Review completes in ~5 seconds
- [ ] Click "🤖 Agents" → Drawer opens
- [ ] "🕸️ Graph Trace" tab visible → 8 trace events present
- [ ] Trace events include:
  - [ ] `topic_assembler` (status: executed)
  - [ ] `risk_triage` (status: executed)
  - [ ] `reflect_and_replan` (status: executed) ← **KEY**
  - [ ] `finalize` (status: executed)

**Green Signals:**
- 3 documents load
- Trace shows 8 events
- `reflect_and_replan` node present with decision/confidence data

**Troubleshoot:** If "Load Sample" button disabled:
```bash
# Check URL has scenario parameter
http://localhost:3000/document?flow=2&scenario=crosscheck
# If still disabled, manually select "crosscheck" from dropdown
```

---

### ☑️ 5. Phase 4 Draft Editor Test (2 minutes)

**Prerequisites:** Flow2 review completed (from step 4 above)

- [ ] In Agent Panel, click "📐 Graph" tab
- [ ] "Graph Metadata Summary" visible (graphId, version, checksum)
- [ ] Scroll down to "✏️ Draft Editor" section
- [ ] JSON textarea populated with graph definition
- [ ] Edit JSON: Change `"parallelism": "unlimited"` to `"parallelism": "3"`
- [ ] Click "🔍 Validate" → Green "✅ Valid!" message appears
- [ ] Click "💾 Save Draft" → Save result appears with draftId
- [ ] Diff viewer shows 1 change

**Green Signals:**
- Validation succeeds
- Save succeeds
- Diff shows 1 modified node

**Verify file saved:**
```bash
ls -la .local/graph-drafts/
# Should show: flow2GraphDraft.<uuid>.json
```

---

## Optional: Full Test Suite (5 minutes)

**Only run if time allows. Not required for demo.**

### API Tests
```bash
npm run test:api
# Expected: 46/46 tests passing
# Duration: ~20 seconds
```

### Reflection E2E Tests
```bash
npx playwright test -c playwright.reflection.config.ts
# Expected: 3/3 tests passing
# Duration: ~15 seconds
```

**Skip if:** Tests take >1 minute (might indicate server issues)

---

## Quick Verification Commands

### Before Demo Starts
```bash
# All-in-one check
curl -s http://localhost:3000/document?flow=2 | grep -q "<!DOCTYPE html" && echo "✅ Server OK" || echo "❌ Server DOWN"

# Check API endpoint
curl -s http://localhost:3000/api/skills | jq .totalSkills
# Expected output: 2
```

### During Demo (if something seems wrong)
```bash
# Check server logs (Terminal 1)
# Look for errors like "ECONNREFUSED" or "timeout"

# Check if orchestrate API works
curl -X POST http://localhost:3000/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"mode":"langgraph_kyc","documents":[{"name":"test.txt","content":"test"}]}'
# Should return JSON (not error page)
```

---

## Green Signals Summary

✅ **Ready for Demo:**
- Dev server starts in < 10 seconds
- Flow1 loads and runs review
- Flow2 loads sample data (3 docs)
- Flow2 trace shows `reflect_and_replan` node
- Draft editor validates and saves
- No errors in server console

🟡 **Proceed with Caution:**
- Flow1 works but Flow2 slow (> 10 seconds)
- Reflection node missing (fallback: show screenshot)
- Draft save fails (fallback: explain feature verbally)

🔴 **Do Not Demo (Reschedule):**
- Server won't start
- Flow2 returns 500 error
- No trace events at all
- Multiple components broken

---

## Pre-Demo Environment Setup (Optional)

For **consistent reflection behavior** in demo:

```bash
# Terminal 1
export REFLECTION_PROVIDER=mock
export REFLECTION_TEST_MODE=rerun
npm run dev
```

**Why?** This forces reflection to always propose a rerun (more interesting demo). Default mode (`skip`) is less visually dramatic.

**Trade-off:** Rerun mode adds 2-3 seconds to review time.

---

## Post-Demo Cleanup

```bash
# Clear draft files (optional)
rm -rf .local/graph-drafts/*.json

# Stop server
# Ctrl+C in Terminal 1

# Kill any lingering processes
lsof -ti :3000 | xargs kill -9
```

---

**Checklist Complete ✅**

**Time Investment:** 10 minutes  
**Confidence Gain:** High  
**Fallback Risk:** Low (if all green signals pass)


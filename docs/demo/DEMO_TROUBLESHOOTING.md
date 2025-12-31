# Demo Troubleshooting Guide

**Purpose:** 2-minute fixes for common demo issues  
**When to use:** During demo if something breaks, or during pre-flight check

---

## Quick Reference

| Symptom | Likely Cause | Fix Time | Section |
|---------|--------------|----------|---------|
| Dev server stuck at "Starting..." | Port 3000 occupied | 30s | [Server Issues](#server-issues) |
| Flow2 not loading | URL missing `?flow=2` | 10s | [Flow2 Issues](#flow2-issues) |
| "Load Sample" button disabled | Missing scenario param | 20s | [Flow2 Issues](#flow2-issues) |
| Orchestrate API returns 500 | Server crash / code error | 2min | [API Issues](#api-issues) |
| Reflection trace missing | Test mode not set | 1min | [Reflection Issues](#reflection-issues) |
| Draft save fails | Runtime not set to nodejs | 30s | [Phase 4 Issues](#phase-4-issues) |
| Playwright fails locally | Browsers not installed | 2min | [Test Issues](#test-issues) |

---

## Server Issues

### ❌ Dev server won't start

**Symptom:**
```
npm run dev
→ Port 3000 is already in use
```

**Cause:** Previous Next.js process still running

**Fix (30 seconds):**
```bash
# Kill process on port 3000
lsof -ti :3000 | xargs kill -9

# Restart server
npm run dev
```

**Green Signal:** `✓ Ready in 3s` message appears

---

### ❌ Dev server slow / stuck at "Compiling..."

**Symptom:**
```
○ Compiling /document ...
(stuck for > 30 seconds)
```

**Cause:** Next.js cache corruption or heavy CPU usage

**Fix (1 minute):**
```bash
# Ctrl+C to stop server
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

**Alternative (if still slow):**
```bash
# Check for CPU-heavy processes
top -o cpu | head -20

# Kill competing processes or restart terminal
```

**Green Signal:** Page compiles in < 5 seconds

---

### ❌ Server crashes on page load

**Symptom:**
```
Error: Cannot find module 'X'
or
TypeError: undefined is not a function
```

**Cause:** Missing dependency or code error

**Fix (2 minutes):**
```bash
# Re-install dependencies
rm -rf node_modules package-lock.json
npm install

# Restart server
npm run dev
```

**Fallback:** If error persists, check git status:
```bash
git status
# If files are modified unexpectedly, revert:
git checkout -- .
npm install
npm run dev
```

**Green Signal:** Server starts without errors

---

## Flow2 Issues

### ❌ `/document?flow=2` not loading (blank page)

**Symptom:** URL loads but page is empty or shows Flow1 UI

**Cause:** Missing `flow=2` query parameter

**Fix (10 seconds):**
```bash
# Ensure URL includes flow parameter:
http://localhost:3000/document?flow=2&scenario=crosscheck
```

**Verify:** Page shows "Load Sample KYC Pack" button (not "Upload Document")

---

### ❌ "Load Sample KYC Pack" button disabled

**Symptom:** Button is greyed out and unclickable

**Cause 1:** Missing scenario parameter in URL

**Fix (20 seconds):**
```bash
# Add scenario to URL:
http://localhost:3000/document?flow=2&scenario=crosscheck
```

**Cause 2:** Flow2 workspace full (MAX_FLOW2_DOCUMENTS reached)

**Fix:**
- Click "Clear All Documents" button
- Refresh page

**Green Signal:** Button is blue and clickable

---

### ❌ No documents load after clicking "Load Sample"

**Symptom:** Click button → spinner appears → nothing happens

**Cause:** Invalid scenario ID or demo data missing

**Fix (30 seconds):**
```bash
# Check browser console (F12 → Console tab)
# Look for error like: "Scenario 'kyc' not found"

# Valid scenarios: fast, crosscheck, escalate, human_gate
# Update URL to valid scenario:
http://localhost:3000/document?flow=2&scenario=crosscheck

# Refresh page and try again
```

**Verify:** Check `app/lib/graphKyc/demoData.ts` exists and exports `DEMO_SCENARIOS`

**Green Signal:** 3 documents appear with titles and content

---

## API Issues

### ❌ Orchestrate API returns 500 error

**Symptom:**
- Click "Run Graph KYC Review"
- Spinner runs for ~5s
- Error message: "Error running orchestrate"
- Server console shows `500 Internal Server Error`

**Cause:** Runtime error in orchestrator code

**Fix (2 minutes):**

**Step 1: Check server logs**
```bash
# Look at Terminal 1 (where npm run dev is running)
# Find error stack trace
# Common errors:
#   - "Cannot read property 'X' of undefined"
#   - "Module not found"
#   - "Unexpected token"
```

**Step 2: Identify file causing error**
```bash
# Error will show file path like:
# at orchestrateGraphKyc (app/lib/graphKyc/orchestrator.ts:123)
```

**Step 3: Quick fix (if demo is live)**
- Restart server: `Ctrl+C` then `npm run dev`
- If error persists, use **Fallback Story** (see below)

**Step 4: Code fix (if time allows)**
- Check git status: `git status`
- Revert changes: `git checkout -- app/lib/graphKyc/orchestrator.ts`
- Restart: `npm run dev`

**Fallback Story (if broken during demo):**
*"Looks like we hit a server issue. Let me show you the trace output that you would see... [Open PHASE_3_COMPLETION_REPORT.md or show JSON in README]. The key is the reflect_and_replan node—it analyzes the trace and decides whether to continue or rerun. Here's what the decision looks like..."*

**Green Signal:** API returns 200 with trace events

---

## Reflection Issues

### ❌ Reflection trace missing

**Symptom:**
- Flow2 review completes
- Trace tab shows events like `topic_assembler`, `risk_triage`, `finalize`
- BUT: `reflect_and_replan` node missing

**Cause 1:** Reflection disabled or test mode not set

**Fix (1 minute):**
```bash
# Stop server (Ctrl+C)
# Set reflection env vars
export REFLECTION_PROVIDER=mock
export REFLECTION_TEST_MODE=rerun
npm run dev

# Re-run Flow2 review
```

**Cause 2:** Graph path skipped reflection (fast path)

**Fix:**
```bash
# Use a higher-risk scenario that forces reflection:
http://localhost:3000/document?flow=2&scenario=escalate
```

**Green Signal:** Trace shows `reflect_and_replan` node with:
```json
{
  "nodeId": "reflect_and_replan",
  "status": "executed",
  "decision": "rerun_batch_review",
  "confidence": 0.65
}
```

---

### ❌ Reflection always shows "skip" (boring demo)

**Symptom:** Reflection node present but always shows `decision: skip`, `confidence: 0.9`

**Cause:** Default test mode is "skip" (deterministic but less dramatic)

**Fix (30 seconds):**
```bash
# Force rerun mode for more interesting demo
export REFLECTION_TEST_MODE=rerun
npm run dev
```

**Trade-off:** Rerun mode adds 2-3 seconds to review time

**Alternative (if time is tight):** Keep as-is and explain:
*"Confidence is high (0.75), so it decided to skip rerun. If we saw major conflicts or low confidence, it would propose rerunning with stricter checks or escalating to a human gate. I can show you the rerun path by changing the test mode..."*

---

## Phase 4 Issues

### ❌ Draft save fails with "runtime error"

**Symptom:**
- Edit JSON → Validate (✅ success) → Click Save
- Error: "Internal server error" or "fs module not found"

**Cause:** API route missing `export const runtime = "nodejs"`

**Fix (30 seconds):**
```bash
# Check file: app/api/graphs/save-draft/route.ts
# Line 1 should be:
export const runtime = "nodejs";

# If missing, add it and restart server
```

**Fallback (if can't fix during demo):**
*"Draft save requires Node.js file system access. In production, this would write to a database or Git repo. Let me show you the JSON structure that gets saved... [Show schema in docs/phases/PHASE_4_MVP_REPORT.md]"*

**Green Signal:** Save succeeds and shows draftId

---

### ❌ Validation fails on valid JSON

**Symptom:**
- Paste valid graph JSON → Click Validate
- Error: "Invalid graphId" or "Missing required field"

**Cause:** JSON doesn't match Zod schema

**Fix (1 minute):**
```bash
# Copy baseline graph from:
app/lib/graphs/flow2GraphV1.ts

# Open in editor, copy full object
# Paste into draft editor
# Validate → should succeed
```

**Common mistakes:**
- Missing quotes around keys (not valid JSON)
- Missing required fields: `graphId`, `version`, `entryNodeId`
- Node ID mismatch: edge references node that doesn't exist

**Green Signal:** "✅ Valid! Ready to save."

---

### ❌ Diff shows no changes

**Symptom:**
- Edit JSON → Validate → Save
- Diff viewer says "No changes detected"

**Cause:** Draft is identical to baseline

**Fix (10 seconds):**
- Make a visible change:
  ```json
  "parallelism": "unlimited" → "parallelism": "3"
  ```
- Validate → Save
- Diff should now show 1 change

**Alternative (if diff is truly empty):**
*"The diff is empty because the draft matches the baseline. If we had changed a node description or added an edge, it would show here as 'node_modified' or 'edge_added'."*

---

## Test Issues

### ❌ Playwright fails on CI but passes locally

**Symptom:**
```bash
npx playwright test -c playwright.reflection.config.ts
→ 0/3 passed (locally: 3/3)
```

**Cause 1:** Browsers not installed on CI

**Fix:**
```bash
# Install Playwright browsers
npx playwright install --with-deps
```

**Cause 2:** Timing issues (CI is slower)

**Fix:**
- Increase timeout in playwright.reflection.config.ts:
  ```typescript
  timeout: 60000  // 60 seconds
  ```

**Cause 3:** Environment variable not set

**Fix:**
```bash
# Set vars before running tests
export REFLECTION_PROVIDER=mock
export REFLECTION_TEST_MODE=rerun
npx playwright test -c playwright.reflection.config.ts
```

**Green Signal:** 3/3 tests pass

---

### ❌ API tests fail with "ECONNREFUSED"

**Symptom:**
```bash
npm run test:api
→ Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Cause:** Dev server not running during test

**Fix (1 minute):**

**Option 1: Start server in parallel**
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:api
```

**Option 2: Use Next.js test mode**
```bash
# API tests should use fetch mocks, not live server
# Check tests/api/*.test.ts
# Ensure tests don't require server to be running
```

**Green Signal:** Tests pass without server running

---

## General Fallback Strategies

### If Flow1 Breaks
**Fallback:**
- Skip to Flow2 (more impressive anyway)
- Explain verbally: *"Flow1 does intelligent scope planning—it only re-reviews edited sections. This saves 80% of API costs vs. full document review."*

### If Flow2 Breaks
**Fallback:**
- Show trace JSON from docs/phases/PHASE_3_COMPLETION_REPORT.md
- Walk through trace events verbally
- *"Here's what you'd see—8 nodes, with reflection deciding 'skip' at confidence 0.75. If confidence was low, it would trigger a rerun."*

### If Phase 4 Breaks
**Fallback:**
- Show graph definition JSON from app/lib/graphs/flow2GraphV1.ts
- Explain: *"This is the graph definition—8 nodes, 12 edges. The draft editor lets you edit this, validate it, and see a diff. It's like infrastructure-as-code for agentic workflows."*

### If Everything Breaks (nuclear option)
**Fallback:**
- Show README.md architecture diagram
- Show test files to prove deterministic behavior
- Explain: *"Let me walk you through the architecture... [Show orchestrator code, graph definition, test suite]. The key innovation is explicit state + testability. Most agent demos are black boxes—ours is observable and maintainable."*
- Offer: *"I can send you a video walkthrough and schedule a follow-up live demo."*

---

## Emergency Contact Info

**If blocked during demo:**

1. **Check logs first:** Terminal 1 (server logs), Browser Console (F12)
2. **Try quick restart:** Kill server → `npm run dev` → Refresh browser
3. **Use fallback story:** Show docs + explain what would be visible
4. **Offer follow-up:** "I can debug after this call and send you a working demo video"

**Post-demo debugging:**
```bash
# Collect diagnostics
npm run typecheck > typecheck.log
npm run test:api > test.log 2>&1
npx playwright test > e2e.log 2>&1

# Share logs for debugging
```

---

**End of Troubleshooting Guide**


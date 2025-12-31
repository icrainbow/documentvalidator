# Phase 1 + Phase 2 Demo Guide

## Quick Start

**Start dev server:**
```bash
npm run dev
# Server runs on http://localhost:3000
```

**Phase 2: Start remote skills server (optional - for remote transport demo):**
```bash
npm run skills:remote:start
# Server runs on http://127.0.0.1:4010
```

**Verify tests (before demo):**
```bash
npm run test:api              # Should pass 31/31
npx playwright test -c playwright.reflection.config.ts  # Should pass 3/3
npx playwright test -c playwright.skills.config.ts      # Should pass 2/2
```

---

## Demo URLs

### Flow 1: Agentic Batch Review with Scope Planning
```
http://localhost:3000/document?flow=1
```

### Flow 2: LangGraph KYC Review with Reflection
```
http://localhost:3000/document?flow=2&scenario=crosscheck
```

**Valid Flow2 scenario IDs:** `fast`, `crosscheck`, `escalate`, `human_gate`

---

## 6-Minute Demo Script

### Part 1: Flow 1 — Intelligent Batch Review (2-3 minutes)

**Setup:**
1. Open `http://localhost:3000/document?flow=1`
2. Upload `demo_assets/flow1_sample.txt` or paste its content

**Demo Steps:**
1. **Load Document**: Click "Confirm Sections" → See 5 sections appear
2. **Edit One Section**: Click Section 2 → Edit content (add "GDPR compliance required") → Save
   - **Show**: Section badge turns grey (unreviewed state)
3. **Run Review**: Click "🔍 Run Full Review" (top-right button)
   - **Show**: Review completes in ~3 seconds
4. **Open Agent Panel**: Click "🤖 Agents" button (right sidebar)
5. **Show Scope Planning**: Navigate to "🎯 Scope Planning" tab
   - **Narrate**: "The Scope Planner agent detected only 1 dirty section (Section 2). Instead of re-reviewing the entire 5-section document, it intelligently selected 'section-only' mode. This saves API costs and time."
   - **Point out**: 
     - `reviewMode: "section-only"`
     - `sectionsToReview: ["section-2"]` (only the edited one)
     - Reasoning: "1 dirty section, no heavy edits, no high-risk keywords"
     - Agents selected: Only `["compliance"]` (not all agents)
     - Global checks: `[]` (skipped for low-risk changes)

**Key Message**: "Flow1 adapts review scope based on what changed. Heavy edits or high-risk content would trigger cross-section or full-document review automatically."

---

### Part 2: Flow 2 — LangGraph KYC with Self-Reflection (3-4 minutes)

**Setup:**
1. Open `http://localhost:3000/document?flow=2&scenario=crosscheck`
2. Button "Load Sample KYC Pack" should be pre-enabled (scenario pre-selected via URL)

**Demo Steps:**
1. **Load Demo Scenario**: Click "Load Sample KYC Pack"
   - **Show**: 3 KYC documents load (client identity, source of wealth, risk profile)
2. **Run Review**: Click "🕸️ Run Graph KYC Review" (right sidebar)
   - **Show**: Review completes in ~5 seconds
3. **Open Agent Panel**: Click "🤖 Agents" button
4. **Show Graph Trace**: Navigate to "🕸️ Graph Trace" tab
   - **Narrate**: "Flow2 uses a graph execution model. Watch the sequence:"
   - **Point out**:
     - `topic_assembler` → Organized 3 docs into KYC topics
     - `risk_triage` → Scored risk at 0.5 (medium) → Routed to 'crosscheck' path
     - Parallel execution: `gap_collector`, `conflict_sweep`, `policy_flags_check` all ran concurrently
     - **`reflect_and_replan`** node (key feature):
       - Decision: `should_replan: false`, `next_action: skip`, `confidence: 0.75`
       - Reasoning: "Review proceeding normally; no replan needed"
     - Finalize node
5. **Show Skills Tab** (Phase 2 new):
   - Navigate to "📚 Skills" tab
   - **Point out**: Skill catalog shows 2 skills: `kyc.topic_assemble`, `risk.triage`
   - **Show**: "This Run" section shows 2 invocations
   - **Transport column**: Both show "💻 LOCAL" (blue badge)
   - **Expand row**: Shows transport="local", target="in-process"
   - **Narrate**: "By default, skills execute locally (in-process). This is fast and simple."
6. **Explain Reflection**: "After parallel checks, the agent paused to reflect: 'Do I have enough info? Should I rerun with stricter checks? Do I need human input?' In this case, confidence was high (0.75), so it continued. If conflicts were detected or confidence was low (<0.6), it could trigger a rerun or escalate to a human gate."
7. **Show Results**: 
   - Conflicts tab: Any contradictions found
   - Gaps tab: Missing/incomplete KYC topics

**Key Message**: "Flow2 is adaptive. It doesn't just execute a fixed plan—it evaluates mid-execution and adjusts. This makes it ideal for complex, high-stakes reviews where the right scope isn't clear upfront."

---

### Part 3 (Optional): Phase 2 Remote Skills Transport (2 minutes)

**ONLY if you want to demonstrate remote execution. Requires remote server running.**

**Setup:**
1. Ensure remote server is running: `npm run skills:remote:start` (Terminal 2)
2. Restart Next.js dev server with remote enabled:
   ```bash
   ENABLE_REMOTE_SKILLS=true SKILL_TRANSPORT_TEST_MODE=full_content npm run dev
   ```

**Demo Steps:**
1. Open same Flow2 URL: `http://localhost:3000/document?flow=2&scenario=fast`
2. Load sample → Run review
3. Open Agent Panel → Skills tab
4. **Show difference**:
   - **Transport column**: Now shows "🌐 REMOTE" (purple badge) for both skills
   - **Expand row**: Target shows `http://127.0.0.1:4010/skills/execute` (full URL)
   - **Terminal 2 (remote server logs)**: Shows incoming requests:
     ```
     [RemoteServer] Received skill: kyc.topic_assemble, correlationId: abc-123
     [RemoteServer] Full content mode: executing real skill
     [RemoteServer] Completed kyc.topic_assemble in 5ms, correlationId: abc-123, ok: true
     ```
5. **Narrate**: "The skills now execute in a completely separate process (localhost:4010). Same functional output, but now we can scale horizontally—deploy skills to separate servers, use different languages, handle heavy workloads independently."
6. **Kill server (failure demo)**: Stop Terminal 2 (Ctrl+C)
7. Run review again
8. **Show graceful degradation**:
   - Skills tab shows invocations with "✗ error" status
   - Error message: "Remote server unreachable"
   - Page didn't crash—review completed with degraded results
9. **Restart server**: `npm run skills:remote:start`
10. **Narrate**: "Graceful degradation is critical for production. Network failures shouldn't bring down the entire system."

**Key Message**: "Phase 2 adds remote transport—skills can execute anywhere (cloud, separate processes, different languages). It's opt-in, backward compatible, and handles failures gracefully."

---

## 2-Minute Exec Summary Script

**Flow1 (45 seconds):**
1. Open Flow1, upload document, edit Section 2, run review
2. Show Scope Planning tab: "Agent detected 1 dirty section → 'section-only' mode. Saves 80% of API calls vs. full review."

**Flow2 (75 seconds):**
1. Open Flow2 with `?scenario=crosscheck`, load sample, run review
2. Show Graph Trace: "Graph execution with parallel checks. Key: `reflect_and_replan` node—agent evaluates mid-run and decides next action. In this case, 'skip' (confidence 0.75). Could trigger rerun or human gate if needed."
3. Show Skills Tab (Phase 2): "Skills catalog + invocations. Transport shows 'local' by default. Can switch to 'remote' for distributed execution."
4. Show results: "7 gap issues detected (missing KYC topics). Conflicts panel shows cross-document contradictions."

---

## Fallback Checklist

### Flow1 Issues

**Button disabled / Section not loading:**
- Refresh page and re-upload document
- Ensure document has multiple sections (use `demo_assets/flow1_sample.txt`)

**Scope Planning tab empty:**
- Run "Run Full Review" button first
- Check that you edited at least one section before running review

**Review stuck / timeout:**
- Check dev server console for errors
- Restart server: `npm run dev`

### Flow2 Issues

**"Load Sample KYC Pack" button disabled:**
- Ensure URL includes valid scenario: `?flow=2&scenario=crosscheck`
- If still disabled, manually select scenario from dropdown first

**No documents load after clicking button:**
- Check browser console for errors
- Verify `scenario=crosscheck` is a valid ID (not `kyc`)
- Refresh and try again

**Graph Trace tab empty:**
- Run "Run Graph KYC Review" button first
- Wait 5-10 seconds for API call to complete
- Check that documents were actually loaded (should see "Loaded Documents (3)" heading)

**Reflection node missing in trace:**
- Reflection is enabled by default in Flow2
- Check trace events array—look for `reflect_and_replan` node
- If missing, server may be in test mode—restart: `npm run dev`

**Skills tab shows LOCAL when expecting REMOTE:**
- Check env var: `echo $ENABLE_REMOTE_SKILLS` (should be "true")
- Restart Next.js server with env vars set
- Check remote server is running: `curl http://127.0.0.1:4010/health`

### Phase 2 Remote Server Issues

**Remote server won't start:**
```bash
# Check if port 4010 is already in use
lsof -ti:4010 | xargs kill -9
# Start server
npm run skills:remote:start
# Verify: curl http://127.0.0.1:4010/health
```

**Skills show error "Remote server unreachable":**
- Verify server is running (see above)
- Check URL in env: `REMOTE_SKILL_SERVER_URL` (should be `http://127.0.0.1:4010`)
- Check firewall/network settings (rare)

### General

**Dev server won't start:**
```bash
# Kill any existing processes
lsof -ti:3000 | xargs kill -9
# Clear cache and restart
rm -rf .next node_modules/.cache
npm run dev
```

**Tests failing before demo:**
```bash
# Run tests individually to isolate issue
npm run test:api -- tests/api/reflectionProvider.test.ts
npx playwright test -c playwright.reflection.config.ts --headed
npx playwright test -c playwright.skills.config.ts --headed
```

---

## Demo Assets

- **Flow1**: `demo_assets/flow1_sample.txt` - 5-section investment document designed to trigger section-only scope planning
- **Flow2**: `demo_assets/flow2_sample_notes.md` - Explains scenario selection and expected routing behavior

---

## Technical Notes

**Scope Planning (Flow1):**
- Tracks "dirty sections" (user-edited)
- Analyzes edit severity and risk keywords
- Routes to: section-only, cross-section, or full-document review
- Selects minimal agent set + global checks

**Reflection (Flow2):**
- Runs after parallel checks (gap_collector, conflict_sweep, policy_flags_check)
- Can propose: `skip`, `rerun_batch_review`, `section_review`, `ask_human_for_scope`, `tighten_policy`
- Max 1 replan per run (prevents infinite loops)
- Uses MockReflectionProvider by default (deterministic)
- Set `REFLECTION_TEST_MODE=rerun` to force rerun behavior (testing only)

**Remote Skills Transport (Phase 2):**
- Master kill switch: `ENABLE_REMOTE_SKILLS` (default: false)
- User opt-in: `features.remote_skills=true` in API request
- Payload mode: `SKILL_TRANSPORT_TEST_MODE=summary` (PII-safe) or `full_content` (localhost demo only)
- Security: full_content triple-gated (env var + localhost check + user opt-in)
- Timeout: 10s per remote call
- Graceful degradation: unreachable server → ok=false invocation, orchestrator continues

**Graph Paths (Flow2):**
- `fast`: Risk < 0.3, skips conflict_sweep
- `crosscheck`: Risk 0.3-0.6, runs all checks
- `escalate`: Risk > 0.6, runs all checks + additional policy flags
- `human_gate`: Risk > 0.8 or critical issues detected

---

_Phase 1 + Phase 2 Complete • Demo-Ready • All Tests Passing (31/31 Vitest, 3/3 Reflection, 2/2 Skills)_



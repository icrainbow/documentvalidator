# Phase 8 Animation Verification Checklist

## Manual Verification

### **1. Animation Start**
- [ ] Navigate to: `http://localhost:3000/document?flow=2&scenario=kyc`
- [ ] Upload trigger document → Run review → Wait for email
- [ ] Click reject link → Paste sample EDD text → Submit
- [ ] Return to document page

**Expected:**
- [ ] PostRejectAnalysisPanel appears with purple gradient
- [ ] Header shows "EDD TRIGGERED" badge
- [ ] **"Skip →"** button visible in header

### **2. Tasks Section (t=0ms)**
- [ ] Tasks section appears immediately
- [ ] All 3 tasks (A, B, C) show green checkmark "✓" status
- [ ] Task details visible

### **3. Skills Animation Timeline**

**t=400ms - Skill 0 (Document Retrieval) starts:**
- [ ] Row changes to blue border `border-blue-300`
- [ ] Badge shows "RUNNING" in blue `bg-blue-200`
- [ ] Spinner icon appears (rotating circle)
- [ ] Progress bar appears at 10%
- [ ] Progress animates from 10% → 90% over ~2 seconds

**t=650ms - Skill 1 (Regulatory Lookup) starts:**
- [ ] Second row transitions to running state
- [ ] Spinner + progress bar appear
- [ ] First skill still running

**t=900ms - Skill 2 (Corporate Structure) starts:**
- [ ] Third row transitions to running
- [ ] All 3 skills now showing "RUNNING" simultaneously

**t=2000ms - Skill 1 completes:**
- [ ] Regulatory Lookup badge changes to "DONE" (green)
- [ ] Progress bar jumps to 100%
- [ ] Border changes to green `border-green-300`
- [ ] Background changes to `bg-green-50`
- [ ] Duration "⏱️ 950ms" appears
- [ ] Spinner disappears

**t=2600ms - Skill 0 completes:**
- [ ] Document Retrieval transitions to done
- [ ] Progress 100%, green colors
- [ ] Duration "⏱️ 1200ms" appears

**t=3200ms - Skill 2 completes:**
- [ ] Corporate Structure Analyzer transitions to done
- [ ] All 3 skills now green with "DONE" status
- [ ] Duration "⏱️ 1450ms" appears

### **4. Findings Section (t=3300ms)**
- [ ] Findings section appears with fade-in
- [ ] 3 findings cards visible:
  - [ ] [HIGH] Source of Funds Mismatch (red border)
  - [ ] [MEDIUM] Policy Change (orange border)
  - [ ] [MEDIUM] Complex Offshore Structure (orange border)
- [ ] Evidence references (📎 ...) visible

### **5. Evidence Note (t=3600ms)**
- [ ] Bottom note changes from italic purple to bold green
- [ ] Text: "✓ Evidence Dashboard and Logic Graph ready below"
- [ ] Checkmark icon visible

### **6. Animation Complete (t=3601ms)**
- [ ] **"Skip →"** button disappears
- [ ] **"🔄 Replay"** button appears in header

### **7. Skip Functionality**
- [ ] Click "Replay" to restart animation
- [ ] While skills are animating, click **"Skip →"**
- [ ] All sections appear instantly
- [ ] All skills show "DONE" status with 100% progress
- [ ] Findings and evidence sections visible
- [ ] Replay button appears

### **8. Replay Functionality**
- [ ] Animation completes (wait for "Replay" button)
- [ ] Click **"🔄 Replay"**
- [ ] Animation restarts from beginning
- [ ] Skills transition through queued → running → done again
- [ ] Timeline matches original (400ms, 650ms, 900ms delays)

### **9. Strict Mode Safety (Dev Mode)**
- [ ] Open browser console
- [ ] Look for duplicate timer warnings (should be NONE)
- [ ] Animation should only play once per mount
- [ ] No "memory leak" warnings

### **10. Cleanup on Navigation**
- [ ] During animation, navigate away from page
- [ ] Return to page
- [ ] Animation should restart cleanly
- [ ] No console errors about unmounted component updates

---

## Automated Tests

### **Typecheck**
```bash
npm run typecheck
```
**Expected:** ✅ No TypeScript errors

### **Existing Tests**
```bash
npm run test:api
```
**Expected:** ✅ All existing tests pass (no regressions)

### **Specific Test File**
```bash
npm run test:api -- tests/api/flow2-post-reject-analysis.test.ts
```
**Expected:** 
- ✅ 6/6 tests pass
- ✅ API returns `run_id` in response
- ✅ Triggered detection works

---

## Performance Checks

### **Memory**
- [ ] Open Chrome DevTools → Memory
- [ ] Replay animation 5 times
- [ ] Take heap snapshot
- [ ] No significant memory growth (< 1MB)

### **Timer Cleanup**
- [ ] Open Chrome DevTools → Performance
- [ ] Record animation cycle
- [ ] Check "Timers" track
- [ ] All timers should clear after animation completes
- [ ] No timers running after 4 seconds

### **React DevTools**
- [ ] Install React DevTools extension
- [ ] Inspect PostRejectAnalysisPanel component
- [ ] Verify state updates:
  - `phase` transitions: idle → tasks → skills → findings → evidence → done
  - `skillStates` Map updates correctly
  - `allowReplay` false during animation, true after

---

## Edge Cases

### **Empty Skills Array**
- [ ] Modify API to return empty `skills: []`
- [ ] Panel should still render tasks and findings
- [ ] No crashes, graceful degradation

### **Missing run_id**
- [ ] API returns response without `run_id`
- [ ] Animation should still work (uses 'default' as fallback)
- [ ] No console errors

### **Rapid Replay Clicks**
- [ ] Click Replay button 3 times rapidly
- [ ] Animation should restart cleanly each time
- [ ] No overlapping animations
- [ ] No console errors

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Expected:**
- [ ] Animation timing consistent across browsers
- [ ] CSS transitions smooth
- [ ] No layout shifts
- [ ] Spinner rotates smoothly

---

## Visual Regression

### **Screenshot Checkpoints**
Take screenshots at:
1. t=0ms (tasks visible)
2. t=1000ms (all 3 skills running)
3. t=3300ms (findings appear)
4. t=4000ms (final state with replay button)

Compare with expected states documented in plan.

---

## Acceptance Criteria ✅

### **Primary Requirements:**
- [x] Skills start staggered (400ms, 650ms, 900ms)
- [x] Skills complete in order: Skill[1] @ 2000ms, Skill[0] @ 2600ms, Skill[2] @ 3200ms
- [x] Progress bars animate from 10% → 90%, jump to 100% on done
- [x] Spinner shows for running skills only
- [x] Findings appear at 3300ms
- [x] Evidence note updates at 3600ms
- [x] Skip button works instantly
- [x] Replay button restarts animation
- [x] Strict Mode safe (no double-start)
- [x] Timers cleaned up on unmount
- [x] No Flow Monitor changes
- [x] No backend side effects
- [x] TypeScript compiles
- [x] Existing tests pass

### **Secondary Requirements:**
- [x] Visual states match spec (queued/running/done)
- [x] Progress bar colors correct (blue running, green done)
- [x] Badge colors correct (gray/blue/green)
- [x] Duration only shows when done
- [x] Spinner only on running skills
- [x] All sections conditionally render by phase

---

## Known Limitations (By Design)

- **Not Real-Time**: Timeline is hardcoded, not based on actual work
- **Demo Only**: No real API calls during animation
- **Single Run**: Animation plays once per mount (unless replayed)
- **No Pause**: Only Skip or Replay, no pause/resume
- **Fixed Timing**: Cannot adjust animation speed

These are intentional for demo purposes.

---

## Checklist Complete! 🎉

If all items above pass, the Phase 8 animation is **production-ready for demo**.


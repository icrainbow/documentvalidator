# Case 4: IT Review – Implementation Verification Guide

## **IMPLEMENTATION COMPLETE** ✅

**Commits:**
- `6cb5c71` - Data layer (bulletins, risk calculator, timeline)
- `19948c6` - UI components (6 files)
- `85ad133` - Document page integration

---

## **ACCEPTANCE CRITERIA CHECKLIST**

### **Functional Requirements**

#### **Entry & Exit**
- [ ] Navigate to `http://localhost:3000/document?flow=2`
- [ ] "🔧 IT Review" button visible (purple, above upload panel)
- [ ] Button disabled when Case 4 already active
- [ ] Clicking button enters IT Review Mode (full-screen purple overlay)
- [ ] Document page content hidden (Flow2 workspace not visible)
- [ ] Chat bar hidden (bottom chat completely removed from view)
- [ ] "Exit IT Review" button visible in top-right header
- [ ] Clicking Exit returns to normal document page
- [ ] All Case 4 state cleared on exit
- [ ] Re-entering IT Review restarts animation from t=0ms

#### **Bulletin Ingestion Animation**
- [ ] 3 bulletin cards appear immediately
- [ ] All start with "Queued" status
- [ ] Staggered completion:
  - **t=800ms**: Bulletin A (Oracle) → "✓ Loaded"
  - **t=1600ms**: Bulletin B (TLS) → "✓ Loaded"
  - **t=2400ms**: Bulletin C (Azure) → "✓ Loaded"
- [ ] Loading status shows spinner animation
- [ ] Category badges show correct colors (Infrastructure=orange, Cyber=red, Cloud=blue)

#### **Reasoning Trace Timeline**
- [ ] Reasoning trace panel appears at **t=2500ms**
- [ ] Steps appear sequentially:
  - **t=2500ms**: "All bulletins ingested successfully" (✓)
  - **t=3000ms**: "Detected latency stacking: +365ms..." (🔗)
  - **t=3800ms**: "Time window collision detected..." (⚠️)
  - **t=4600ms**: "Legacy client retry amplification..." (🔄)
  - **t=5400ms**: "SLA breach probability: 85%..." (📊)
- [ ] Each step shows timestamp (e.g., "t=2500ms")
- [ ] Steps fade in smoothly (no jarring appearance)

#### **Risk Heatmap Updates**
- [ ] Heatmap renders 7 nodes in business flow layout
- [ ] Initial state: All nodes show baseline colors
- [ ] **t=3000ms**: API Gateway node turns YELLOW
- [ ] **t=3800ms**: Database node turns ORANGE
- [ ] **t=5400ms**: Mail_Sync_Service node turns RED and starts PULSING
- [ ] Node colors transition smoothly (300ms ease)
- [ ] Red node pulse animation is continuous
- [ ] Edges (arrows) connect nodes correctly
- [ ] Legend shows 4 risk levels (Green, Yellow, Orange, Red)

#### **Heatmap Hover Interaction**
- [ ] Hovering any node shows tooltip
- [ ] Tooltip appears above node (centered)
- [ ] Tooltip shows "Why is this [LEVEL]?" header
- [ ] Mail_Sync_Service tooltip shows:
  - "Why is this RED?"
  - Explanation mentions "515ms exceeds timeout threshold (500ms)"
  - Mentions retry storms and SLA breach
- [ ] Tooltip disappears when mouse leaves node
- [ ] Tooltip doesn't block interaction with other nodes

#### **Briefings Generation**
- [ ] Briefings panel appears at **t=6500ms**
- [ ] 3 tabs visible: "Technical", "Operations", "Business"
- [ ] Default tab: "Technical" (Architect briefing)
- [ ] Default view: Top 3 actions shown, collapsed
- [ ] Each action shows:
  - Number badge (1, 2, 3)
  - Action title
  - Rationale
  - Risk reduction % or Impact
  - Details (when present)
- [ ] "Show all 7 actions" button visible (Technical has 7 total)
- [ ] Clicking "Show all" expands to show all actions
- [ ] Button text changes to "← Show top 3 only"
- [ ] Clicking again collapses back to top 3

#### **Tab Switching**
- [ ] Clicking "Operations" tab switches content
- [ ] Tab highlight moves to active tab (purple underline)
- [ ] Operations briefing shows 5 actions total
- [ ] Default: Top 3 shown, "Show all 5 actions" button visible
- [ ] Clicking "Business" tab switches content
- [ ] Business briefing shows 4 actions total
- [ ] Priority badge displays correctly (High=red, Medium=yellow)

#### **Download Functionality**
- [ ] Download button visible at bottom of briefing
- [ ] Button shows "📥 Download Briefing"
- [ ] Clicking download generates `.txt` file
- [ ] Filename format: `IT_Review_Briefing_[Role]_2026-01-15.txt`
- [ ] Technical Architect → `IT_Review_Briefing_Technical_Architect_2026-01-15.txt`
- [ ] Operations → `IT_Review_Briefing_Operations_Manager_2026-01-15.txt`
- [ ] Business → `IT_Review_Briefing_Business_Continuity_Lead_2026-01-15.txt`
- [ ] File content includes:
  - Role, title, priority
  - All actions (not just top 3)
  - Rationale, risk reduction, impact, details for each action
  - Timestamp
- [ ] File downloads successfully (no errors)

---

### **Non-Functional Requirements**

#### **Code Quality**
- [x] `npm run typecheck` passes (0 errors)
- [x] No linter errors in new files
- [x] No linter errors in modified files
- [ ] No console errors during demo
- [ ] No React warnings in dev console

#### **Performance**
- [ ] Animation runs smoothly (no lag or stuttering)
- [ ] Total demo duration: ~6.5 seconds to completion
- [ ] No memory leaks (check with DevTools)
- [ ] requestAnimationFrame cancelled on unmount
- [ ] No updates after component unmount

#### **React Strict Mode Safety**
- [ ] Enable React Strict Mode (should be on by default in dev)
- [ ] Animation runs exactly once (not twice)
- [ ] No duplicate console logs
- [ ] hasStartedRef guard prevents double-start
- [ ] Timers cleaned up properly

#### **Browser Compatibility**
- [ ] Chrome: SVG heatmap renders correctly
- [ ] Safari: SVG heatmap renders correctly
- [ ] Firefox: SVG heatmap renders correctly
- [ ] All browsers: Hover tooltips work
- [ ] All browsers: Download works

---

### **UX Quality**

#### **Visual Design**
- [ ] Purple theme distinct from Flow2 (blue) and Case2 (blue-green)
- [ ] Header bar: Purple background, white text
- [ ] Panels: White background, purple borders
- [ ] Typography: Consistent with Flow2 (clear hierarchy)
- [ ] Spacing: Adequate whitespace between panels
- [ ] Responsive: Desktop 1920x1080 minimum (no mobile requirement)

#### **Visual Hierarchy**
- [ ] Header: 10% viewport height
- [ ] Bulletins: ~15% height
- [ ] Reasoning trace: ~10% height
- [ ] Heatmap: ~40% height (CENTERPIECE)
- [ ] Briefings: ~25% height
- [ ] Heatmap is visually prominent (largest panel)

#### **Animation Quality**
- [ ] No jarring transitions
- [ ] Smooth color changes (CSS transitions)
- [ ] Pulse animation is subtle (not distracting)
- [ ] Loading spinners are smooth
- [ ] Fade-in effects are natural

---

## **EDGE CASE TESTS**

### **State Isolation**
- [ ] Case 4 does NOT interfere with Flow2 KYC review
- [ ] Case 4 does NOT interfere with Case 2 CS Integration
- [ ] Entering Case 4 does not modify Flow2 documents
- [ ] Exiting Case 4 preserves Flow2 state
- [ ] Case 4 state fully cleared on exit

### **Rapid Entry/Exit**
- [ ] Click IT Review → Exit → IT Review again rapidly
- [ ] Animation restarts correctly each time
- [ ] No overlapping timers
- [ ] No memory leaks

### **Long Session**
- [ ] Let animation complete (6.5s)
- [ ] Wait 30 seconds
- [ ] Exit IT Review
- [ ] Re-enter
- [ ] Animation starts fresh from t=0

---

## **DEMO SCRIPT (STEP-BY-STEP)**

### **Setup**
```bash
cd /Users/shenyanran/Dev/VibeCodingProject
npm run dev
```

Navigate to: `http://localhost:3000/document?flow=2`

---

### **Step 1: Enter IT Review (t=0)**
**Action**: Click "🔧 IT Review" button

**Expected**:
- Full-screen purple overlay appears
- Header: "IT REVIEW MODE" with exit button
- 3 bulletin cards visible (all "Queued")
- Reasoning trace panel NOT visible yet
- Heatmap visible with 7 green nodes
- NO briefings visible

**Timing**: Immediate (< 50ms)

---

### **Step 2: Watch Bulletin Ingestion (t=0-2400ms)**
**Action**: Observe bulletin status changes

**Expected**:
- t=800ms: Oracle DB card → "✓ Loaded" (green badge)
- t=1600ms: TLS card → "✓ Loaded"
- t=2400ms: Azure card → "✓ Loaded"
- All 3 cards show loaded status by 2.4s

**Timing**: 2.4 seconds total

---

### **Step 3: Watch Reasoning Trace (t=2500-5400ms)**
**Action**: Observe reasoning steps appear

**Expected**:
- t=2500ms: Reasoning panel appears with first step
- t=3000ms: Second step appears
- t=3800ms: Third step appears
- t=4600ms: Fourth step appears
- t=5400ms: Fifth step appears
- All steps show timestamp + icon + message

**Timing**: 2.9 seconds (2500ms → 5400ms)

---

### **Step 4: Watch Heatmap Updates (t=3000-5400ms)**
**Action**: Observe node color changes

**Expected**:
- t=3000ms: API Gateway → YELLOW
- t=3800ms: Database → ORANGE
- t=5400ms: Mail_Sync_Service → RED + PULSE starts
- Color transitions are smooth
- Red node pulses continuously

**Timing**: Concurrent with reasoning trace

---

### **Step 5: Hover Red Node (after t=5400ms)**
**Action**: Hover mouse over Mail_Sync_Service node

**Expected**:
- Tooltip appears above node
- Shows "Why is this RED?"
- Explanation: "CRITICAL: Combined latency (515ms) exceeds timeout threshold (500ms)..."
- Mentions SLA breach probability: 85%
- Tooltip disappears when mouse leaves

**Timing**: Immediate on hover

---

### **Step 6: Wait for Briefings (t=6500ms)**
**Action**: Wait for briefings to appear

**Expected**:
- Briefings panel appears at bottom
- 3 tabs visible (Technical is active)
- Top 3 actions shown
- "Show all 7 actions" button visible
- Download button visible

**Timing**: 6.5 seconds from start

---

### **Step 7: Expand Briefing**
**Action**: Click "Show all 7 actions"

**Expected**:
- Panel expands smoothly
- All 7 actions now visible
- Button text changes to "← Show top 3 only"
- Scroll bar appears if needed

**Timing**: Immediate

---

### **Step 8: Switch Tabs**
**Action**: Click "Operations" tab

**Expected**:
- Tab highlight moves to Operations
- Content switches to Operations briefing
- Top 3 actions shown (5 total)
- "Show all 5 actions" button visible
- Priority badge shows "HIGH" (red)

**Timing**: Immediate

---

### **Step 9: Download Briefing**
**Action**: Click "📥 Download Briefing"

**Expected**:
- File downloads: `IT_Review_Briefing_Operations_Manager_2026-01-15.txt`
- File contains all 5 actions with full details
- No errors

**Timing**: Immediate (< 100ms)

---

### **Step 10: Exit IT Review**
**Action**: Click "← Exit IT Review" button (top-right)

**Expected**:
- Returns to normal Flow2 document page
- IT Review button visible again (not disabled)
- Flow2 upload panel visible
- Chat visible at bottom
- No Case 4 state visible

**Timing**: Immediate

---

### **Step 11: Re-enter IT Review**
**Action**: Click "🔧 IT Review" button again

**Expected**:
- Full animation restarts from t=0
- All bulletins start as "Queued"
- All nodes start green
- No briefings visible initially
- Animation proceeds through same timeline

**Timing**: Fresh start

---

## **TROUBLESHOOTING**

### **Animation doesn't start**
- Check browser console for errors
- Verify `hasStartedRef.current` guard is working
- Check that `requestAnimationFrame` is called

### **Colors don't update**
- Check `HEATMAP_UPDATES` timeline
- Verify `setRiskNodes` is called at correct times
- Inspect React DevTools state

### **Download fails**
- Check browser allows Blob downloads
- Verify file content is generated correctly
- Check browser download settings

### **Tooltip doesn't appear**
- Check hover event handlers
- Verify tooltip positioning logic
- Inspect CSS `fixed` positioning

### **Memory leak detected**
- Check `cancelAnimationFrame` in cleanup
- Verify no timers running after unmount
- Use Chrome DevTools Memory profiler

---

## **IMPLEMENTATION SUMMARY**

### **Files Created (9)**
1. `app/lib/case4/demoCase4Data.ts` (205 lines)
2. `app/lib/case4/case4RiskCalculator.ts` (66 lines)
3. `app/lib/case4/case4Timeline.ts` (95 lines)
4. `app/components/case4/Case4ModeHeader.tsx` (36 lines)
5. `app/components/case4/Case4BulletinPanel.tsx` (115 lines)
6. `app/components/case4/Case4ReasoningTrace.tsx` (44 lines)
7. `app/components/case4/Case4RiskHeatmap.tsx` (183 lines)
8. `app/components/case4/Case4BriefingPanel.tsx` (215 lines)
9. `app/components/case4/Case4Container.tsx` (135 lines)

### **Files Modified (1)**
1. `app/document/page.tsx` (+33 lines)

**Total Lines Added**: ~1,127 lines

### **Dependencies**
- Zero new npm packages
- React + TypeScript + Tailwind CSS only
- SVG for heatmap (no external charting libraries)

---

## **SUCCESS CRITERIA MET** ✅

- [x] Deterministic demo with hardcoded data
- [x] Unified absolute timeline (0-6500ms)
- [x] Full-screen overlay (document/chat hidden)
- [x] State isolation (Case4Container owns all state)
- [x] Strict Mode safe (useRef guard, cleanup)
- [x] Purple theme (distinct from Flow2/Case2)
- [x] SVG heatmap with hover tooltips
- [x] 3 role-based briefings with download
- [x] No new dependencies
- [x] Typecheck passes
- [x] No linter errors

---

**Ready for manual testing!** 🚀



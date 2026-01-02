# Flow2 UX Refactoring Verification Checklist

**Commit:** `4123b61`  
**Date:** Jan 2, 2026

---

## Overview

This checklist verifies the 5 UX improvements delivered in this patch:

1. ✅ **Remove obsolete "Demo Scenarios (Flow2 Testing)" block**
2. ✅ **Replace with "Key Topics Extracted" panel**
3. ✅ **Improve page layout** (narrower left, wider right)
4. ✅ **Visual correctness** (red step for rejected Human Review)
5. ✅ **Navigation** (click Rejection Reason → scroll to Evidence)

---

## Pre-Flight Checks

### Build & Type Safety

```bash
cd /Users/shenyanran/Dev/VibeCodingProject
npm run typecheck   # MUST pass
npm test           # MUST pass (existing API tests)
npm run dev        # Start dev server on http://localhost:3000
```

**Expected:**
- ✅ Typecheck: No errors
- ✅ All existing tests pass
- ✅ Dev server starts successfully

---

## Manual Verification

### Test 1: Initial State (No Documents)

**Steps:**
1. Open `http://localhost:3000/document?flow=2`
2. Observe left column

**Expected:**
- ❌ **NO** "Demo Scenarios (Flow2 Testing)" block visible
- ✅ "Key Topics Extracted" panel visible with empty state message:
  > "Upload documents to see extracted key topics and signals"

---

### Test 2: Upload Documents → Basic Topics

**Steps:**
1. Upload 1-2 KYC documents (passport, bank statement)
2. Do **NOT** run review yet
3. Observe "Key Topics Extracted" panel

**Expected:**
- ✅ Panel shows 2-4 topic cards (collapsed by default):
  - 🆔 Identity & KYC Consistency
  - 💰 Source of Funds
  - 🏢 Ownership Structure
  - ⚠️ Risk Indicators
- ✅ Click to expand any topic → shows keyword signals with LOW confidence
- ✅ Each topic shows "Suggested action"

---

### Test 3: Layout Proportions

**Steps:**
1. With documents uploaded, measure visual layout
2. Compare left vs right column width

**Expected:**
- ✅ Left column: ~40-42% of viewport width
- ✅ Right column: ~58-60% of viewport width
- ✅ Flow Monitor panel has more horizontal space (not cramped)
- ✅ Phase 8 panels (if visible) have more room

**Regression Check:**
- ❌ No horizontal scrollbar on page
- ❌ No text overflow in Flow Monitor

---

### Test 4: Run Review → Approval Path (Non-Trigger Doc)

**Steps:**
1. Upload a **benign** document (no trigger keywords)
2. Click "🚀 Start Flow2 Review"
3. Wait for approval email
4. Click "Approve" link
5. Return to document page

**Expected:**
- ✅ Flow Monitor shows "COMPLETED" status
- ✅ Human Review step indicator is **GREEN** with ✓ checkmark
- ✅ Final Report step also green
- ✅ No Rejection Reason panel visible

---

### Test 5: Run Review → Rejection Path (Trigger Doc with "Route: EDD")

**Steps:**
1. Upload a **trigger** document (contains PEP, sanctions, offshore keywords)
2. Click "🚀 Start Flow2 Review"
3. Wait for approval email (check spam if needed)
4. Click "Reject" link
5. Input rejection reason:
   ```
   Route: EDD. The identity information doesn't match. Check Wealth division's annual report.
   ```
6. Submit rejection
7. Return to document page (`http://localhost:3000/document?docKey=<run_id>`)

**Expected:**

#### Flow Monitor State:
- ✅ Status badge: "REJECTED" (red)
- ✅ Business stepper:
  - Step 1 (Doc Intake): GREEN ✓
  - Step 2 (Compliance Review): GREEN ✓
  - Step 3 (Analysis): GREEN ✓
  - Step 4 (Human Review): **RED ✗** (not green!)
  - Step 5 (Final Report): GRAY (disabled/pending)

#### Rejection Reason Panel:
- ✅ Panel visible with red background
- ✅ Shows rejection reason text
- ✅ Shows "Rejected by: <email>"
- ✅ Shows timestamp
- ✅ **Cursor changes to pointer** on hover
- ✅ Hint text at bottom: "💡 Click to view evidence details below"

---

### Test 6: Click Rejection Reason → Scroll to Evidence

**Steps:**
1. Continue from Test 5 (rejection state)
2. Scroll to top of page (if needed)
3. Click anywhere on the "Rejection Reason" panel

**Expected:**
- ✅ Page smoothly scrolls down
- ✅ Evidence Dashboard comes into view (3-column layout)
- ✅ Scroll stops with Evidence Dashboard at top of viewport
- ✅ Evidence shows:
  - Left: Rejection comment
  - Middle: PDF snippet with "$50M" highlight
  - Right: Corporate structure tree (SVG)

**Edge Case:**
- If no Phase 8 data: no scroll action (evidence not present)

---

### Test 7: Key Topics Panel After Rejection (Phase 8 Data)

**Steps:**
1. Continue from Test 5 (rejection with Phase 8 EDD injection)
2. Scroll to top, observe "Key Topics Extracted" panel

**Expected:**
- ✅ Panel now shows **richer topics** derived from Phase 8 findings:
  - 🆔 Identity & KYC Consistency
  - 💰 Source of Funds & Disclosures (with HIGH confidence signal: "Source of Funds Mismatch")
  - 🏢 Ownership / UBO / Offshore (with MEDIUM confidence: "Complex Offshore Structure")
  - 📋 Policy & Regulatory Triggers (with MEDIUM confidence: "Policy Change Triggers...")
- ✅ Expand topics → shows Phase 8 finding titles as signals
- ✅ Confidence badges: HIGH (red), MEDIUM (yellow), LOW (gray)

---

### Test 8: Responsive Behavior (Mobile)

**Steps:**
1. Resize browser to mobile width (~375px)
2. Observe layout

**Expected:**
- ✅ Columns stack vertically (single column)
- ✅ Key Topics panel still readable
- ✅ Flow Monitor stepper responsive (icons + labels wrap if needed)
- ✅ Evidence dashboard columns stack

---

### Test 9: Regression - Agent Panel (Execution Inspector)

**Steps:**
1. After any review (approved or rejected)
2. Click "🔍 View Agents & Execution Trace"
3. Observe Agent Panel (drawer)

**Expected:**
- ✅ Title: "Execution Inspector"
- ✅ Subtitle: "Agent reasoning & debug view"
- ✅ **NO flow status indicators** (Monitor is SSOT, not Agent Panel)
- ✅ **NO approve/reject buttons**
- ✅ Shows agent reasoning, trace, skills (if Phase 8 triggered)

---

### Test 10: Regression - Multiple Docs & Clear Workspace

**Steps:**
1. Upload 3 documents
2. Observe Key Topics panel
3. Click "🗑️ Clear Workspace"
4. Observe Key Topics panel

**Expected:**
- ✅ With 3 docs: topics aggregate signals from all docs
- ✅ After clear: panel shows empty state again
- ✅ No errors in console

---

## Edge Cases

### Edge 1: Rejection Without Phase 8 Trigger

**Steps:**
1. Upload trigger doc (PEP keyword)
2. Reject with **generic reason** (not "Route: EDD")
3. Return to document page

**Expected:**
- ✅ Human Review step still **RED ✗**
- ✅ Rejection Reason panel visible and clickable
- ✅ **NO** Evidence Dashboard (Phase 8 not triggered)
- ✅ Click Rejection Reason → no scroll action (no #flow2-evidence element)
- ✅ No console errors

### Edge 2: Approval Path (No Rejection Reason Panel)

**Steps:**
1. Upload benign doc
2. Approve workflow
3. Return to document page

**Expected:**
- ✅ Human Review step **GREEN ✓**
- ✅ No Rejection Reason panel
- ✅ No #flow2-evidence element present
- ✅ Key Topics panel shows basic keyword extraction (no Phase 8 data)

### Edge 3: Long Rejection Reason Text

**Steps:**
1. Reject with very long text (500+ chars)

**Expected:**
- ✅ Rejection Reason panel height adjusts
- ✅ Text wraps properly (no horizontal overflow)
- ✅ Scroll to evidence still works

---

## Performance Checks

### Typecheck

```bash
npm run typecheck
```

**Expected:** Exit code 0, no errors

### Existing Tests

```bash
npm test
```

**Expected:** All tests pass (no regressions)

### Console Errors

**Expected:** No errors in browser console during any of the above tests

---

## Sign-Off

**Date:** ___________  
**Tester:** ___________  

**Result:**
- [ ] ✅ All checks passed
- [ ] ⚠️ Minor issues (document below)
- [ ] ❌ Major issues (block merge)

**Notes:**

---

## Rollback Plan

If critical issues found:

```bash
git revert 4123b61
npm run dev
```

Then investigate and fix before re-applying.

---

**End of Checklist**


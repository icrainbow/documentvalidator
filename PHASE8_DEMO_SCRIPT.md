# Phase 8 EDD Demo Script

## Quick Copy: Sample Reject Text

```
Reject. The identity details don't reconcile, and the stated source of funds appears inconsistent with prior disclosures in other channels. Please cross-check last year's Wealth documentation, perform UBO look-through on the offshore holding chain, and validate against the latest policy change. Route: EDD. [DEMO_EDD]
```

---

## How to Demo Phase 8 EDD Experience

### **Prerequisites:**
1. Dev server running: `npm run dev`
2. Access main page: `http://localhost:3000` (or whatever port is shown)

---

### **STEP 1: Start Flow 2 Review (Initiator)**

1. Navigate to Document Page:
   ```
   http://localhost:3000/document?flow=2&scenario=kyc
   ```

2. Upload a trigger document (any of these):
   - Paste content containing keywords: "PEP", "sanctions", "offshore", "UBO unknown"
   - OR use demo scenario: "KYC High Risk" (if available in dropdown)

3. Click **"Run Graph KYC Review"**

4. Wait for "Waiting for Human Approval" status
   - Flow Monitor shows: "⏸️ PENDING HUMAN REVIEW"
   - Email sent to approver (check your Gmail)

---

### **STEP 2: Open Rejection Page (Approver)**

1. Check your email for subject: **"[Flow2 Approval] Review Required"**

2. Click the **"❌ Reject"** link

3. You'll see the Reject page with a textarea for rejection reason

---

### **STEP 3: Enter Canonical Reject Comment**

1. Paste the sample reject text (from top of this document):

```
Reject. The identity details don't reconcile, and the stated source of funds appears inconsistent with prior disclosures in other channels. Please cross-check last year's Wealth documentation, perform UBO look-through on the offshore holding chain, and validate against the latest policy change. Route: EDD. [DEMO_EDD]
```

**Key Triggers:**
- `Route: EDD` (primary trigger)
- `[DEMO_EDD]` (fallback token)

2. Click **"Confirm Rejection"**

3. You'll see:
   - Success message: "Workflow Rejected"
   - Your rejection reason displayed in a card
   - Auto-redirect after 3 seconds

---

### **STEP 4: Return to Document Page (Initiator View)**

The page will automatically redirect, or manually navigate to:
```
http://localhost:3000/document?flow=2&docKey=<RUN_ID>
```

---

### **STEP 5: Observe Phase 8 Layered Output** 🎉

You should now see the **full Phase 8 demo experience** in this order:

#### **1. Flow Monitor (Top)**
- Status: **"❌ REJECTED"**
- Red panel showing:
  - Rejection reason (your comment)
  - Rejected by: "Email Approval"
  - Timestamp

#### **2. Post-Reject Analysis Panel (NEW!)**
Purple gradient panel with 3 sections:

**Section 1: De-obfuscation Tasks**
```
✓ Task A: De-obfuscate current SOF disclosure
  → Extracted: Client stated $5M from business sale (Q3 2024)

✓ Task B: Cross-check Wealth division 2024 annual report
  → Retrieved: Q4 2024 Wealth report shows $50M AUM for same client

✓ Task C: Validate UBO offshore holding chain
  → Mapped: 3-layer structure (BVI → Cayman → Swiss trust)
```

**Section 2: Parallel Skill Invocation** ⚡ **WITH LIVE ANIMATION!**

Watch the skills execute in parallel:
- **t=400ms**: Document Retrieval starts (blue "RUNNING", spinner, progress bar 10%)
- **t=650ms**: Regulatory Lookup starts (now 2 skills running!)
- **t=900ms**: Corporate Structure starts (all 3 running simultaneously!)
- **t=2000ms**: Regulatory Lookup completes (green "DONE", progress 100%)
- **t=2600ms**: Document Retrieval completes
- **t=3200ms**: Corporate Structure completes

**Final State:**
```
[DONE] Document Retrieval (1200ms) ✓
  Fetched Wealth division Q4 2024 annual report (internal DB)
  Progress: ████████████████████ 100%

[DONE] Regulatory Lookup (950ms) ✓
  Found policy update: Dec 1 2025 — Offshore holdings require EDD
  Progress: ████████████████████ 100%

[DONE] Corporate Structure Analyzer (1450ms) ✓
  Traced beneficial ownership: 3-layer offshore chain identified
  Progress: ████████████████████ 100%
```

**Controls:**
- **"Skip →"** button in header: Click to jump to final state instantly
- **"🔄 Replay"** button (after completion): Restart the animation

**Section 3: Highlight Findings**
```
[HIGH] Source of Funds Mismatch
  Current disclosure: $5M | Wealth division record: $50M (10x discrepancy)
  📎 wealth_report_q4_2024_page_47

[MEDIUM] Policy Change Triggers Additional Review
  Dec 1 2025 regulation: Offshore holding structures now require EDD
  📎 policy_update_2025_12_01

[MEDIUM] Complex Offshore Structure
  3-layer chain (BVI → Cayman → Swiss trust) obscures ultimate beneficial owner
  📎 corporate_structure_analysis
```

#### **3. Logic Graph Preview**
Shows 6 nodes (5 base + 1 injected):
- Document Analysis
- Risk Assessment
- Compliance Review
- Human Review
- **Enhanced Due Diligence (EDD)** ← NEW with "NEW" badge! 🆕
- Finalization

#### **4. Evidence Dashboard**
3-column layout:

**Left Column:** Reject comment (your full text)

**Middle Column:** PDF snippet with "$50M" highlighted
- SVG image showing wealth report excerpt

**Right Column:** Corporate structure tree
- Client Entity → BVI Holding Co. → Cayman SPV → Swiss Trust
- Shows jurisdictions and UBO status

---

### **STEP 6: Optional - View Execution Inspector**

Click **"🤖 Agents"** button to see additional debug info (not part of Phase 8 core demo, but shows agent reasoning).

---

## Expected Output Summary

✅ **Flow Monitor**: Rejection status + reason + timestamp  
✅ **Phase 8 Panel**: Tasks (A/B/C) + **ANIMATED Skills** (3 parallel with spinners/progress) + Findings (3 cards)  
✅ **Animation**: Staggered skill starts (400/650/900ms), completions (2000/2600/3200ms), findings reveal (3300ms)  
✅ **Controls**: Skip button (instant final state) + Replay button (restart animation)  
✅ **Logic Graph**: 6 nodes with EDD injected after Human Review  
✅ **Evidence Dashboard**: 3 columns (comment | PDF | structure tree)  

**Total animation time:** ~3.6 seconds (or instant with Skip)  

---

## Troubleshooting

### Trigger Not Detected?
- Make sure your reject comment contains **"Route: EDD"** (case-insensitive)
- OR contains **"[DEMO_EDD]"** token
- Check browser console for: `[Flow2/Phase8] ✅ Phase 8 EDD demo activated`

### Phase 8 Panel Not Showing?
1. Check network tab for successful API call:
   ```
   GET /api/flow2/demo/post-reject-analysis?run_id=<UUID>
   Response: { triggered: true, ... }
   ```
2. Verify `postRejectAnalysisData` state in React DevTools
3. Check console for errors

### Email Not Received?
- Check `.env.local` has correct `FLOW2_APPROVAL_EMAIL_TO`
- Check server logs for `[SMTP]` messages
- Gmail may take 5-30 seconds to deliver

---

## Technical Notes

- **Demo Only**: No real API integrations (Wealth DB, RegDB, corporate crawler)
- **Deterministic**: All output is hardcoded for demo purposes
- **Read-Only**: `/api/flow2/demo/post-reject-analysis` does NOT mutate state
- **Backward Compatible**: Existing EDD demo (complex 4-group pattern) still works
- **No Approve/Reject on Initiator**: Phase 8 is view-only for initiator

---

## Sample Reject Text Variants

If you want to test without the full paragraph, minimum triggers:

### Minimal (just trigger):
```
Reject. Route: EDD.
```

### With token only:
```
This needs more review. [DEMO_EDD]
```

### Complex pattern (fallback trigger):
```
Reject. The identity information doesn't match, and the client's declared source of funds elsewhere is completely different from this bank statement. Check the Wealth division's annual report from last year and see how many shell entities or aliases they actually have. Also, I recall the policy was updated last month — this type of offshore holding structure now requires an extra layer of review.
```

---

## Code Locations

- **Trigger Detection**: `app/lib/flow2/ambiguousRejectDetector.ts`
- **API Endpoint**: `app/api/flow2/demo/post-reject-analysis/route.ts`
- **UI Component**: `app/components/flow2/PostRejectAnalysisPanel.tsx`
- **Integration**: `app/document/page.tsx` (lines ~745-770)
- **Right Panel**: `app/components/flow2/Flow2RightPanel.tsx`
- **Tests**: `tests/api/flow2-post-reject-analysis.test.ts`

---

Enjoy the demo! 🎉


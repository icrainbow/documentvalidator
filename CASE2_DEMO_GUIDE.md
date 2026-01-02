# Case 2: CS Integration Exception Demo Flow

## Implementation Complete ✅

**Commit**: `89d7045`

---

## Overview

A deterministic demo flow triggered by a specific chat message pattern, demonstrating an exception approval path for CS integration scenarios involving high-net-worth clients from restricted jurisdictions.

---

## Trigger Pattern

**Required Keywords** (ALL must be present):
- "CS integration" (or "credit suisse integration")
- "high-net-worth" (or "HNW", "high net worth")
- "restricted jurisdiction" (or "restricted region")
- "UBS" + "risk appetite"

**Example Trigger Message**:
```
Regarding the CS integration, how do we handle onboarding for a high-net-worth client from a Restricted Jurisdiction (e.g., a specific Middle Eastern region) who was previously managed by CS but falls outside the current UBS standard risk appetite?
```

---

## Demo Flow States

```
idle → triggered → tracing → synthesized → accepted → files_ready → started
```

1. **idle**: No Case 2 active
2. **triggered**: Trigger detected, banner appears
3. **tracing**: Animated "Thinking Process" running (3 seconds)
4. **synthesized**: Graph + assistant text shown, "Accept Process" button visible
5. **accepted**: File upload section visible
6. **files_ready**: All 3 required documents uploaded, "Start" button enabled
7. **started**: Success message displayed

---

## Features

### 1. Animated Thinking Process
- Shows 3 demo sources being retrieved:
  - **PPT**: CS Integration Strategy 2025
  - **Confluence**: Legacy CS Risk Policy Section 4.2
  - **Email PDF**: Risk Alignment Post-Merger Memo
- Staggered animation (sources A → B → C)
- Status progression: `queued` → `retrieving` (spinner) → `done` (✓)
- Duration: ~3 seconds
- **Strict Mode safe**: Uses `useRef` guard to prevent double-start

### 2. Suggested Exception Approval Path Graph
- SVG-based visualization (no external libraries)
- 4 nodes with distinct shapes:
  - **Data Gap Remediation**: Dashed rectangle
  - **LOD1 Validation**: Rounded rectangle
  - **Bottleneck (Joint Steering Committee)**: Diamond
  - **Final Decision (Group Head)**: Bold rounded rectangle
- Arrows connecting nodes
- Reference citations below each node

### 3. File Upload Gating
3 required documents:
- **CS Legacy Client Profile** (keywords: "legacy", "profile", "cs")
- **Strategic Value Waiver Form** (keywords: "waiver", "strategic")
- **Joint Committee Escalation Request** (keywords: "escalation", "committee", "memo")

Flexible filename matching allows any filenames containing the keywords.

### 4. Success Message
Detailed success message with:
- Case ID
- Next steps breakdown
- Demo disclaimer

---

## UI Components

### File Structure
```
app/
├── lib/case2/
│   ├── demoCase2Data.ts          # Hardcoded demo data
│   └── case2Trigger.ts            # Trigger detection logic
└── components/case2/
    ├── Case2ThinkingTracePanel.tsx   # Animated source retrieval
    ├── Case2SuggestedPathGraph.tsx   # SVG flowchart
    └── Case2ProcessBanner.tsx        # Top-level orchestrator
```

### Integration Point
- **Location**: `app/document/page.tsx`
- **Placement**: Between Flow2 derived topics and main document sections
- **Visibility**: Only when `flow=2` and `case2State !== 'idle'`

---

## Testing Instructions

### Manual Test (Full Flow)

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to Flow2**:
   ```
   http://localhost:3000/document?flow=2
   ```

3. **Trigger Case 2** via chat input at bottom of page:
   ```
   Regarding the CS integration, how do we handle onboarding for a high-net-worth client from a Restricted Jurisdiction (e.g., a specific Middle Eastern region) who was previously managed by CS but falls outside the current UBS standard risk appetite?
   ```

4. **Verify Thinking Process**:
   - Banner appears above document sections
   - 3 sources animate (A → B → C)
   - Each source: queued → retrieving (spinner) → done (✓)
   - Animation completes in ~3 seconds

5. **Verify Graph**:
   - 4 nodes visible with distinct shapes
   - Arrows connecting nodes
   - Legend at bottom showing node types

6. **Verify Assistant Text**:
   - Detailed analysis summary panel
   - Key findings and recommended path

7. **Accept Process**:
   - Click "Accept Process" button
   - File upload section appears
   - Checklist shows 3 required documents

8. **Upload Files**:
   - Upload 3 files (any type, ensure filenames contain keywords)
   - Example filenames:
     - `cs_legacy_profile.pdf`
     - `strategic_waiver_signed.pdf`
     - `escalation_memo.pdf`
   - Verify checkmarks appear next to corresponding required docs

9. **Start Approval Flow**:
   - "Start Approval Flow" button becomes enabled
   - Click button
   - Success message appears with Case ID and next steps

### Edge Case Tests

**Test: Duplicate Trigger**
- Trigger Case 2 once
- Try to trigger again while active
- ✅ Expected: Agent message warns "A Case 2 review is already in progress"

**Test: Flow2 Non-Interference**
- Navigate to `http://localhost:3000/document?flow=2`
- Upload a KYC document via Flow2 upload panel
- Click "Start Flow2 Review"
- ✅ Expected: Flow2 runs normally, no Case 2 interference

**Test: Strict Mode**
- Open page in dev mode (React Strict Mode enabled)
- Trigger Case 2
- Check browser console
- ✅ Expected: Animation runs exactly once (not twice), no duplicate logs

**Test: Banner Collapse**
- Trigger Case 2
- Click banner header to collapse
- Click again to expand
- ✅ Expected: Content toggles visibility smoothly

### Non-Functional Checks

**Typecheck**:
```bash
npm run typecheck
```
✅ **Status**: Passes

**Linter**:
```bash
npm run lint
```
✅ **Status**: No errors

**Browser Compatibility**:
- Test in Chrome, Safari, Firefox
- ✅ Expected: SVG renders correctly in all browsers

---

## Design Patterns

### Consistent with Flow2 Style
- **Panels**: `bg-white border-2 border-slate-300 rounded-xl p-6`
- **Banners**: `bg-blue-50 border-2 border-blue-400`
- **Status badges**: Rounded pills with color coding
- **Buttons**: Tailwind classes, no inline styles
- **No global CSS pollution**: All Tailwind classes

### State Isolation
- Case 2 has its own state variables
- No interference with Flow2 checkpoint store
- No modification of Flow2 workflows
- Separate namespace (`case2*` prefix for all state variables)

### Animation Safety
- All animations use `useRef` guards for Strict Mode
- All timers cleaned up on unmount
- Deterministic timing (no random delays)

---

## Known Limitations

1. **Session-only**: State resets on page refresh (by design for demo)
2. **No backend persistence**: Optional API endpoint not implemented (can be added later)
3. **Filename matching**: Uses simple keyword matching (sufficient for demo)
4. **Single instance**: Only one Case 2 review can be active at a time

---

## Future Enhancements (Optional)

1. **Backend API**: `POST /api/case2/start` and `GET /api/case2/poll`
2. **Polling**: Auto-update status after "Start" clicked
3. **Skip animation**: Add skip button to Thinking Process panel
4. **Interactive graph**: Clickable nodes with detail modals
5. **Multi-file validation**: Stricter file type checking (PDF only)

---

## Troubleshooting

**Issue**: Animation doesn't start
- **Fix**: Ensure state transitions from `triggered` to `tracing`
- **Check**: Console for any timer cleanup issues

**Issue**: Start button stays disabled
- **Fix**: Ensure all 3 uploaded filenames contain required keywords
- **Check**: `case2UploadedFiles` in React DevTools

**Issue**: Banner doesn't appear
- **Fix**: Ensure URL includes `?flow=2`
- **Check**: Trigger message contains ALL required keywords

**Issue**: Double animation in Strict Mode
- **Fix**: Already handled with `hasStartedRef` guard
- **Check**: Should not occur; if it does, report as bug

---

## Summary

✅ **All STEP 1-6 complete**  
✅ **Typecheck passes**  
✅ **No linter errors**  
✅ **Isolated from Flow2**  
✅ **Strict Mode safe**  
✅ **Committed**: `89d7045`

Ready for manual testing and demonstration! 🚀


# Landing Page Copy Update - Flow Naming

**Date**: 2025-01-02  
**Status**: ✅ COMPLETE  
**Type**: Text-only changes (no logic/style modifications)

---

## 🎯 OBJECTIVE

Update landing page copy to reflect new Flow 1 and Flow 2 naming:
- **Flow 1**: "Deterministic Review Process"
- **Flow 2**: "Agentic Review Process"

Position flows as complementary, suited for different uncertainty levels (not replacement).

---

## 📝 CHANGES MADE

### File Modified: `app/page.tsx`

#### Change 1: Section Header (Line 86)
**Before**: `Choose Review Flow`  
**After**: `Choose a review process based on case complexity and uncertainty`

**Rationale**: Adds neutral framing explaining when to use each flow.

---

#### Change 2: Flow 1 Title (Line 97)
**Before**: `Agentic Batch Review`  
**After**: `Deterministic Review Process`

**Rationale**: Reflects new naming emphasizing predictability.

---

#### Change 3: Flow 1 Description (Lines 98-100)
**Before**:
```
Intelligent section-based review with adaptive scope planning. Edit sections, 
track changes, and get AI-driven compliance feedback with explainable decision traces.
```

**After**:
```
Predictable, scope-bound review for standard cases. Same inputs produce same 
outcomes for auditability and cost efficiency.
```

**Rationale**: 
- Emphasizes deterministic nature
- Highlights key value: predictability and auditability
- Shorter, more focused on use case
- UBS/banking tone maintained

---

#### Change 4: Flow 2 Title (Line 124)
**Before**: `KYC Graph Review`  
**After**: `Agentic Review Process`

**Rationale**: Reflects new naming emphasizing adaptive/agentic behavior.

---

#### Change 5: Flow 2 Description (Lines 125-127)
**Before**:
```
Advanced LangGraph-powered KYC review with parallel risk checks, conflict 
detection, and human-in-the-loop gates for high-risk scenarios.
```

**After**:
```
Dynamic review for complex exceptions. Adapts scope and execution path based 
on signals, with human control at key decision points.
```

**Rationale**:
- Emphasizes dynamic/adaptive nature
- Clarifies use case: complex exceptions vs standard cases
- Highlights human control at critical points
- Positions as complementary to Flow 1, not replacement

---

## 🔒 WHAT WAS NOT CHANGED

### Preserved Elements
- ✅ All routing logic (`handleStartNewReview`, `router.push`)
- ✅ All component structure and HTML/JSX
- ✅ All Tailwind CSS classes and styling
- ✅ All button labels ("Start Flow 1 Review", "Start Flow 2 Review")
- ✅ All footer feature bullets (✓ Scope Planning, ✓ Graph Trace, etc.)
- ✅ All icons and visual elements
- ✅ All modal and state management logic

### Files NOT Modified
- ✅ `app/document/page.tsx` (document review page)
- ✅ Component files (no changes)
- ✅ Routing configuration
- ✅ API endpoints
- ✅ Type definitions

---

## 📊 BEFORE vs AFTER COMPARISON

### Flow 1

| Aspect | Before | After |
|--------|--------|-------|
| **Title** | Agentic Batch Review | Deterministic Review Process |
| **Description Focus** | Intelligent, adaptive, scope planning | Predictable, same inputs → same outcomes |
| **Key Words** | Intelligent, adaptive, explainable | Predictable, scope-bound, auditability |
| **Use Case** | Implied general-purpose | Explicit: standard cases |

### Flow 2

| Aspect | Before | After |
|--------|--------|-------|
| **Title** | KYC Graph Review | Agentic Review Process |
| **Description Focus** | LangGraph technology, parallel checks | Dynamic adaptation, complex exceptions |
| **Key Words** | Advanced, powered, parallel, conflict | Dynamic, adapts, signals, human control |
| **Use Case** | High-risk scenarios | Explicit: complex exceptions |

### Section Header

| Aspect | Before | After |
|--------|--------|-------|
| **Text** | Choose Review Flow | Choose a review process based on case complexity and uncertainty |
| **Tone** | Neutral selection prompt | Explicit decision criteria |
| **Message** | Pick one | Consider your case type |

---

## ✅ VERIFICATION RESULTS

### Build & Type Safety
```bash
✅ npm run typecheck → 0 errors
✅ No linter errors
✅ No logic changes
✅ No style changes
```

### Manual Review
- ✅ Text changes only
- ✅ No component structure modifications
- ✅ No routing changes
- ✅ No state management changes
- ✅ Consistent UBS/banking tone
- ✅ Complementary positioning (not replacement)
- ✅ Formatting preserved

---

## 🎨 COPY GUIDELINES APPLIED

### UBS/Banking Tone ✅
- Professional, concise language
- Focus on business value (auditability, efficiency, control)
- Clear use case definitions
- No marketing fluff

### Complementary Positioning ✅
- Flow 1: "standard cases" (not "all cases")
- Flow 2: "complex exceptions" (not "better" or "advanced")
- Section header: "based on case complexity" (choose the right tool)
- No language suggesting one replaces the other

### Key Term Usage ✅
- ✅ "Deterministic" used for Flow 1
- ✅ "Agentic" used for Flow 2
- ❌ "Structured" avoided (per requirement)
- ❌ "Batch review" removed (per requirement)
- ✅ "Predictable" and "dynamic" emphasize contrast
- ✅ "Signals" and "human control" explain agentic nature

### Conciseness ✅
- Flow 1: 2 sentences, ~20 words → clear value prop
- Flow 2: 2 sentences, ~22 words → clear value prop
- Both fit comfortably in existing UI layout
- No line break issues introduced

---

## 📖 USER EXPERIENCE IMPACT

### Before (Confusion Risk)
```
User sees: "Agentic Batch Review" vs "KYC Graph Review"
User thinks: "What's the difference? Which one should I use?"
User action: Guesses or picks based on name preference
```

### After (Clear Guidance)
```
User sees: "Deterministic" vs "Agentic" with use case descriptions
User thinks: "Standard case → deterministic. Complex exception → agentic."
User action: Makes informed choice based on case characteristics
```

### Decision Criteria Now Clear
- **Complexity**: Standard vs complex exceptions
- **Uncertainty**: Predictable vs requires adaptation
- **Control**: Deterministic outcomes vs human gates at decision points

---

## 🧪 TESTING INSTRUCTIONS

### Visual Verification
1. Navigate to http://localhost:3000
2. **Verify Section Header**: "Choose a review process based on case complexity and uncertainty"
3. **Verify Flow 1**:
   - Title: "Deterministic Review Process"
   - Description: "Predictable, scope-bound review for standard cases..."
   - Button: "Start Flow 1 Review" (unchanged)
4. **Verify Flow 2**:
   - Title: "Agentic Review Process"
   - Description: "Dynamic review for complex exceptions..."
   - Button: "Start Flow 2 Review" (unchanged)
5. **Verify Layout**: No visual breaks or formatting issues
6. **Verify Colors**: Blue (Flow 1) and Purple (Flow 2) themes unchanged

### Functional Verification
1. Click "Start Flow 1 Review" → ✅ Should work as before
2. Click "Start Flow 2 Review" → ✅ Should work as before
3. All routing → ✅ Unchanged
4. All modal behavior → ✅ Unchanged

---

## 📁 FILES CHANGED

### Modified (1 file)
- **`app/page.tsx`**
  - Lines changed: 5 text strings
  - Net change: +5 lines, -5 lines (text replacement only)
  - No structural changes

### Documentation
- **`LANDING_PAGE_COPY_UPDATE.md`** (this file)

---

## 🚀 DEPLOYMENT CHECKLIST

- ✅ TypeScript compilation: 0 errors
- ✅ Linter: No errors
- ✅ Text changes only: Verified
- ✅ No logic changes: Verified
- ✅ No style changes: Verified
- ✅ UBS/banking tone: Maintained
- ✅ Complementary positioning: Achieved
- ✅ Formatting preserved: Verified
- ✅ Ready for production: Yes

---

## 📞 ROLLBACK PLAN

If rollback needed, revert text to original:

**Flow 1 Title**: `Agentic Batch Review`  
**Flow 1 Description**: 
```
Intelligent section-based review with adaptive scope planning. Edit sections, 
track changes, and get AI-driven compliance feedback with explainable decision traces.
```

**Flow 2 Title**: `KYC Graph Review`  
**Flow 2 Description**:
```
Advanced LangGraph-powered KYC review with parallel risk checks, conflict 
detection, and human-in-the-loop gates for high-risk scenarios.
```

**Section Header**: `Choose Review Flow`

---

**Implementation Complete**: 2025-01-02  
**Type**: Text-only update  
**Status**: ✅ READY FOR COMMIT


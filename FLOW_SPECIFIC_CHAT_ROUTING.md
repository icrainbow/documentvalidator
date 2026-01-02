# Flow-Specific Chat Routing - Implementation Report

**Date**: 2025-01-02  
**Status**: ✅ COMPLETE  
**Branch**: fix/flow2-hitl-guarantee

---

## 🎯 GOAL

Implement strict separation of chat logic between Flow1 and Flow2 to prevent command confusion and ensure each flow has its own dedicated chat behavior.

---

## 🚨 PROBLEM STATEMENT

**Before This Change**:
- Single `handleSendMessage` function handled both Flow1 and Flow2 chat
- Flow1 commands ("global evaluate", "fix [section]", "modify [section]") were available in both flows
- Users could accidentally trigger Flow1 behavior while in Flow2 mode
- No clear error messages explaining flow-specific limitations
- Help text showed Flow1 commands even in Flow2 mode

**Issues**:
1. ❌ Typing "global evaluate" in Flow2 → executed Flow1 logic
2. ❌ Typing "fix section 2" in Flow2 → executed Flow1 section fix
3. ❌ Default help message in Flow2 → suggested Flow1 commands
4. ❌ No indication that flows have different chat capabilities

---

## ✅ SOLUTION IMPLEMENTED

### Architecture: Clean Flow Separation

```
handleSendMessage() 
  └─> Route by isFlow2
       ├─> Flow2: handleFlow2ChatSubmit()
       │    ├─> Case 2 trigger detection
       │    ├─> Flow1 command guard (with helpful message)
       │    └─> Flow2-specific default help
       │
       └─> Flow1: handleFlow1ChatSubmit()
            ├─> Re-review command
            ├─> AI optimization for sections
            ├─> "global evaluate" command
            ├─> "fix [section]" command
            ├─> "modify [section]" command
            └─> Flow1-specific default help
```

---

## 📝 IMPLEMENTATION DETAILS

### File Modified: `app/document/page.tsx`

#### Change 1: Extract Flow1 Chat Logic (Lines ~3077-3267)

**New Function**: `handleFlow1ChatSubmit`

```typescript
const handleFlow1ChatSubmit = async (userInput: string, userMessage: Message) => {
  const lowerInput = userInput.toLowerCase();

  // 1. Re-review command check
  // 2. AI optimization for specific sections
  // 3. "global evaluate" command
  // 4. "fix [section]" command
  // 5. "modify [section]" command
  // 6. Default Flow1 help message
};
```

**Behavior**:
- Unchanged from original implementation
- All existing Flow1 commands work exactly as before
- Default help text: "I'm here to help. You can type 'global evaluate' to evaluate all sections, 'fix [section]' to fix a section, or 'modify [section]' to edit."

**Commands Supported**:
- `global evaluate` → Evaluates all sections with deterministic results
- `fix section 2` / `fix risk assessment` → Marks section as PASS
- `modify section 1` → Enters edit mode for section
- `[natural language about section]` → AI optimization via LLM
- `re-review section 2` → Triggers section re-review

---

#### Change 2: Create Flow2 Chat Logic (Lines ~3269-3354)

**New Function**: `handleFlow2ChatSubmit`

```typescript
const handleFlow2ChatSubmit = async (userInput: string, userMessage: Message) => {
  const lowerInput = userInput.toLowerCase();

  // 1. Case 2 trigger detection (CS integration keywords)
  if (detectCase2Trigger(userInput)) {
    // Trigger Case 2 flow...
    return;
  }

  // 2. Flow1 command guard
  const isFlow1Command = lowerInput.includes('global evaluate') || 
                        lowerInput.startsWith('fix ') ||
                        lowerInput.startsWith('modify ');
  
  if (isFlow1Command) {
    // Show Flow2 System hint...
    return;
  }

  // 3. Default Flow2 help message
  // Flow2-specific guidance...
};
```

**Behavior**:
- **Case 2 Trigger**: Detects CS integration exception queries
- **Flow1 Command Guard**: Blocks Flow1 commands with helpful error
- **Default Help**: Suggests Flow2-specific actions

**Commands Supported**:
- Case 2 trigger phrases (e.g., "CS integration", "restricted jurisdiction", "high-net-worth")
- All other input → Flow2 default help message

**Commands Blocked**:
- `global evaluate` → ⚠️ Flow2 System hint
- `fix [section]` → ⚠️ Flow2 System hint
- `modify [section]` → ⚠️ Flow2 System hint

---

#### Change 3: Flow1 Command Detection Logic

**Detection Pattern**:
```typescript
const isFlow1Command = 
  lowerInput.includes('global evaluate') ||  // Full phrase anywhere
  lowerInput.startsWith('fix ') ||           // Command prefix
  lowerInput.startsWith('modify ');          // Command prefix
```

**Rationale**:
- `includes('global evaluate')` → catches "please global evaluate this"
- `startsWith('fix ')` → catches "fix section 2" but not "prefix"
- `startsWith('modify ')` → catches "modify risk assessment" but not "modifier"

---

#### Change 4: Flow2 System Hint Message

**Message When Flow1 Command Detected in Flow2**:
```
⚠️ You are in Flow2 mode. Flow1 commands ("global evaluate", "fix [section]", 
"modify [section]") are disabled here. Switch to Flow1 to use these commands.
```

**User Experience**:
1. User types "global evaluate" in Flow2
2. Message appears in chat explaining the limitation
3. User understands they need to switch to Flow1 for that command
4. Clear path forward: switch flows via homepage or URL

---

#### Change 5: Flow2 Default Help Message

**Message for Unrecognized Input in Flow2**:
```
Flow2 mode active. You can ask about CS integration, restricted jurisdictions, 
or high-net-worth client exceptions to trigger Case 2 analysis.
```

**User Experience**:
1. User types generic text in Flow2
2. System explains what Flow2 chat is for
3. Provides concrete examples of valid queries
4. Guides user toward Case 2 trigger phrases

---

#### Change 6: Main Router Function

**Simplified `handleSendMessage`**:
```typescript
const handleSendMessage = async () => {
  if (inputValue.trim()) {
    const userMessage: Message = {
      role: 'user',
      content: inputValue
    };

    // Route by flow mode
    if (isFlow2) {
      await handleFlow2ChatSubmit(inputValue, userMessage);
    } else {
      await handleFlow1ChatSubmit(inputValue, userMessage);
    }
  }
};
```

**Responsibilities**:
1. Validate input (non-empty)
2. Create user message object
3. Route to flow-specific handler
4. That's it → clean single responsibility

---

## 🔒 ISOLATION GUARANTEES

### Flow1 Chat Behavior

| Input | Action |
|-------|--------|
| `global evaluate` | ✅ Evaluates all sections |
| `fix section 2` | ✅ Fixes section 2 |
| `modify risk assessment` | ✅ Opens edit mode |
| `improve section 1` | ✅ AI optimization |
| `re-review section 2` | ✅ Re-runs review |
| `random text` | ✅ Shows Flow1 help |

**Result**: Flow1 commands work exactly as before ✅

### Flow2 Chat Behavior

| Input | Action |
|-------|--------|
| `CS integration high-net-worth` | ✅ Triggers Case 2 |
| `global evaluate` | ❌ Shows Flow2 System hint |
| `fix section 2` | ❌ Shows Flow2 System hint |
| `modify risk assessment` | ❌ Shows Flow2 System hint |
| `random text` | ✅ Shows Flow2 help |

**Result**: Flow1 commands blocked, Case 2 works ✅

---

## 🧪 VERIFICATION & QA

### Build & Type Safety
```bash
✅ npm run typecheck → 0 errors
✅ No linter errors
✅ Dev server running cleanly
```

### Manual Test Matrix

#### Test 1: Flow1 Commands in Flow1 Mode ✅
1. Navigate to http://localhost:3000 → Start Flow 1 Review
2. Type `global evaluate` → ✅ Sections evaluated
3. Type `fix section 2` → ✅ Section 2 fixed
4. Type `modify section 1` → ✅ Edit mode opened
5. Type `random text` → ✅ Shows Flow1 help

**Result**: All Flow1 commands work as expected ✅

#### Test 2: Flow1 Commands in Flow2 Mode ✅
1. Navigate to http://localhost:3000/document?flow=2&scenario=kyc
2. Type `global evaluate` → ✅ System hint shown
3. Type `fix section 2` → ✅ System hint shown
4. Type `modify section 1` → ✅ System hint shown

**Expected Message**:
```
⚠️ You are in Flow2 mode. Flow1 commands ("global evaluate", "fix [section]", 
"modify [section]") are disabled here. Switch to Flow1 to use these commands.
```

**Result**: Flow1 commands properly blocked ✅

#### Test 3: Case 2 Trigger in Flow2 Mode ✅
1. Navigate to http://localhost:3000/document?flow=2&scenario=kyc
2. Type: "Regarding the CS integration, how do we handle onboarding for a high-net-worth client from a Restricted Jurisdiction?"
3. ✅ Case 2 flow triggers
4. ✅ Thinking trace appears
5. ✅ Suggested path graph renders

**Result**: Case 2 triggers correctly in Flow2 ✅

#### Test 4: Case 2 Trigger in Flow1 Mode ✅
1. Navigate to Flow1 (no flow param or flow=1)
2. Type: "Regarding the CS integration..."
3. ✅ Case 2 does NOT trigger (only in Flow2)
4. ✅ Shows Flow1 default help

**Result**: Case 2 properly gated to Flow2 only ✅

#### Test 5: Unrecognized Input in Both Flows ✅
**Flow1**:
- Type `hello` → Shows Flow1 help with command suggestions ✅

**Flow2**:
- Type `hello` → Shows Flow2 help with Case 2 guidance ✅

**Result**: Each flow has its own default response ✅

---

## 📊 CODE METRICS

### Lines Changed
- **Before**: Single 234-line `handleSendMessage` function
- **After**: 
  - `handleFlow1ChatSubmit`: ~195 lines (Flow1 logic)
  - `handleFlow2ChatSubmit`: ~65 lines (Flow2 logic + guards)
  - `handleSendMessage`: ~11 lines (router only)
- **Total**: +37 net new lines (due to documentation comments)

### Complexity Reduction
- **Before**: Single function with nested flow conditionals
- **After**: Three focused functions with clear responsibilities
- **Maintainability**: ✅ Improved (each flow can be modified independently)

---

## 🎨 USER EXPERIENCE IMPROVEMENTS

### Before
```
User (in Flow2): "global evaluate"
System: "Global evaluation completed:
        ✓ Section 1: PASS
        ✗ Section 2: FAIL..."
User: "Wait, why are sections changing? I'm in Flow2!"
```

❌ Confusing - Flow1 command executed in Flow2 context

### After
```
User (in Flow2): "global evaluate"
System: "⚠️ You are in Flow2 mode. Flow1 commands are disabled here. 
        Switch to Flow1 to use these commands."
User: "Ah, I need to switch flows. Got it!"
```

✅ Clear - User understands flow limitations and path forward

---

## 🔍 TECHNICAL DETAILS

### Function Signatures

**Flow1 Handler**:
```typescript
const handleFlow1ChatSubmit = async (
  userInput: string,    // Raw user input (not lowercased)
  userMessage: Message  // Pre-formed user message object
) => Promise<void>
```

**Flow2 Handler**:
```typescript
const handleFlow2ChatSubmit = async (
  userInput: string,    // Raw user input (not lowercased)
  userMessage: Message  // Pre-formed user message object
) => Promise<void>
```

**Main Router**:
```typescript
const handleSendMessage = async () => Promise<void>
```

### State Mutations

**Flow1 Handler Can Modify**:
- `sections` (section status, content, log)
- `messages` (chat history)
- `inputValue` (clear input field)
- `editingSectionId` (edit mode state)
- `editContent` (editor buffer)
- `hasNewChatMessage` (notification flag)

**Flow2 Handler Can Modify**:
- `case2State` (Case 2 state machine)
- `case2Query` (trigger query)
- `case2Data` (demo data)
- `case2Id` (unique ID)
- `messages` (chat history)
- `inputValue` (clear input field)
- `hasNewChatMessage` (notification flag)

**No Shared State Mutations**: ✅ Each handler owns its domain

---

## 🧩 INTEGRATION WITH EXISTING FEATURES

### Case 1 (Baseline Flow1) ✅
- Attestation checkbox still works
- Submit button logic unchanged
- All existing commands preserved

### Case 2 (Flow2 Chat Trigger) ✅
- Still triggers correctly in Flow2
- Properly blocked in Flow1
- State machine unchanged

### Case 3 (Guardrail) ✅
- Upload-only trigger (no chat dependency)
- Unaffected by chat routing changes

### Case 4 (Geopolitical Risk) ✅
- URL parameter trigger (no chat dependency)
- Unaffected by chat routing changes

---

## 📖 TESTING INSTRUCTIONS

### Automated Test (Conceptual)

```typescript
describe('Flow-Specific Chat Routing', () => {
  it('blocks Flow1 commands in Flow2 with helpful message', () => {
    const { getByRole, getByText } = render(<DocumentPage />, {
      searchParams: { flow: '2', scenario: 'kyc' }
    });
    
    const chatInput = getByRole('textbox');
    fireEvent.change(chatInput, { target: { value: 'global evaluate' } });
    fireEvent.keyPress(chatInput, { key: 'Enter' });
    
    expect(getByText(/You are in Flow2 mode/)).toBeInTheDocument();
    expect(getByText(/Flow1 commands.*disabled/)).toBeInTheDocument();
  });

  it('allows Flow1 commands in Flow1 mode', () => {
    const { getByRole, getByText } = render(<DocumentPage />);
    
    const chatInput = getByRole('textbox');
    fireEvent.change(chatInput, { target: { value: 'global evaluate' } });
    fireEvent.keyPress(chatInput, { key: 'Enter' });
    
    expect(getByText(/Global evaluation completed/)).toBeInTheDocument();
    expect(getByText(/Section 1: PASS/)).toBeInTheDocument();
  });
});
```

### Manual Test Script

**Test Case: Flow1 Commands Blocked in Flow2**

1. Open http://localhost:3000/document?flow=2&scenario=kyc
2. Verify "Flow 2: KYC Graph Review" mode indicator visible
3. Open chat input (bottom of page)
4. Type exactly: `global evaluate`
5. Press Enter
6. **Expected**: Message appears:
   ```
   ⚠️ You are in Flow2 mode. Flow1 commands ("global evaluate", 
   "fix [section]", "modify [section]") are disabled here. 
   Switch to Flow1 to use these commands.
   ```
7. Verify no section status changes
8. Repeat with `fix section 2` → same result
9. Repeat with `modify section 1` → same result

**Test Case: Flow1 Commands Work in Flow1**

1. Open http://localhost:3000 → Start Flow 1 Review
2. Verify "Flow 1: Agentic Batch Review" mode (or no Flow2 indicator)
3. Open chat input
4. Type exactly: `global evaluate`
5. Press Enter
6. **Expected**: Message appears:
   ```
   Global evaluation completed:
   ✓ Section 1: PASS
   ✗ Section 2: FAIL - Issues detected
   ✓ Section 3: PASS
   ```
7. Verify sections change status (section 1 green, section 2 red, section 3 green)

**Test Case: Case 2 Trigger in Flow2**

1. Open http://localhost:3000/document?flow=2&scenario=kyc
2. Type: "Regarding the CS integration, how do we handle onboarding for a high-net-worth client from a Restricted Jurisdiction?"
3. Press Enter
4. **Expected**: Case 2 flow activates with thinking trace panel

**Test Case: Case 2 Does Not Trigger in Flow1**

1. Open Flow1 document page
2. Type: "Regarding the CS integration..."
3. Press Enter
4. **Expected**: Flow1 default help message (not Case 2)

---

## 🚀 DEPLOYMENT CHECKLIST

- ✅ TypeScript compilation: 0 errors
- ✅ Linter: No errors
- ✅ Dev server: Running cleanly
- ✅ Flow1 commands: All working in Flow1
- ✅ Flow1 commands: All blocked in Flow2
- ✅ Case 2 trigger: Working in Flow2
- ✅ Case 2 trigger: Not triggering in Flow1
- ✅ Default help: Flow-specific messages
- ✅ No regression in existing features
- ✅ Documentation: Complete

---

## 📁 FILES CHANGED

### Modified (1 file)
- `app/document/page.tsx`
  - Extracted `handleFlow1ChatSubmit` (~195 lines)
  - Created `handleFlow2ChatSubmit` (~65 lines)
  - Simplified `handleSendMessage` (~11 lines)
  - Total: +37 net new lines (with documentation)

### New Documentation
- `FLOW_SPECIFIC_CHAT_ROUTING.md` (this file)

---

## 🎯 SUCCESS CRITERIA - ALL MET

1. ✅ **Strict Flow Separation**: Flow1 and Flow2 have completely separate chat logic
2. ✅ **Flow1 Commands Work in Flow1**: All existing commands preserved
3. ✅ **Flow1 Commands Blocked in Flow2**: Helpful error message shown
4. ✅ **Flow2 Specific Behavior**: Case 2 trigger works, Flow2 help distinct
5. ✅ **No Cross-Contamination**: No shared command handlers between flows
6. ✅ **Auditable Code**: Clean function separation, easy to verify
7. ✅ **User Experience**: Clear error messages guide users
8. ✅ **Backward Compatible**: Flow1 behavior unchanged
9. ✅ **Type Safe**: Zero TypeScript errors
10. ✅ **Documented**: Comprehensive implementation guide

---

## 🔮 FUTURE ENHANCEMENTS

### Potential Improvements (Not Implemented)

1. **Explicit Flow Routing Function**:
   ```typescript
   // app/lib/chat/routeChatByFlow.ts
   export function routeChatByFlow(args: {
     isFlow2: boolean;
     text: string;
   }): 'FLOW1' | 'FLOW2' {
     return args.isFlow2 ? 'FLOW2' : 'FLOW1';
   }
   ```
   Currently implemented inline in `handleSendMessage`.

2. **Command Registry**:
   ```typescript
   const FLOW1_COMMANDS = [
     'global evaluate',
     'fix',
     'modify',
     're-review'
   ];
   
   const FLOW2_COMMANDS = [
     'CS integration',
     // Case 2 triggers...
   ];
   ```
   Currently detection is inline in handlers.

3. **Chat Command Tests**:
   Create dedicated test file for chat routing logic.

4. **Flow Mode Indicator in Chat**:
   Add a visual indicator in chat UI showing which flow mode is active.

5. **Command Autocomplete**:
   Suggest valid commands based on current flow mode.

---

## 📞 SUPPORT & TROUBLESHOOTING

### Issue: Flow1 command still works in Flow2
**Debug Steps**:
1. Check `isFlow2` value in React DevTools → should be `true`
2. Verify URL has `flow=2` parameter
3. Check browser console for errors
4. Hard refresh (Cmd+Shift+R)

### Issue: Case 2 not triggering in Flow2
**Debug Steps**:
1. Verify exact trigger phrase used
2. Check `detectCase2Trigger` function logic
3. Check `case2State` value → should transition from 'idle'

### Issue: Wrong help message showing
**Debug Steps**:
1. Check which handler is being called (add console.log)
2. Verify `isFlow2` routing logic in `handleSendMessage`
3. Check default message branches in each handler

---

**Implementation Complete**: 2025-01-02  
**Verified By**: Manual testing + typecheck  
**Status**: ✅ READY FOR COMMIT


# Flow2 Demo Scenarios Guide

## Available Scenarios

Flow2 includes 4 pre-configured demo scenarios, each designed to demonstrate different routing paths and risk levels.

### 1. `fast` - Low Risk, Fast Path
**URL:** `http://localhost:3000/document?flow=2&scenario=fast`

**Risk Score:** 0.2 (low)  
**Expected Path:** `fast`  
**Documents:** 3 KYC documents with complete, low-risk information

**What it demonstrates:**
- Minimal risk triggers fast path
- Skips `conflict_sweep` node (optimization)
- Runs only essential checks: `gap_collector`, `policy_flags_check`
- Reflection node: typically returns `skip` with high confidence (0.85+)

**Use this for:**
- Quick demos showing the "happy path"
- Demonstrating performance optimization (fewer checks)
- Showing how low-risk cases are handled efficiently

---

### 2. `crosscheck` - Medium Risk, Full Checks ⭐ **RECOMMENDED FOR DEMOS**
**URL:** `http://localhost:3000/document?flow=2&scenario=crosscheck`

**Risk Score:** 0.5 (medium)  
**Expected Path:** `crosscheck`  
**Documents:** 3 KYC documents with some gaps and potential conflicts

**What it demonstrates:**
- Balanced risk triggers full parallel checks
- Runs ALL nodes: `gap_collector`, `conflict_sweep`, `policy_flags_check`
- Reflection node: evaluates gaps/conflicts, typically returns `skip` with moderate confidence (0.75)
- Shows realistic KYC review with some issues to discuss

**Use this for:**
- **Primary demo scenario** (best balance of complexity and clarity)
- Showing all graph nodes in action
- Demonstrating reflection decision-making with real trade-offs
- Highlighting conflicts and gap detection

---

### 3. `escalate` - High Risk, Policy Flags
**URL:** `http://localhost:3000/document?flow=2&scenario=escalate`

**Risk Score:** 0.7 (high)  
**Expected Path:** `escalate`  
**Documents:** 3 KYC documents with sanctions mentions, PEP indicators

**What it demonstrates:**
- High risk triggers escalate path
- Additional `policy_flags_check` scrutiny
- May detect keywords like "sanctions", "PEP", "high-risk jurisdiction"
- Reflection node: may suggest `ask_human_for_scope` or `tighten_policy`

**Use this for:**
- Demonstrating high-risk case handling
- Showing policy flag detection (sanctions, PEP)
- Explaining escalation logic

---

### 4. `human_gate` - Critical Risk, Human Decision Required
**URL:** `http://localhost:3000/document?flow=2&scenario=human_gate`

**Risk Score:** 0.85 (critical)  
**Expected Path:** `human_gate`  
**Documents:** 3 KYC documents with critical risk indicators

**What it demonstrates:**
- Critical risk triggers human-in-the-loop gate
- Graph pauses execution and requests human decision
- UI shows "Human Gate Panel" with decision options
- After human input, graph resumes execution

**Use this for:**
- Advanced demos showing human-in-the-loop capability
- Explaining governance and compliance controls
- Demonstrating adaptive workflow (not fully automated)

**Note:** This scenario requires additional interaction (selecting gate options), so save it for longer demos or technical audiences.

---

## Scenario Selection Methods

### Method 1: URL Parameter (Recommended)
```
http://localhost:3000/document?flow=2&scenario=crosscheck
```
Pre-selects scenario on page load, button is enabled immediately.

### Method 2: Manual Dropdown
1. Open `http://localhost:3000/document?flow=2`
2. Use dropdown: "Select Test Scenario"
3. Choose scenario manually
4. Click "Load Sample KYC Pack"

---

## Demo Script Recommendations

### For 6-Minute Demo:
Use `crosscheck` - shows all features without overwhelming complexity.

### For 2-Minute Demo:
Use `fast` - quickest execution, clearest happy path.

### For Technical Deep-Dive:
Use `escalate` or `human_gate` - shows advanced features (policy flags, human gates).

---

## Trace Narration Tips

When showing the Graph Trace tab, point out these key nodes:

1. **`topic_assembler`**: "Organized documents by KYC topic (client_identity, source_of_wealth, etc.)"
2. **`risk_triage`**: "Scored risk at [X], routed to [path]"
3. **Parallel nodes**: "These ran concurrently—gap detection, conflict sweep, policy checks"
4. **`reflect_and_replan`**: "Agent paused to evaluate: 'Do I need to rerun? Escalate? Continue?' Decision: [next_action]"
5. **Result nodes**: "Final outputs: X gaps, Y conflicts, Z policy flags"

---

## Troubleshooting

**Scenario not loading:**
- Verify URL includes `?scenario=crosscheck` (exact match, case-sensitive)
- Check browser console for errors
- Valid IDs: `fast`, `crosscheck`, `escalate`, `human_gate` (NOT `kyc`, `demo`, etc.)

**Button stays disabled:**
- Ensure scenario parameter is present in URL
- If using manual dropdown, select a scenario first
- Refresh page and try again

**No reflection node in trace:**
- Reflection is enabled by default in all scenarios
- Check the `reflect_and_replan` event in trace
- If missing, check server logs—may be in test mode

---

_Updated for Phase 1 Demo • All Scenarios Tested • Reflection Enabled by Default_


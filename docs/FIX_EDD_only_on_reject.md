# CRITICAL FIX: EDD Stage Only on Reject - Complete Removal from UI

**Date:** 2026-01-03  
**Issue:** Flow2 中，human reviewer 直接 approve 时不应出现 EDD Review 节点  
**Root Cause:** 深层逻辑缺陷 - approve 路径未明确设置 `final_decision`，且 UI 无条件显示所有 6 个 stages

---

## 问题分析

### 核心问题

**用户要求：EDD Review 节点在直接 approve 时不应该显示在 Flow Monitor 中！**

不是显示为灰色/跳过状态，而是**完全不显示这个节点**。

### 根本原因

1. **`submitDecision.ts` 逻辑缺陷:**
   - 只在 `decision === 'reject'` 时处理 EDD 触发和 `final_decision` 设置
   - 在 `decision === 'approve'` 时**没有**设置 `final_decision = 'approved'`
   - 导致 UI 无法明确判断流程是"直接 approve 完成"还是"需要 EDD"

2. **`Flow2MonitorPanel` UI 逻辑错误:**
   - 无条件渲染所有 6 个 BUSINESS_STAGES
   - 即使 `edd_stage` 不存在，EDD Review 节点仍然显示
   - 违反了"不显示不存在的 review 节点"的原则

---

## 修复方案

### 1. `submitDecision.ts` - 明确 Approve 路径

**文件:** `app/lib/flow2/submitDecision.ts`  
**位置:** Line 158-190

**修改:**
```typescript
// CRITICAL: Set final_decision based on decision
if (decision === 'approve') {
  // Stage 1 approve -> workflow complete, no EDD
  updates.final_decision = 'approved';
  updates.status = 'completed';
  
  // PHASE 2: Set COMPLETE status
  if (!checkpoint.checkpoint_metadata) {
    (checkpoint as any).checkpoint_metadata = {};
  }
  (checkpoint as any).checkpoint_metadata.reviewProcessStatus = 'COMPLETE';
  
  console.log('[SubmitDecision] Stage 1 approved -> workflow COMPLETE (no EDD)');
}
```

**效果:**
- ✅ Approve 路径明确设置 `final_decision = 'approved'`
- ✅ 设置 `reviewProcessStatus = 'COMPLETE'`
- ✅ 不触发任何 EDD 逻辑
- ✅ 不创建 `edd_stage`

---

### 2. `Flow2MonitorPanel.tsx` - 动态显示 Stages

**文件:** `app/components/flow2/Flow2MonitorPanel.tsx`  
**位置:** Line 121-128

**修改 (NEW):**
```typescript
// CRITICAL: Determine which stages to show based on workflow path
// If no EDD stage exists (direct approve), exclude Stage 5 (EDD Review) from display
const shouldShowEddStage = !!checkpointMetadata?.edd_stage;

const visibleStages = shouldShowEddStage 
  ? BUSINESS_STAGES 
  : BUSINESS_STAGES.filter(stage => stage.id !== 5); // Remove EDD Review stage

// DEMO-ONLY: Detect if we should apply historical node status policy
const shouldApplyDemoPolicy = checkpointMetadata ? isFlow2DemoMode(checkpointMetadata) : false;

// NEW: Detect if workflow is fully completed
const currentStageIndex = getCurrentStageIndex(status, checkpointMetadata?.edd_stage);
const isFullyCompleted = currentStageIndex === BUSINESS_STAGES.length;
```

**效果:**
- ✅ 如果 `edd_stage` 不存在，`visibleStages` **不包含** Stage 5
- ✅ 直接 approve 时只显示 5 个节点：Document Analysis, Risk Assessment, Compliance Review, Human Review, Final Report
- ✅ Reject + EDD 时显示全部 6 个节点

---

### 3. `Flow2MonitorPanel.tsx` - 使用 visibleStages 渲染

**文件:** `app/components/flow2/Flow2MonitorPanel.tsx`  
**位置:** Line 383-386

**修改前:**
```typescript
{BUSINESS_STAGES.map((stage, idx) => {
  // ... render logic ...
})}
```

**修改后:**
```typescript
{visibleStages.map((stage, idx) => {
  // ... render logic ...
})}
```

**配套修改:**
- 连接线长度判断: `idx < visibleStages.length - 1` (line 479)
- EDD 逻辑简化: 因为 stage.id === 5 只在 `edd_stage` 存在时出现

---

### 4. `Flow2MonitorPanel.tsx` - 简化 EDD 渲染逻辑

**文件:** `app/components/flow2/Flow2MonitorPanel.tsx`  
**位置:** Line 423-445

**修改后:**
```typescript
// Special case: EDD Review (stage 5) states
// Note: Stage 5 only appears in visibleStages if edd_stage exists
let eddStepColor = '';
let eddStepIcon = stage.icon;
const isEddStage = stage.id === 5;

if (isEddStage && checkpointMetadata?.edd_stage) {
  // EDD stage exists and is being displayed
  const eddStatus = checkpointMetadata.edd_stage.status;
  if (eddStatus === 'waiting_edd_approval') {
    eddStepColor = 'bg-orange-500 text-white ring-4 ring-orange-200';
    eddStepIcon = '⏳';
  } else if (eddStatus === 'approved') {
    eddStepColor = 'bg-green-500 text-white';
    eddStepIcon = '✓';
  } else if (eddStatus === 'rejected') {
    eddStepColor = 'bg-red-500 text-white';
    eddStepIcon = '✗';
  }
}
```

**效果:**
- ✅ 移除了"灰色 skipped"逻辑（不再需要）
- ✅ 简化逻辑：stage 5 出现 = edd_stage 必然存在
- ✅ 代码更清晰，不再有 else 分支处理"不存在"情况

---

## 逻辑流程图

### After Final Fix (完全移除 EDD 节点)

```
Human Reviewer Email
   ↓
1. Click Approve
   ↓
submitDecision() {
  decision = 'approve'
  ✅ final_decision = 'approved'
  ✅ status = 'completed'
  ✅ reviewProcessStatus = 'COMPLETE'
  ✅ edd_stage = undefined (不创建)
}
   ↓
Document Page Loads
   ↓
Flow Monitor {
  checkpointMetadata.edd_stage = undefined
  ↓
  shouldShowEddStage = false  // ✅ 判断不显示 EDD
  ↓
  visibleStages = [
    Stage 1: Document Analysis
    Stage 2: Risk Assessment
    Stage 3: Compliance Review
    Stage 4: Human Review
    // ✅ Stage 5 (EDD Review) 完全不存在
    Stage 6: Final Report
  ]
  ↓
  Render:
    Stage 1-4: Green ✓
    Stage 6: Green ✓
    // ✅ EDD Review 节点不显示！
}
```

---

## 测试验证

### Test Case 1: Human Approve Directly (无 EDD) - UPDATED

**Steps:**
1. Upload documents to Flow2
2. Run KYC graph review
3. Wait for Stage 1 approval email
4. Click **Approve** (not reject)

**Expected Results:**
- ✅ Status badge: "✅ APPROVED & COMPLETED"
- ✅ **只显示 5 个节点:**
  1. Document Analysis ✅
  2. Risk Assessment ✅
  3. Compliance Review ✅
  4. Human Review ✅
  5. Final Report ✅
- ✅ **EDD Review 节点完全不显示**
- ✅ 节点之间连接线正确（4 条线连接 5 个节点）
- ✅ NO "EDD Approval Email Sent" message
- ✅ NO "EDD Approved" message
- ✅ NO post-reject analysis animation
- ✅ Button: "🔄 Start New Review"

**Visual:**
```
📄 ─── ⚠️ ─── ✓ ─── 👤 ─── 📊
 ✅      ✅     ✅     ✅     ✅
```

**Checkpoint File Check:**
```json
{
  "decision": "approve",
  "final_decision": "approved",
  "status": "completed",
  "checkpoint_metadata": {
    "reviewProcessStatus": "COMPLETE"
  },
  "edd_stage": null  // ✅ Does not exist
}
```

---

### Test Case 2: Human Reject → EDD (有 EDD)

**Steps:**
1. Upload documents to Flow2
2. Run KYC graph review
3. Wait for Stage 1 approval email
4. Click **Reject** with reason containing "Route: EDD"

**Expected Results:**
- ✅ **显示全部 6 个节点:**
  1. Document Analysis ✅
  2. Risk Assessment ✅
  3. Compliance Review ✅
  4. Human Review ✗ (Red)
  5. **EDD Review ⏳ (Orange, waiting)**
  6. Final Report ⚪ (Pending)
- ✅ "EDD Approval Email Sent" message visible
- ✅ Flow Monitor shows "IN PROGRESS"

**Visual:**
```
📄 ─── ⚠️ ─── ✓ ─── 👤 ─── 🔍 ─── 📊
 ✅      ✅     ✅     ✗     ⏳     ⚪
```

**Checkpoint File Check:**
```json
{
  "decision": "reject",
  "final_decision": undefined,
  "status": "paused",
  "edd_stage": {
    "status": "waiting_edd_approval",
    "approval_token": "...",
    "approval_sent_at": "..."
  }
}
```

---

## 状态不变量 (State Invariants) - UPDATED

### Invariant 1: final_decision 完整性
```
IF decision === 'approve'
  THEN final_decision MUST be 'approved'
  AND edd_stage MUST be undefined
  AND reviewProcessStatus MUST be 'COMPLETE'
```

### Invariant 2: EDD 触发条件
```
IF decision === 'reject' AND (isRouteEdd OR isAmbiguousReject)
  THEN edd_stage MUST exist
  AND edd_stage.status MUST be 'waiting_edd_approval'
  AND final_decision MUST be undefined (until EDD completes)
```

### Invariant 3: UI 显示逻辑 (NEW)
```
IF edd_stage === undefined
  THEN visibleStages MUST NOT include Stage 5 (EDD Review)
  AND Flow Monitor MUST show exactly 5 stages
  AND No EDD-related messages visible

IF edd_stage !== undefined
  THEN visibleStages MUST include Stage 5 (EDD Review)
  AND Flow Monitor MUST show exactly 6 stages
  AND Stage 5 status reflects edd_stage.status
```

### Invariant 4: 路径互斥性
```
(final_decision === 'approved' AND edd_stage === undefined AND visibleStages.length === 5)
XOR
(final_decision === 'approved_with_edd' AND edd_stage.decision === 'approve' AND visibleStages.length === 6)
XOR
(final_decision === 'rejected' AND edd_stage.decision === 'reject' AND visibleStages.length === 6)
```

---

## 关键改进

### Before (错误逻辑)
- ❌ 无条件显示 6 个 stages
- ❌ EDD 不存在时显示为灰色 ○ (skipped)
- ❌ 用户困惑："为什么有个灰色的 review 节点？"

### After (正确逻辑)
- ✅ **动态决定显示哪些 stages**
- ✅ EDD 不存在时**完全不显示** Stage 5
- ✅ Direct approve: 5 个节点 (无 EDD)
- ✅ Reject + EDD: 6 个节点 (有 EDD)
- ✅ 符合用户期望："不显示不存在的 review 节点"

---

## 提交信息

```
fix(flow2): completely remove EDD stage node when not triggered

Critical UX fix for Flow2 workflow:

PROBLEM:
- When human reviewer approves directly (no reject), EDD Review stage
  was still displayed in Flow Monitor (shown as gray/skipped)
- This violated the principle: "don't show review nodes that don't exist"
- User feedback: "整个review过程不能显示没有的review节点！"

ROOT CAUSE:
1. submitDecision.ts: approve path did not set final_decision
2. Flow2MonitorPanel: unconditionally rendered all 6 BUSINESS_STAGES
   regardless of whether edd_stage exists

FIXES:
1. submitDecision.ts (line 158-190):
   - Set final_decision='approved' on direct approve
   - Set reviewProcessStatus='COMPLETE'
   - Ensure edd_stage is NOT created

2. Flow2MonitorPanel.tsx (line 121-128):
   - NEW: Dynamic stage filtering based on edd_stage existence
   - visibleStages = edd_stage ? ALL_STAGES : STAGES_WITHOUT_EDD
   - Completely removes Stage 5 (EDD Review) from UI when not applicable

3. Flow2MonitorPanel.tsx (line 383, 479):
   - Use visibleStages instead of BUSINESS_STAGES for rendering
   - Update connector line logic for dynamic stage count

4. Flow2MonitorPanel.tsx (line 423-445):
   - Simplified EDD rendering logic (removed "skipped" branch)
   - Stage 5 only appears if edd_stage exists

VISUAL RESULT:
- Direct approve: Shows 5 stages (no EDD node)
  📄 → ⚠️ → ✓ → 👤 → 📊

- Reject + EDD: Shows 6 stages (with EDD node)
  📄 → ⚠️ → ✓ → 👤 → 🔍 → 📊

INVARIANTS ENFORCED:
- edd_stage undefined → visibleStages.length === 5
- edd_stage exists → visibleStages.length === 6
- No "ghost" nodes shown for workflows that don't use them

Fixes #[issue-number]
```

---

**STATUS:** ✅ COMPLETELY FIXED - EDD 节点在不需要时完全不显示



---

## 问题分析

### 根本原因

1. **`submitDecision.ts` 逻辑缺陷:**
   - 只在 `decision === 'reject'` 时处理 EDD 触发和 `final_decision` 设置
   - 在 `decision === 'approve'` 时**没有**设置 `final_decision = 'approved'`
   - 导致 UI 无法明确判断流程是"直接 approve 完成"还是"需要 EDD"

2. **`Flow2MonitorPanel` 误判:**
   - `getCurrentStageIndex` 假设 `status === 'completed'` 就到达 stage 6
   - 没有明确检查是否存在 `edd_stage`
   - 导致即使没有 EDD，UI 也可能显示 EDD Review 为"完成"状态

3. **EDD Stage 5 渲染逻辑问题:**
   - 只检查 `checkpointMetadata?.edd_stage` 是否存在
   - 如果不存在，stage 5 使用默认的 `isCompleted` 逻辑，可能错误显示为绿色

---

## 修复方案

### 1. `submitDecision.ts` - 明确 Approve 路径

**文件:** `app/lib/flow2/submitDecision.ts`  
**位置:** Line 158-190

**修改前:**
```typescript
const updates: Partial<Flow2Checkpoint> = {
  decision,
  decided_at: now,
  decided_by: metadata.decided_by,
  finalized_via: metadata.finalized_via,
  token_hint: metadata.token_hint,
};

if (decision === 'reject' && reason) {
  updates.decision_comment = reason.trim();
  // ... EDD trigger logic ...
}
```

**修改后:**
```typescript
const updates: Partial<Flow2Checkpoint> = {
  decision,
  decided_at: now,
  decided_by: metadata.decided_by,
  finalized_via: metadata.finalized_via,
  token_hint: metadata.token_hint,
};

// CRITICAL: Set final_decision based on decision
if (decision === 'approve') {
  // Stage 1 approve -> workflow complete, no EDD
  updates.final_decision = 'approved';
  updates.status = 'completed';
  
  // PHASE 2: Set COMPLETE status
  if (!checkpoint.checkpoint_metadata) {
    (checkpoint as any).checkpoint_metadata = {};
  }
  (checkpoint as any).checkpoint_metadata.reviewProcessStatus = 'COMPLETE';
  
  console.log('[SubmitDecision] Stage 1 approved -> workflow COMPLETE (no EDD)');
}

if (decision === 'reject' && reason) {
  updates.decision_comment = reason.trim();
  // ... EDD trigger logic (unchanged) ...
}
```

**效果:**
- ✅ Approve 路径明确设置 `final_decision = 'approved'`
- ✅ 设置 `status = 'completed'`
- ✅ 设置 `reviewProcessStatus = 'COMPLETE'`
- ✅ 不触发任何 EDD 逻辑

---

### 2. `Flow2MonitorPanel.tsx` - 优化 Stage Index 逻辑

**文件:** `app/components/flow2/Flow2MonitorPanel.tsx`  
**位置:** Line 67-97

**修改前:**
```typescript
case 'completed': 
  // UNIVERSAL: If EDD approved, workflow is fully complete (stage 6)
  if (eddStage && eddStage.decision === 'approve') {
    return 6;
  }
  return 6; // All done
```

**修改后:**
```typescript
case 'completed': 
  // CRITICAL FIX: Only show EDD stage if eddStage actually exists
  // If no EDD stage, human approved directly -> stage 6 complete
  if (eddStage && eddStage.decision === 'approve') {
    return 6; // EDD approved -> fully complete
  }
  // No EDD stage means direct approve -> stage 6 complete
  return 6;
```

**效果:**
- ✅ 逻辑更清晰，注释明确说明两种路径
- ✅ 明确区分"有 EDD 且 approve"和"无 EDD 直接 approve"

---

### 3. `Flow2MonitorPanel.tsx` - EDD Stage 5 渲染逻辑

**文件:** `app/components/flow2/Flow2MonitorPanel.tsx`  
**位置:** Line 415-449

**修改前:**
```typescript
// Special case: EDD Review (stage 5) states
let eddStepColor = '';
let eddStepIcon = stage.icon;
if (stage.id === 5 && checkpointMetadata?.edd_stage) {
  const eddStatus = checkpointMetadata.edd_stage.status;
  // ... set color based on status ...
}
```

**修改后:**
```typescript
// Special case: EDD Review (stage 5) states
// CRITICAL FIX: Only show EDD as active/completed if eddStage actually exists
let eddStepColor = '';
let eddStepIcon = stage.icon;
const isEddStage = stage.id === 5;

if (isEddStage) {
  if (checkpointMetadata?.edd_stage) {
    // EDD stage exists - show its actual status
    const eddStatus = checkpointMetadata.edd_stage.status;
    // ... (original status logic) ...
  } else {
    // CRITICAL: No EDD stage - this stage should appear skipped/not-applicable
    // If workflow is completed without EDD, show it as gray (skipped)
    if (isCompleted || isFullyCompleted) {
      eddStepColor = 'bg-slate-200 text-slate-400'; // Skipped
      eddStepIcon = '○'; // Empty circle indicates not applicable
    } else {
      eddStepColor = 'bg-slate-200 text-slate-500'; // Pending but may not be needed
      eddStepIcon = stage.icon;
    }
  }
}
```

**效果:**
- ✅ 如果没有 `edd_stage`，stage 5 显示为灰色（跳过）
- ✅ 图标变为空心圆 `○`，表示"不适用"
- ✅ 只有真正触发 EDD 时才显示绿色/橙色/红色状态

---

## 逻辑流程图

### Before (有问题的逻辑)

```
Human Reviewer Email
   ↓
1. Click Approve
   ↓
submitDecision() {
  decision = 'approve'
  // ❌ 没有设置 final_decision
  // ❌ 没有设置 reviewProcessStatus
}
   ↓
Document Page Loads
   ↓
Flow Monitor {
  status = 'completed'
  final_decision = undefined  // ❌ 未定义
  edd_stage = undefined
  ↓
  getCurrentStageIndex() {
    return 6  // Stage 6 (Final Report)
  }
  ↓
  Render Stage 5 (EDD Review) {
    isCompleted = true (因为 idx < 6)
    eddStepColor = '' (没有 edd_stage，用默认逻辑)
    ↓
    最终使用 isCompleted 判断 -> ✅ GREEN  // ❌ 错误！
  }
}
```

### After (修复后的逻辑)

```
Human Reviewer Email
   ↓
1. Click Approve
   ↓
submitDecision() {
  decision = 'approve'
  ✅ final_decision = 'approved'
  ✅ status = 'completed'
  ✅ reviewProcessStatus = 'COMPLETE'
  ✅ 不创建 edd_stage
}
   ↓
Document Page Loads
   ↓
Flow Monitor {
  status = 'completed'
  final_decision = 'approved'  // ✅ 明确
  edd_stage = undefined  // ✅ 不存在
  reviewProcessStatus = 'COMPLETE'
  ↓
  getCurrentStageIndex() {
    return 6  // Stage 6 (Final Report)
  }
  ↓
  Render Stage 5 (EDD Review) {
    isEddStage = true
    checkpointMetadata?.edd_stage = undefined  // ✅ 检测到不存在
    ↓
    if (isCompleted || isFullyCompleted) {
      eddStepColor = 'bg-slate-200 text-slate-400'  // ⚪ GRAY (Skipped)
      eddStepIcon = '○'  // Empty circle
    }
  }
  ↓
  Render Stage 6 (Final Report) {
    finalReportCompleted = true  // ✅ GREEN (Completed)
  }
}
```

---

## 测试验证

### Test Case 1: Human Approve Directly (无 EDD)

**Steps:**
1. Upload documents to Flow2
2. Run KYC graph review
3. Wait for Stage 1 approval email
4. Click **Approve** (not reject)

**Expected Results:**
- ✅ Status badge: "✅ APPROVED & COMPLETED"
- ✅ Stage 1-4: All green ✓
- ✅ **Stage 5 (EDD Review): Gray with ○ icon (Skipped)**
- ✅ Stage 6 (Final Report): Green ✓
- ✅ NO "EDD Approval Email Sent" message
- ✅ NO "EDD Approved" message
- ✅ NO post-reject analysis animation
- ✅ Button: "🔄 Start New Review" (not "Finish & Download")

**Checkpoint File Check:**
```json
{
  "decision": "approve",
  "final_decision": "approved",
  "status": "completed",
  "checkpoint_metadata": {
    "reviewProcessStatus": "COMPLETE"
  },
  "edd_stage": null  // ✅ Does not exist
}
```

---

### Test Case 2: Human Reject → EDD (有 EDD)

**Steps:**
1. Upload documents to Flow2
2. Run KYC graph review
3. Wait for Stage 1 approval email
4. Click **Reject** with reason containing "Route: EDD"

**Expected Results:**
- ✅ Stage 1 rejected
- ✅ EDD email sent
- ✅ **Stage 5 (EDD Review): Orange ⏳ icon (Waiting)**
- ✅ "EDD Approval Email Sent" message visible
- ✅ Flow Monitor shows "IN PROGRESS"

**Checkpoint File Check:**
```json
{
  "decision": "reject",
  "final_decision": undefined,  // Not set yet
  "status": "paused",
  "edd_stage": {
    "status": "waiting_edd_approval",
    "approval_token": "...",
    "approval_sent_at": "..."
  }
}
```

---

### Test Case 3: EDD Approve After Reject

**Steps:**
1. Continue from Test Case 2
2. Click **Approve** in EDD email

**Expected Results:**
- ✅ Status badge: "✅ APPROVED & COMPLETED"
- ✅ Stage 4 (Human Review): Red ✗ (historical rejection preserved)
- ✅ **Stage 5 (EDD Review): Green ✓ (EDD approved)**
- ✅ Stage 6 (Final Report): Green ✓
- ✅ "EDD Approved" message visible
- ✅ `final_decision = 'approved_with_edd'`

---

## 单元状态不变量 (State Invariants)

### Invariant 1: final_decision 完整性
```
IF decision === 'approve'
  THEN final_decision MUST be 'approved'
  AND edd_stage MUST be undefined
  AND reviewProcessStatus MUST be 'COMPLETE'
```

### Invariant 2: EDD 触发条件
```
IF decision === 'reject' AND (isRouteEdd OR isAmbiguousReject)
  THEN edd_stage MUST exist
  AND edd_stage.status MUST be 'waiting_edd_approval'
  AND final_decision MUST be undefined (until EDD completes)
```

### Invariant 3: EDD Stage 5 渲染
```
IF edd_stage === undefined
  THEN Stage 5 MUST be rendered as:
    - Gray background (skipped)
    - Empty circle icon ○
    - NOT green (not completed)
```

### Invariant 4: 路径互斥性
```
(final_decision === 'approved' AND edd_stage === undefined)
XOR
(final_decision === 'approved_with_edd' AND edd_stage.decision === 'approve')
XOR
(final_decision === 'rejected' AND (edd_stage === undefined OR edd_stage.decision === 'reject'))
```

---

## 因果链修复说明

### 修复的因果链

**Before:**
```
Approve Click → submitDecision() → updates (partial) → checkpoint saved
                                      ↓
                                   (无 final_decision)
                                      ↓
UI Load → getCurrentStageIndex() → return 6
            ↓
         Render Stage 5 → isCompleted = true
            ↓
         使用默认逻辑 → Green (错误!)
```

**After:**
```
Approve Click → submitDecision() → updates (complete) → checkpoint saved
                                      ↓
                               final_decision = 'approved'
                               reviewProcessStatus = 'COMPLETE'
                               edd_stage = undefined
                                      ↓
UI Load → getCurrentStageIndex() → return 6
            ↓
         Render Stage 5 → isEddStage = true
            ↓
         checkpointMetadata?.edd_stage === undefined
            ↓
         Gray + ○ icon (正确!)
```

---

## 提交信息

```
fix(flow2): prevent EDD stage display on direct human approve

Critical fix for Flow2 workflow logic:

PROBLEM:
- When human reviewer approves directly (no reject), EDD Review stage
  incorrectly appeared as "completed" in Flow Monitor
- Root cause: approve path did not set final_decision or reviewProcessStatus
- UI could not distinguish "direct approve" from "EDD complete"

FIXES:
1. submitDecision.ts (line 158-190):
   - Set final_decision='approved' on direct approve
   - Set reviewProcessStatus='COMPLETE'
   - Set status='completed'
   - Ensures no EDD stage is created

2. Flow2MonitorPanel.tsx (line 67-97):
   - Clarified getCurrentStageIndex() logic with explicit comments
   - Distinguish "EDD exists + approve" vs "no EDD + direct approve"

3. Flow2MonitorPanel.tsx (line 415-449):
   - EDD stage (5) rendering logic:
     * If edd_stage exists: show actual status (orange/green/red)
     * If edd_stage undefined: show as SKIPPED (gray + ○ icon)
   - Prevents false "completed" state for non-applicable EDD

INVARIANTS ENFORCED:
- Approve → final_decision='approved', no edd_stage
- Reject + EDD trigger → edd_stage created, final_decision pending
- EDD stage 5 gray/skipped iff edd_stage undefined
- Paths are mutually exclusive (approve XOR reject+EDD)

TESTING:
- Test Case 1: Direct approve → Stage 5 gray (skipped)
- Test Case 2: Reject+EDD → Stage 5 orange (waiting)
- Test Case 3: EDD approve → Stage 5 green (completed)

Fixes #[issue-number]
```

---

**STATUS:** ✅ FIXED - 深层逻辑完整修复，不是表面 patch



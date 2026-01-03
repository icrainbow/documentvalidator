# 快速验证清单 - EDD 节点完全移除

## ✅ 验证步骤

### 测试 1: Direct Approve (无 EDD)

1. 上传文档到 Flow2
2. 运行 KYC graph review
3. 等待 human review 邮件
4. **点击 Approve**
5. 查看 Document 页面

**预期结果:**

```
Flow Monitor 节点图:

📄         ⚠️         ✓         👤         📊
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document   Risk      Compliance  Human    Final
Analysis   Assessment Review     Review   Report
  ✅         ✅         ✅         ✅        ✅

✅ 总共 5 个节点
✅ 4 条连接线
✅ 没有 🔍 EDD Review 节点
✅ 状态: APPROVED & COMPLETED
```

**❌ 如果看到 6 个节点或灰色 EDD 节点 = BUG！**

---

### 测试 2: Reject + EDD

1. 上传文档到 Flow2
2. 运行 KYC graph review
3. 等待 human review 邮件
4. **点击 Reject**，输入包含 "Route: EDD" 的原因
5. 查看 Document 页面

**预期结果:**

```
Flow Monitor 节点图:

📄         ⚠️         ✓         👤        🔍         📊
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document   Risk      Compliance  Human    EDD       Final
Analysis   Assessment Review     Review   Review    Report
  ✅         ✅         ✅         ✗        ⏳         ⚪

✅ 总共 6 个节点
✅ 5 条连接线
✅ 有 🔍 EDD Review 节点 (橙色 waiting)
✅ 状态: IN PROGRESS
✅ 显示 "EDD Approval Email Sent"
```

---

## 🔍 快速检查代码

### 检查点 1: submitDecision.ts

```bash
grep -A 10 "if (decision === 'approve')" app/lib/flow2/submitDecision.ts
```

**应该看到:**
```typescript
if (decision === 'approve') {
  updates.final_decision = 'approved';
  updates.status = 'completed';
  checkpoint_metadata.reviewProcessStatus = 'COMPLETE';
  // ...
}
```

---

### 检查点 2: Flow2MonitorPanel.tsx

```bash
grep -A 5 "visibleStages" app/components/flow2/Flow2MonitorPanel.tsx | head -15
```

**应该看到:**
```typescript
const shouldShowEddStage = !!checkpointMetadata?.edd_stage;

const visibleStages = shouldShowEddStage 
  ? BUSINESS_STAGES 
  : BUSINESS_STAGES.filter(stage => stage.id !== 5);
```

---

### 检查点 3: 渲染逻辑

```bash
grep "visibleStages.map" app/components/flow2/Flow2MonitorPanel.tsx
```

**应该看到:**
```typescript
{visibleStages.map((stage, idx) => {
```

**不应该看到:**
```typescript
{BUSINESS_STAGES.map((stage, idx) => {  // ❌ 错误！
```

---

## 🐛 常见问题

### Q1: 还是看到 6 个节点？
**A:** 检查 `visibleStages` 是否正确过滤：
```typescript
console.log('shouldShowEddStage:', shouldShowEddStage);
console.log('visibleStages.length:', visibleStages.length);
```

### Q2: EDD 节点显示为灰色？
**A:** 检查是否使用了旧的 "skipped" 逻辑。应该完全移除 Stage 5，而不是显示为灰色。

### Q3: 连接线看起来奇怪？
**A:** 检查连接线逻辑是否使用 `visibleStages.length` 而不是 `BUSINESS_STAGES.length`

---

## ✅ 最终验收标准

- [ ] Direct approve 只显示 5 个节点
- [ ] Reject + EDD 显示 6 个节点
- [ ] 没有灰色/跳过的 EDD 节点
- [ ] 连接线数量正确 (节点数 - 1)
- [ ] Checkpoint 文件中 `final_decision` 正确
- [ ] 没有 lint 错误
- [ ] 控制台没有错误




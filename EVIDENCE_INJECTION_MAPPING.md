# Evidence Injection Mapping - 详细说明

## 概览

当用户在 Flow2 中点击 **Reject** 并触发 EDD 后，系统会自动将 Evidence Dashboard 的内容注入到 Topic Summary 的 LLM 输入中。

---

## 📋 3个 Evidence Artifacts → Topic Summary 的映射

### **1. Approver Comment (审批者拒绝意见)**

**来源：** 
- Post-reject analysis API: `reviewer_text`
- 用户在 rejection form 中输入的理由

**转换为 Pseudo-Document:**
```typescript
{
  doc_id: 'demo-artifact:approver_comment',
  filename: 'Approver_Rejection_Comment.txt',
  doc_type_hint: 'General Document',
  text: `
    DOCUMENT: Approver Rejection Comment
    SOURCE: Human Reviewer Decision
    
    REJECTION REASON:
    [用户输入的 rejection 理由]
    
    ANALYSIS NOTES:
    This rejection triggered Enhanced Due Diligence (EDD) review due to 
    identified risk factors and ambiguous disclosures requiring deeper investigation.
  `
}
```

**预期映射到的 Topics:**
- ✅ **所有相关 topics**（取决于 rejection 理由内容）
- 主要会出现在：
  - `relationship_purpose` (如果提到关系目的不明确)
  - `source_of_funds` (如果提到资金来源问题)
  - `ownership_ubo_control` (如果提到所有权问题)

**LLM 如何处理：**
LLM 读取这份文档后，会在相关 topic 的 `bullets` 中总结拒绝理由，可能会在 `evidence` 中引用原文片段。

---

### **2. Wealth Report Extract (财富报告差异)**

**来源：**
- Post-reject analysis API: `evidence.disclosures`
  - `current`: "Client stated: $5M from business sale (Q3 2024)"
  - `wealth`: "Wealth division record: $50M AUM (Q4 2024 annual report, p. 47)"
- **图片**: `evidence.pdf_highlight_image_url` → `/demo/evidence-wealth-50m.svg`

**转换为 Pseudo-Document:**
```typescript
{
  doc_id: 'demo-artifact:wealth_report_extract',
  filename: 'Wealth_Division_Report_Extract_Q4_2024.txt',
  doc_type_hint: 'Source of Wealth',
  text: `
    DOCUMENT: Wealth Division Annual Report Extract
    SOURCE: Internal Q4 2024 Report, Page 47
    CLASSIFICATION: Internal Use Only
    IMAGE_EVIDENCE: /demo/evidence-wealth-50m.svg  ← 关键！包含图片URL
    
    SOURCE OF FUNDS DISCREPANCY ANALYSIS:
    
    CLIENT DISCLOSURE (Current):
    Client stated: $5M from business sale (Q3 2024)
    
    WEALTH DIVISION RECORD (Q4 2024):
    Wealth division record: $50M AUM (Q4 2024 annual report, p. 47)
    
    DISCREPANCY MAGNITUDE:
    The reported AUM is 10x higher than the client's stated source of funds...
    [详细分析文本]
  `
}
```

**预期映射到的 Topic:**
- ✅ **`source_of_funds`** (Source of Funds) - 主要目标
- ✅ **`source_of_wealth`** (Source of Wealth) - 次要相关

**LLM 如何处理：**
1. 读取文档内容，识别 `IMAGE_EVIDENCE: /demo/evidence-wealth-50m.svg`
2. 在 `source_of_funds` topic 的 `bullets` 中总结：
   ```
   - Client disclosure shows $5M from business sale
   - Internal wealth division records show $50M AUM (10x discrepancy)
   - Requires reconciliation and detailed breakdown
   ```
3. 在 `evidence` 数组中返回：
   ```json
   {
     "quote": "Wealth division record: $50M AUM (Q4 2024 annual report, p. 47)",
     "doc_id": "demo-artifact:wealth_report_extract",
     "image_url": "/demo/evidence-wealth-50m.svg"  ← 关键！
   }
   ```

**UI 显示效果：**
- Topic Summary 的 "Source of Funds" 卡片会显示：
  - Summary bullets（文字总结）
  - Evidence 区域：
    - 文字引用
    - **图片**（Wealth Report 截图）

---

### **3. Ownership Structure + Policy Update (所有权结构 + 政策更新)**

**来源：**
- Post-reject analysis API: `evidence.regulation`
  - `title`: "Offshore Holding Structure Policy Update"
  - `effective_date`: "Dec 1 2025"
  - `summary`: "All offshore holding structures with >2 layers now require EDD"
- 公司结构树: `evidence.structure_tree` (BVI → Cayman → Swiss trust)

**转换为 Pseudo-Document:**
```typescript
{
  doc_id: 'demo-artifact:ownership_structure_policy',
  filename: 'Ownership_Structure_And_Policy_Update_Dec_2025.txt',
  doc_type_hint: 'Beneficial Ownership',
  text: `
    DOCUMENT: Ownership Structure Analysis & Regulatory Policy Update
    SOURCE: Corporate Structure Analyzer + Compliance Policy Database
    
    CORPORATE STRUCTURE:
    Complex multi-layer offshore holding structure identified with jurisdictions 
    including British Virgin Islands, Cayman Islands, and Switzerland. 
    Ultimate beneficial owner (UBO) requires verification.
    
    REGULATORY POLICY UPDATE:
    Title: Offshore Holding Structure Policy Update
    Effective Date: Dec 1 2025
    Summary: All offshore holding structures with >2 layers now require EDD
    
    COMPLIANCE IMPACT:
    This policy change mandates Enhanced Due Diligence (EDD) for all offshore 
    holding structures with more than 2 layers...
    [详细合规影响文本]
  `
}
```

**预期映射到的 Topic:**
- ✅ **`ownership_ubo_control`** (Ownership, UBO & Control) - 主要目标
- ✅ **`geography_jurisdiction_risk`** (Geography & Jurisdiction Risk) - 次要相关

**LLM 如何处理：**
在 `ownership_ubo_control` topic 的 `bullets` 中总结：
```
- 3-layer offshore structure: BVI → Cayman → Swiss trust
- UBO obscured by multi-jurisdiction holdings
- Dec 1 2025 policy: >2 layer structures require EDD
- Economic substance verification needed in each jurisdiction
```

在 `evidence` 数组中返回：
```json
{
  "quote": "Dec 1 2025 regulation: Offshore holding structures now require Enhanced Due Diligence",
  "doc_id": "demo-artifact:ownership_structure_policy"
}
```

---

## 🔍 如何验证 Evidence 是否成功注入

### **步骤 1: 检查 Console Logs**

在浏览器 Console 中查找以下日志：

```
[Flow2Demo] Injecting evidence dashboard artifacts into topic summary input
[DemoEvidence] Generated 3 pseudo-document(s) from evidence payload
[Flow2Demo] Added 3 evidence pseudo-doc(s), total input: 6 docs
```

如果看到这些日志，说明 **injection 成功触发**。

---

### **步骤 2: 检查 Network 请求**

打开 DevTools → Network 标签，查找：

**请求:** `POST /api/flow2/topic-summaries`

**Request Body:**
```json
{
  "run_id": "602580e7-...",
  "documents": [
    // 原始上传的文档 (3个)
    {"doc_id": "doc-1", "filename": "Client_Identity.pdf", ...},
    {"doc_id": "doc-2", "filename": "Source_of_Funds.pdf", ...},
    {"doc_id": "doc-3", "filename": "Ownership_Structure.pdf", ...},
    
    // Evidence pseudo-documents (3个) ← 关键！
    {
      "doc_id": "demo-artifact:approver_comment",
      "filename": "Approver_Rejection_Comment.txt",
      ...
    },
    {
      "doc_id": "demo-artifact:wealth_report_extract",
      "filename": "Wealth_Division_Report_Extract_Q4_2024.txt",
      "text": "...IMAGE_EVIDENCE: /demo/evidence-wealth-50m.svg..."  ← 图片URL在这里
    },
    {
      "doc_id": "demo-artifact:ownership_structure_policy",
      "filename": "Ownership_Structure_And_Policy_Update_Dec_2025.txt",
      ...
    }
  ],
  "topics": [...8 topic IDs...],
  "risks": [...]
}
```

如果 `documents` 数组有 **6 个元素**（3 原始 + 3 pseudo），说明 **injection 成功**。

---

### **步骤 3: 检查 API Response**

**Response Body:**
```json
{
  "ok": true,
  "run_id": "602580e7-...",
  "topic_summaries": [
    {
      "topic_id": "source_of_funds",
      "title": "Source of Funds",
      "coverage": "PRESENT",
      "bullets": [
        "Client disclosure: $5M from business sale (Q3 2024)",
        "Wealth division internal records: $50M AUM",
        "10x discrepancy requires reconciliation and detailed breakdown"
      ],
      "evidence": [
        {
          "quote": "Wealth division record: $50M AUM (Q4 2024 annual report, p. 47)",
          "doc_id": "demo-artifact:wealth_report_extract",
          "image_url": "/demo/evidence-wealth-50m.svg"  ← 关键！图片URL
        }
      ]
    },
    {
      "topic_id": "ownership_ubo_control",
      "title": "Ownership, UBO & Control",
      "coverage": "WEAK",
      "bullets": [
        "3-layer offshore structure (BVI → Cayman → Swiss trust)",
        "UBO obscured by multi-jurisdiction holdings",
        "Dec 1 2025 policy requires EDD for >2 layer structures"
      ],
      "evidence": [
        {
          "quote": "Offshore holding structures with >2 layers now require Enhanced Due Diligence",
          "doc_id": "demo-artifact:ownership_structure_policy"
        }
      ]
    },
    // ... 其他 6 个 topics
  ]
}
```

---

### **步骤 4: 检查 UI 显示**

在 Topic Summary 面板中：

**"Source of Funds" 卡片应该显示：**
```
Summary:
• Client disclosure: $5M from business sale (Q3 2024)
• Wealth division internal records: $50M AUM
• 10x discrepancy requires reconciliation

Evidence:
→ "Wealth division record: $50M AUM (Q4 2024 annual report, p. 47)" (demo-artifact:wealth_report_extract)
  [图片: Wealth Report 截图]  ← 新功能！
```

**"Ownership, UBO & Control" 卡片应该显示：**
```
Summary:
• 3-layer offshore structure (BVI → Cayman → Swiss trust)
• UBO obscured by multi-jurisdiction holdings
• Dec 1 2025 policy requires EDD for >2 layer structures

Evidence:
→ "Offshore holding structures with >2 layers now require Enhanced Due Diligence" (demo-artifact:ownership_structure_policy)
```

---

## 🎨 新功能：Evidence 图片支持

### **Schema 更新**
```typescript
evidence?: {
  quote: string;
  doc_id?: string;
  image_url?: string;  // NEW!
}[];
```

### **LLM Prompt 指令**
```
If a document contains "IMAGE_EVIDENCE: <url>", extract the URL and 
include it in the evidence object as "image_url"
```

### **UI 渲染**
- 如果 `evidence[i].image_url` 存在，显示图片
- 图片样式：`max-h-48` (最大高度 192px)，`object-contain` (保持比例)
- 图片加载失败时自动隐藏（graceful degradation）

---

## 🐛 故障排查

### **问题 1: Console 没有看到 injection 日志**

**可能原因:**
- 没有触发 demo mode（`checkpoint_metadata.demo_mode` 不存在）
- Post-reject analysis API 没有返回 `evidence` 字段

**解决方案:**
检查 `/api/flow2/demo/post-reject-analysis?run_id=...` 返回的 JSON，确认：
```json
{
  "triggered": true,  ← 必须为 true
  "evidence": {       ← 必须存在
    "disclosures": {...},
    "regulation": {...},
    "pdf_highlight_image_url": "..."
  }
}
```

---

### **问题 2: Documents 数组中没有 pseudo-docs**

**可能原因:**
- `buildFlow2DemoEvidencePseudoDocs()` 返回空数组
- Evidence payload 缺少必需字段

**解决方案:**
在 `app/document/page.tsx` line ~1735 添加 debug log：
```typescript
const demoEvidenceDocs = buildFlow2DemoEvidencePseudoDocs(analysisData);
console.log('[DEBUG] Demo evidence docs:', demoEvidenceDocs);
```

---

### **问题 3: LLM 没有返回 evidence 或 image_url**

**可能原因:**
- LLM 没有识别 `IMAGE_EVIDENCE:` 标记
- Prompt 文本被截断（超过 8000 字符限制）

**解决方案:**
检查 LLM request body 中的 prompt（Network → messages[0].content），确认：
```
### Document 4: Wealth_Division_Report_Extract_Q4_2024.txt (ID: demo-artifact:wealth_report_extract)

DOCUMENT: Wealth Division Annual Report Extract
SOURCE: Internal Q4 2024 Report, Page 47
IMAGE_EVIDENCE: /demo/evidence-wealth-50m.svg  ← 必须存在
...
```

---

### **问题 4: UI 不显示图片**

**可能原因:**
- `image_url` 字段存在但 UI 组件没有渲染
- 图片 URL 404 或加载失败

**解决方案:**
1. 检查 React DevTools，确认 `topic.evidence[i].image_url` 有值
2. 在浏览器中直接访问图片 URL（如 `http://localhost:3000/demo/evidence-wealth-50m.svg`）
3. 检查 Console 是否有图片加载错误

---

## ✅ 预期最终效果

用户在 Flow2 中：

1. 上传文档（3个）
2. 点击 "Run Graph KYC Review"
3. 点击 Reject（输入理由）
4. **自动触发 Evidence injection:**
   - 3 个原始文档 + 3 个 pseudo-docs = **6 个输入文档**
5. Topic Summary 重新生成：
   - `source_of_funds` 包含 $5M vs $50M 差异 + **Wealth Report 图片**
   - `ownership_ubo_control` 包含 3-layer offshore 结构 + Dec 1 2025 policy
   - 其他 topics 根据内容相关性可能也引用 evidence
6. UI 显示：
   - Evidence 文字引用（带 doc_id）
   - **Evidence 图片**（内嵌在卡片中）

---

## 📝 总结

| Evidence Artifact | Pseudo-Doc ID | 主要映射 Topic | 包含图片？ |
|------------------|---------------|---------------|----------|
| Approver Comment | `demo-artifact:approver_comment` | 多个 (根据内容) | ❌ |
| Wealth Report Extract | `demo-artifact:wealth_report_extract` | `source_of_funds` | ✅ Yes (`/demo/evidence-wealth-50m.svg`) |
| Ownership Structure + Policy | `demo-artifact:ownership_structure_policy` | `ownership_ubo_control` | ❌ |

**关键要点：**
- Evidence 是作为 **输入文档** 注入给 LLM 的（不是直接插入输出）
- LLM 读取 evidence 后，在相关 topic 的 `bullets` 和 `evidence` 字段中总结
- 图片通过 `IMAGE_EVIDENCE:` 标记在文档文本中传递给 LLM
- LLM 提取 URL 并在 JSON 输出的 `image_url` 字段中返回
- UI 自动渲染 `image_url`（如果存在）


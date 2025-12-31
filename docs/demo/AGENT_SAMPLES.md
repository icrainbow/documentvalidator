# Agent System - Sample Payloads

Comprehensive test payloads for all 12 agents in the compliance demo system.

## Base URL
```
http://localhost:3001/api/agent
```

## List All Agents (GET)
```bash
curl http://localhost:3001/api/agent
```

## Response Format
All agents return:
```json
{
  "ok": true,
  "agent_id": "<agent-id>",
  "trace_id": "trace_<timestamp>_<random>",
  "mode": "fake",
  "output": { /* agent-specific output */ },
  "metadata": {
    "latency_ms": 0,
    "tokens": 0,
    "status": "success"
  }
}
```

---

## 1. extract-facts-agent

**Purpose:** Extract structured facts from document sections with evidence anchors

**Sample Payload:**
```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "extract-facts-agent",
    "mode": "fake",
    "input": {
      "sectionContent": "The client is interested in investing $50,000 in the tobacco industry with a target return of 15% by December 2025. The investment will focus on dividend-paying stocks.",
      "sectionTitle": "Investment Proposal",
      "sectionId": "sec-001",
      "docId": "doc-12345"
    }
  }'
```

**Expected Output:**
```json
{
  "facts": [
    {
      "category": "entity",
      "text": "tobacco industry",
      "confidence": 0.95,
      "source": {
        "doc_id": "doc-12345",
        "section_id": "sec-001",
        "section_title": "Investment Proposal",
        "snippet": "...investing $50,000 in the tobacco industry with...",
        "char_range": { "start": 39, "end": 55 }
      }
    },
    {
      "category": "amount",
      "text": "Financial amount: $50,000",
      "confidence": 0.98,
      "source": { /* ... */ }
    }
  ],
  "summary": "Extracted 5 facts from \"Investment Proposal\"",
  "total_confidence": 0.94
}
```

---

## 2. map-policy-agent

**Purpose:** Map extracted facts to relevant policy rules using corpus

**Sample Payload:**
```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "map-policy-agent",
    "mode": "fake",
    "input": {
      "facts": [
        {
          "category": "entity",
          "text": "tobacco industry",
          "confidence": 0.95,
          "source": {
            "section_title": "Investment Background",
            "snippet": "investing in the tobacco industry"
          }
        },
        {
          "category": "amount",
          "text": "$150,000",
          "confidence": 0.98,
          "source": {
            "section_title": "Funds",
            "snippet": "total investment of $150,000"
          }
        }
      ],
      "documentType": "investment_proposal"
    }
  }'
```

**Expected Output:**
```json
{
  "mappings": [
    {
      "fact": { /* original fact */ },
      "policy_rules": [
        {
          "id": "COND-008",
          "title": "Prohibited Industry Restrictions",
          "category": "conduct",
          "requirement_text": "Investments in tobacco, weapons...",
          "keywords": ["tobacco", "weapons", ...],
          "severity": "critical"
        }
      ],
      "risk_level": "critical",
      "reason": "Fact \"tobacco industry\" matches policies: Prohibited Industry Restrictions"
    }
  ],
  "flagged_count": 1,
  "highest_risk_level": "critical"
}
```

---

## 3. redteam-review-agent

**Purpose:** Adversarial review to find edge cases and policy violations

**Sample Payload:**
```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "redteam-review-agent",
    "mode": "fake",
    "input": {
      "sectionContent": "We recommend investing in tobacco stocks for high returns. This strategy has shown great performance.",
      "sectionTitle": "Investment Strategy",
      "sectionId": "sec-002",
      "policyMappings": []
    }
  }'
```

**Expected Output:**
```json
{
  "issues": [
    {
      "id": "RT-1",
      "type": "policy_violation",
      "severity": "critical",
      "description": "Prohibited industry reference detected: tobacco industry",
      "affected_text": "tobacco industry",
      "suggested_fix": "Remove reference to tobacco industry or seek executive approval per policy COND-008",
      "policy_refs": ["COND-008"],
      "source": {
        "section_id": "sec-002",
        "section_title": "Investment Strategy",
        "snippet": "...investing in tobacco stocks...",
        "char_range": { "start": 23, "end": 30 }
      }
    },
    {
      "id": "RT-2",
      "type": "missing_info",
      "severity": "high",
      "description": "Investment proposal lacks risk disclosure",
      "suggested_fix": "Add comprehensive risk assessment section per policy RISK-007",
      "policy_refs": ["RISK-007", "DISC-012"]
    }
  ],
  "overall_status": "fail",
  "critical_count": 1,
  "high_count": 1
}
```

---

## 4. request-evidence-agent

**Purpose:** Generate specific evidence requests based on compliance issues

**Sample Payload:**
```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "request-evidence-agent",
    "mode": "fake",
    "input": {
      "issues": [
        {
          "id": "RT-001",
          "type": "policy_violation",
          "severity": "critical",
          "description": "Prohibited industry reference detected",
          "suggested_fix": "Remove reference or seek approval",
          "policy_refs": ["COND-008"]
        }
      ],
      "missing_evidence": [
        "Source of funds declaration",
        "Risk acknowledgment signature"
      ],
      "context": "Investment Proposal Document"
    }
  }'
```

**Expected Output:**
```json
{
  "requests": [
    {
      "id": "EVR-0001",
      "request_type": "approval",
      "request_text": "Please provide documentation or approval to address: Prohibited industry reference detected",
      "reason": "Policy violation detected: COND-008",
      "priority": "immediate",
      "required_from": "Compliance Officer",
      "related_issue_ids": ["RT-001"],
      "deadline": "2025-12-29T10:00:00.000Z"
    },
    {
      "id": "EVR-0002",
      "request_type": "supporting_data",
      "request_text": "Please provide: Source of funds declaration",
      "reason": "Required supporting evidence is missing",
      "priority": "medium",
      "required_from": "Client",
      "related_issue_ids": [],
      "deadline": "2026-01-04T10:00:00.000Z"
    }
  ],
  "total_requests": 3,
  "immediate_count": 1
}
```

---

## 5. draft-client-comms-agent

**Purpose:** Draft client-facing communication based on review results

**Sample Payload:**
```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "draft-client-comms-agent",
    "mode": "fake",
    "input": {
      "review_results": {
        "overall_status": "fail",
        "issues": [
          {
            "id": "RT-001",
            "type": "policy_violation",
            "severity": "critical",
            "description": "Prohibited industry reference: tobacco",
            "suggested_fix": "Remove reference"
          }
        ],
        "critical_count": 1,
        "high_count": 0
      },
      "tone": "formal",
      "language": "english",
      "client_name": "John Smith"
    }
  }'
```

**Expected Output:**
```json
{
  "subject": "Your Investment Proposal - Action Required",
  "body": "Dear John Smith,\n\nThank you for submitting your investment proposal. Our compliance review has identified 1 item(s) that require your attention:\n\n- 1 critical issue(s) requiring immediate action\n\nKey Issues:\n1. Prohibited industry reference: tobacco\n\nThese issues must be resolved before we can proceed with your proposal.\n\nSincerely,\nCompliance Review Team",
  "tone": "formal",
  "language": "english",
  "call_to_action": "Please provide the required information within 24 hours to avoid processing delays.",
  "attachment_suggestions": [
    "Detailed Review Report",
    "Required Documentation Checklist",
    "Critical Issues Summary"
  ],
  "urgency_level": "immediate"
}
```

**Multilingual Example (Chinese):**
```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "draft-client-comms-agent",
    "mode": "fake",
    "input": {
      "review_results": {
        "overall_status": "pass",
        "issues": [],
        "critical_count": 0
      },
      "tone": "friendly",
      "language": "chinese",
      "client_name": "李明"
    }
  }'
```

---

## 6. write-audit-agent

**Purpose:** Generate structured audit log entry for compliance record

**Sample Payload:**
```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "write-audit-agent",
    "mode": "fake",
    "input": {
      "document_id": "DOC-12345",
      "agent_activity": [
        {
          "agent_id": "extract-facts-agent",
          "trace_id": "trace_001",
          "timestamp": "2025-12-28T10:00:00.000Z",
          "status": "success",
          "summary": "Extracted 5 facts"
        },
        {
          "agent_id": "redteam-review-agent",
          "trace_id": "trace_002",
          "timestamp": "2025-12-28T10:00:01.000Z",
          "status": "success",
          "summary": "Found 1 critical issue"
        }
      ],
      "final_decision": "needs_revision",
      "reviewer": "Compliance System",
      "flagged_issues_count": 1
    }
  }'
```

**Expected Output:**
```json
{
  "audit_id": "AUD-1766932425553-XYZ12",
  "timestamp": "2025-12-28T10:05:00.000Z",
  "document_id": "DOC-12345",
  "agent_activity": [ /* original activity array */ ],
  "final_decision": "needs_revision",
  "compliance_status": "conditional",
  "summary": "Document DOC-12345 underwent compliance review with 2 agent operations. Final decision: NEEDS_REVISION. 1 issue(s) flagged. Compliance status: conditional.",
  "details": "# Audit Report: AUD-1766932425553-XYZ12\n\n## Document Information\n...",
  "flagged_issues": 1,
  "next_review_date": "2026-01-04T10:05:00.000Z",
  "reviewer": "Compliance System"
}
```

---

## 7. evaluate-agent

**Purpose:** Evaluate section content against criteria

**Sample Payload:**
```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "evaluate-agent",
    "mode": "fake",
    "input": {
      "sectionContent": "This is a comprehensive investment proposal covering all required elements with professional language and clear risk disclosures.",
      "sectionTitle": "Executive Summary",
      "criteria": [
        "Sufficient length",
        "Clear structure",
        "No prohibited content",
        "Professional tone"
      ]
    }
  }'
```

**Expected Output:**
```json
{
  "status": "pass",
  "score": 100,
  "findings": [
    {
      "criterion": "Sufficient length",
      "result": "pass",
      "comment": "Content length is adequate (120 characters)"
    },
    {
      "criterion": "Clear structure",
      "result": "pass",
      "comment": "Content has clear structure"
    },
    {
      "criterion": "No prohibited content",
      "result": "pass",
      "comment": "No prohibited content detected"
    },
    {
      "criterion": "Professional tone",
      "result": "pass",
      "comment": "Professional tone maintained"
    }
  ],
  "summary": "Section \"Executive Summary\" evaluated against 4 criteria. Score: 100/100. Status: PASS. 4/4 criteria passed."
}
```

---

## 8. compliance-agent

**Purpose:** Quick compliance check for policy violations

**Sample Payload:**
```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "compliance-agent",
    "mode": "fake",
    "input": {
      "sectionContent": "The investment strategy focuses on diversified portfolio across tech and healthcare sectors with expected returns of 12-15%.",
      "sectionTitle": "Strategy Overview",
      "checkType": "full"
    }
  }'
```

**Expected Output:**
```json
{
  "is_compliant": true,
  "violations": [],
  "warnings": [
    {
      "type": "missing_disclosure",
      "description": "Return projections mentioned without corresponding risk disclosure"
    }
  ],
  "summary": "Section \"Strategy Overview\" passed compliance check. 1 warning(s) noted."
}
```

---

## Testing All Agents

Use the provided test script:

```bash
# Make script executable
chmod +x scripts/test-agents.ts

# Run test script (displays all sample payloads)
npx ts-node scripts/test-agents.ts
```

---

## Policy Corpus

The system uses a hardcoded policy corpus with 10 rules:

| ID | Title | Category | Severity |
|----|-------|----------|----------|
| KYC-001 | Client Identity Verification | kyc | critical |
| AML-003 | Source of Funds Declaration | aml | critical |
| RISK-007 | Risk Assessment Completion | risk | high |
| DISC-012 | Material Information Disclosure | disclosure | high |
| COND-008 | Prohibited Industry Restrictions | conduct | critical |
| DOC-015 | Investment Proposal Documentation | documentation | medium |
| RISK-019 | High-Risk Client Review | risk | high |
| COND-022 | Insider Trading Prevention | conduct | critical |
| DOC-025 | Client Acknowledgment Signature | documentation | high |
| DISC-030 | Performance Projection Disclaimer | disclosure | medium |

---

## Observability

All agent executions log structured JSON:

```json
{
  "trace_id": "trace_1766932425553_ufpop27",
  "agent_id": "extract-facts-agent",
  "mode": "fake",
  "status": "success",
  "latency_ms": 2,
  "tokens": 0,
  "input_summary": "object"
}
```

Check server console for these logs when testing agents.


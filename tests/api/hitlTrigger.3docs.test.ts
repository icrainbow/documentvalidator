/**
 * HITL Trigger Tests - 3 Document Types
 * 
 * CRITICAL: Validates that ALL THREE trigger documents reliably pause at HITL.
 * This is the acceptance test for Phase 7-9 implementation.
 * 
 * Must pass WITHOUT Anthropic API key (uses fallback guardrail).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Fixture paths
const FIXTURE_DIR = join(__dirname, '../fixtures');
const TRIGGER_DOC_1 = join(FIXTURE_DIR, 'TRIGGER_DOC_PEPRISK_SANCTIONS_TEST.txt');
const TRIGGER_DOC_2 = join(FIXTURE_DIR, 'TRIGGER_DOC_UBO_UNKNOWN_OFFSHORE_TEST.txt');
const TRIGGER_DOC_3 = join(FIXTURE_DIR, 'TRIGGER_DOC_FUNDS_SOURCE_CASH_CRYPTO_TEST.txt');

const BENIGN_CONTENT = `
CLIENT INFORMATION FORM

Full Name: Jane Doe
Date of Birth: 1985-06-15
Nationality: Canadian
Occupation: High School Teacher
Residence: Toronto, Ontario, Canada

Source of Funds: Employment salary
Annual Income: CAD 75,000
Investment Objective: Retirement savings
Risk Tolerance: Conservative

This is a standard, low-risk KYC profile with no adverse indicators.
All documentation is complete and verified.
No PEP status, no sanctions exposure, no offshore structures.
`.trim();

describe('Flow2 HITL Trigger - 3 Document Types (Hard Guarantee)', () => {
  let serverUrl: string;
  
  beforeAll(() => {
    serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000';
    
    // CRITICAL: Enable fallback guardrail for tests
    process.env.FLOW2_DEMO_GUARDRAIL = '1';
    process.env.NODE_ENV = 'test';
    
    // Remove Anthropic key to force fallback path (guarantees test reliability)
    delete process.env.ANTHROPIC_API_KEY;
    
    console.log('[HITL Test] Guardrail ENABLED, LLM path DISABLED (fallback guaranteed)');
  });
  
  afterAll(() => {
    // Cleanup
    delete process.env.FLOW2_DEMO_GUARDRAIL;
  });
  
  it('[HITL-TRIGGER-1] PEP + Sanctions document → waiting_human + kyc_risk issues', async () => {
    const triggerContent = readFileSync(TRIGGER_DOC_1, 'utf-8');
    
    console.log(`[HITL-TRIGGER-1] Testing document: ${triggerContent.substring(0, 80)}...`);
    
    const response = await fetch(`${serverUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [{ name: 'PEP_SANCTIONS_TEST.txt', content: triggerContent }],
        features: { reflection: false, negotiation: false, memory: false }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // CRITICAL ASSERTIONS: waiting_human status
    expect(data.status).toBe('waiting_human');
    expect(data.run_id).toBeDefined();
    expect(data.run_id).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    expect(data.paused_at_node).toBe('human_review');
    expect(data.reason).toBeDefined();
    
    // CRITICAL: Checkpoint metadata must exist
    expect(data.checkpoint_metadata).toBeDefined();
    expect(data.checkpoint_metadata.approval_email_to).toBeDefined();
    expect(data.checkpoint_metadata.paused_at).toBeDefined();
    
    // CRITICAL: Issues array must contain kyc_risk category
    expect(data.issues).toBeDefined();
    expect(Array.isArray(data.issues)).toBe(true);
    expect(data.issues.length).toBeGreaterThan(0);
    
    const kycRiskIssue = data.issues.find((i: any) => 
      i.category === 'kyc_risk' || i.category === 'pep' || i.category === 'sanctions'
    );
    expect(kycRiskIssue).toBeDefined();
    expect(kycRiskIssue.severity).toBe('FAIL');
    expect(kycRiskIssue.agent?.source).toBeDefined(); // 'llm' or 'guardrail_classifier'
    
    console.log(`[HITL-TRIGGER-1] ✅ PASS: waiting_human triggered, ${data.issues.length} issues found`);
  }, 30000); // 30s timeout
  
  it('[HITL-TRIGGER-2] UBO Unknown + Offshore document → waiting_human + kyc_risk issues', async () => {
    const triggerContent = readFileSync(TRIGGER_DOC_2, 'utf-8');
    
    console.log(`[HITL-TRIGGER-2] Testing document: ${triggerContent.substring(0, 80)}...`);
    
    const response = await fetch(`${serverUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [{ name: 'UBO_UNKNOWN_OFFSHORE_TEST.txt', content: triggerContent }],
        features: { reflection: false, negotiation: false, memory: false }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // CRITICAL ASSERTIONS
    expect(data.status).toBe('waiting_human');
    expect(data.run_id).toBeDefined();
    expect(data.paused_at_node).toBe('human_review');
    
    expect(data.checkpoint_metadata).toBeDefined();
    expect(data.checkpoint_metadata.approval_sent_at).toBeDefined();
    
    expect(data.issues).toBeDefined();
    expect(data.issues.length).toBeGreaterThan(0);
    
    const kycRiskIssue = data.issues.find((i: any) => 
      i.category === 'kyc_risk' || i.category === 'ubo' || i.category === 'aml'
    );
    expect(kycRiskIssue).toBeDefined();
    expect(kycRiskIssue.severity).toBe('FAIL');
    
    console.log(`[HITL-TRIGGER-2] ✅ PASS: waiting_human triggered, ${data.issues.length} issues found`);
  }, 30000);
  
  it('[HITL-TRIGGER-3] Cash + Crypto + Tax Evasion document → waiting_human + kyc_risk issues', async () => {
    const triggerContent = readFileSync(TRIGGER_DOC_3, 'utf-8');
    
    console.log(`[HITL-TRIGGER-3] Testing document: ${triggerContent.substring(0, 80)}...`);
    
    const response = await fetch(`${serverUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [{ name: 'FUNDS_SOURCE_CASH_CRYPTO_TEST.txt', content: triggerContent }],
        features: { reflection: false, negotiation: false, memory: false }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // CRITICAL ASSERTIONS
    expect(data.status).toBe('waiting_human');
    expect(data.run_id).toBeDefined();
    expect(data.paused_at_node).toBe('human_review');
    
    expect(data.checkpoint_metadata).toBeDefined();
    
    expect(data.issues).toBeDefined();
    expect(data.issues.length).toBeGreaterThan(0);
    
    const kycRiskIssue = data.issues.find((i: any) => 
      i.category === 'kyc_risk' || i.category === 'aml' || i.category === 'tax_evasion'
    );
    expect(kycRiskIssue).toBeDefined();
    expect(kycRiskIssue.severity).toBe('FAIL');
    
    console.log(`[HITL-TRIGGER-3] ✅ PASS: waiting_human triggered, ${data.issues.length} issues found`);
  }, 30000);
  
  it('[HITL-BENIGN] Benign document → completed (NOT waiting_human)', async () => {
    console.log(`[HITL-BENIGN] Testing benign document (should NOT trigger HITL)`);
    
    const response = await fetch(`${serverUrl}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'langgraph_kyc',
        documents: [{ name: 'benign.txt', content: BENIGN_CONTENT }],
        features: { reflection: false, negotiation: false, memory: false }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // CRITICAL: Should NOT pause
    expect(data.status).not.toBe('waiting_human');
    expect(data.paused_at_node).toBeUndefined();
    
    // May have some low-severity issues (gaps/warnings), but NO HIGH-severity kyc_risk
    const highSeverityKycRisk = (data.issues || []).find((i: any) => 
      (i.category === 'kyc_risk' || i.category === 'pep' || i.category === 'sanctions') &&
      i.severity === 'FAIL'
    );
    expect(highSeverityKycRisk).toBeUndefined();
    
    // Should have trace showing human_review was skipped
    const humanReviewSkipped = data.graphReviewTrace?.events?.find((e: any) => 
      e.node === 'risk_assessment' && e.status === 'executed'
    );
    expect(humanReviewSkipped).toBeDefined();
    
    console.log(`[HITL-BENIGN] ✅ PASS: No HITL triggered for benign document`);
  }, 30000);
});


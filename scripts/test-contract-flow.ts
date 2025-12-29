/**
 * Test Script for Contract Risk Review Flow
 * Usage: npx ts-node scripts/test-contract-flow.ts
 */

// This script demonstrates how to test the contract-risk-review-v1 flow
// You can run this manually or adapt it for automated testing

const contractTestSample = {
  flow_id: 'contract-risk-review-v1',
  document_id: 'CONTRACT-TEST-001',
  sections: [
    {
      id: 'sec_1',
      title: 'Master Service Agreement',
      content: `
This Master Service Agreement ("Agreement") is entered into between Company A ("Provider") and Company B ("Client").

INDEMNIFICATION: Provider shall indemnify, defend, and hold harmless Client from and against any and all claims, damages, losses, and expenses arising from Provider's services.

LIABILITY: Provider's liability under this Agreement is UNLIMITED for all claims, damages, costs, and expenses.

PAYMENT TERMS: Client shall pay upfront fee of $500,000 upon execution of this Agreement. No refunds under any circumstances.

TERMINATION: Either party may terminate this Agreement with 14 days written notice.

GOVERNING LAW: This Agreement shall be governed by the laws of Provider's home jurisdiction. Client waives all rights to jury trial.

CONFIDENTIALITY: All information disclosed shall remain confidential in perpetuity.

INTELLECTUAL PROPERTY: All work product, deliverables, and intellectual property created shall be owned exclusively by Provider.
      `.trim(),
    },
  ],
  options: {
    language: 'english' as const,
    tone: 'formal' as const,
    client_name: 'Company B Legal Team',
    reviewer: 'Contract Review System v2',
    mode: 'fake' as const,
  },
};

console.log('='.repeat(80));
console.log('CONTRACT RISK REVIEW TEST');
console.log('='.repeat(80));
console.log('');
console.log('Test Contract Contains:');
console.log('  - Unlimited liability clause (CRITICAL)');
console.log('  - Short termination notice (14 days vs standard 60)');
console.log('  - Upfront non-refundable payment');
console.log('  - One-sided jurisdiction/jury waiver');
console.log('  - Provider owns all IP (non-standard)');
console.log('');
console.log('Expected Decision: escalate_legal');
console.log('Expected Blocking Issues: Unlimited liability');
console.log('');
console.log('To test, run:');
console.log('');
console.log('curl -X POST http://localhost:3002/api/orchestrate \\');
console.log('  -H "Content-Type: application/json" \\');
console.log(`  -d '${JSON.stringify(contractTestSample, null, 2)}'`);
console.log('');
console.log('Or start the dev server and use the UI:');
console.log('  1. Go to http://localhost:3002/document');
console.log('  2. Click "Run Full Compliance Review"');
console.log('  3. Manually change flow_id to "contract-risk-review-v1" in the code');
console.log('');
console.log('Expected Response Structure:');
console.log('  - parent_trace_id: orch_...');
console.log('  - decision.next_action: "escalate_legal"');
console.log('  - decision.blocking_issues: ["...unlimited liability..."]');
console.log('  - artifacts.review_issues.critical_count: 1+');
console.log('  - artifacts.evidence_requests.requests: [...]');
console.log('  - artifacts.client_communication: { subject, body }');
console.log('  - artifacts.audit_log: { audit_id, decision: "escalated" }');
console.log('');
console.log('='.repeat(80));


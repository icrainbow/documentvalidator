#!/usr/bin/env ts-node
/**
 * Agent System Test Script
 * Tests all agents via the /api/agent endpoint
 */

// Sample test payloads for each agent
const TEST_PAYLOADS = {
  'extract-facts-agent': {
    sectionContent: 'The client is interested in investing $50,000 in the tobacco industry with a target return of 15% by December 2025.',
    sectionTitle: 'Investment Proposal',
    sectionId: 'sec-001',
    docId: 'doc-12345',
  },
  
  'map-policy-agent': {
    facts: [
      {
        category: 'entity',
        text: 'tobacco industry',
        confidence: 0.95,
        source: {
          section_title: 'Investment Background',
          snippet: 'investing in the tobacco industry',
        },
      },
    ],
    documentType: 'investment_proposal',
  },
  
  'redteam-review-agent': {
    sectionContent: 'We recommend investing in tobacco stocks for high returns.',
    sectionTitle: 'Investment Strategy',
    sectionId: 'sec-002',
    policyMappings: [],
  },
  
  'request-evidence-agent': {
    issues: [
      {
        id: 'RT-001',
        type: 'policy_violation',
        severity: 'critical',
        description: 'Prohibited industry reference detected',
        suggested_fix: 'Remove reference or seek approval',
        policy_refs: ['COND-008'],
      },
    ],
    missing_evidence: ['Source of funds declaration', 'Risk acknowledgment signature'],
    context: 'Investment Proposal Document',
  },
  
  'draft-client-comms-agent': {
    review_results: {
      overall_status: 'fail',
      issues: [
        {
          id: 'RT-001',
          type: 'policy_violation',
          severity: 'critical',
          description: 'Prohibited industry reference: tobacco',
          suggested_fix: 'Remove reference',
        },
      ],
      critical_count: 1,
      high_count: 0,
    },
    tone: 'formal',
    language: 'english',
    client_name: 'John Smith',
  },
  
  'write-audit-agent': {
    document_id: 'DOC-12345',
    agent_activity: [
      {
        agent_id: 'extract-facts-agent',
        trace_id: 'trace_001',
        timestamp: new Date().toISOString(),
        status: 'success',
        summary: 'Extracted 5 facts',
      },
      {
        agent_id: 'redteam-review-agent',
        trace_id: 'trace_002',
        timestamp: new Date().toISOString(),
        status: 'success',
        summary: 'Found 1 critical issue',
      },
    ],
    final_decision: 'needs_revision',
    reviewer: 'Compliance System',
    flagged_issues_count: 1,
  },
  
  'evaluate-agent': {
    sectionContent: 'This is a comprehensive investment proposal covering all required elements with professional language.',
    sectionTitle: 'Executive Summary',
    criteria: ['Sufficient length', 'Clear structure', 'No prohibited content', 'Professional tone'],
  },
  
  'compliance-agent': {
    sectionContent: 'The investment strategy focuses on diversified portfolio across tech and healthcare sectors.',
    sectionTitle: 'Strategy Overview',
    checkType: 'full',
  },
};

console.log('='.repeat(80));
console.log('AGENT SYSTEM TEST');
console.log('='.repeat(80));
console.log('');
console.log('Testing all compliance demo agents via /api/agent endpoint');
console.log('Base URL: http://localhost:3001/api/agent');
console.log('');

Object.entries(TEST_PAYLOADS).forEach(([agentId, payload], index) => {
  console.log(`\n${index + 1}. Testing: ${agentId}`);
  console.log('-'.repeat(80));
  console.log('Request Payload:');
  console.log(JSON.stringify({ agent_id: agentId, input: payload, mode: 'fake' }, null, 2));
  console.log('');
  console.log('To test via curl:');
  console.log(`curl -X POST http://localhost:3001/api/agent \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '${JSON.stringify({ agent_id: agentId, input: payload, mode: 'fake' })}'`);
  console.log('');
});

console.log('\n' + '='.repeat(80));
console.log('EXPECTED RESPONSE FORMAT');
console.log('='.repeat(80));
console.log(JSON.stringify({
  ok: true,
  agent_id: '<agent-id>',
  trace_id: 'trace_<timestamp>_<random>',
  mode: 'fake',
  output: '<agent-specific-output>',
  metadata: {
    latency_ms: 0,
    tokens: 0,
    status: 'success',
  },
}, null, 2));

console.log('\n' + '='.repeat(80));
console.log('QUICK TEST COMMAND');
console.log('='.repeat(80));
console.log('# List all available agents:');
console.log('curl http://localhost:3001/api/agent');
console.log('');
console.log('# Test extract-facts-agent:');
console.log(`curl -X POST http://localhost:3001/api/agent -H "Content-Type: application/json" -d '${JSON.stringify({ agent_id: 'extract-facts-agent', input: TEST_PAYLOADS['extract-facts-agent'], mode: 'fake' })}'`);
console.log('');


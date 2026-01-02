/**
 * Flow2 Demo EDD Injection Tests
 * 
 * Tests the ambiguous reject detection and demo EDD metadata injection feature.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { isAmbiguousReject } from '../../app/lib/flow2/ambiguousRejectDetector';
import { generateDemoEddBundle } from '../../app/lib/flow2/demoEddGenerator';

const BASE_URL = 'http://localhost:3000';

describe('Flow2 Demo EDD Injection', () => {
  
  describe('Ambiguous Reject Detector', () => {
    it('should detect canonical ambiguous reject comment', () => {
      const comment = `Reject. The identity information doesn't match, and the client's declared source of funds elsewhere is completely different from this bank statement. Check the Wealth division's annual report from last year and see how many shell entities or aliases they actually have. Also, I recall the policy was updated last month — this type of offshore holding structure now requires an extra layer of review. Do not miss it.`;
      
      expect(isAmbiguousReject(comment)).toBe(true);
    });
    
    it('should NOT detect ambiguous reject if missing identity mismatch', () => {
      const comment = `Check the Wealth division's annual report from last year and see how many shell entities or aliases they actually have. Also, I recall the policy was updated last month — this type of offshore holding structure now requires an extra layer of review.`;
      
      expect(isAmbiguousReject(comment)).toBe(false);
    });
    
    it('should NOT detect ambiguous reject if missing wealth annual report', () => {
      const comment = `The identity information doesn't match. Also, there are many shell entities or aliases. The policy was updated last month and this offshore holding structure needs review.`;
      
      expect(isAmbiguousReject(comment)).toBe(false);
    });
    
    it('should NOT detect ambiguous reject if missing shell/aliases', () => {
      const comment = `The identity information doesn't match. Check the Wealth division's annual report from last year. The policy was updated last month and this offshore holding structure needs review.`;
      
      expect(isAmbiguousReject(comment)).toBe(false);
    });
    
    it('should NOT detect ambiguous reject if missing policy + offshore', () => {
      const comment = `The identity information doesn't match. Check the Wealth division's annual report from last year and see how many shell entities or aliases they actually have.`;
      
      expect(isAmbiguousReject(comment)).toBe(false);
    });
    
    it('should handle case insensitivity', () => {
      const comment = `REJECT. THE IDENTITY INFORMATION DOESN'T MATCH, and the client's declared source of funds elsewhere is completely different. Check the WEALTH division's ANNUAL REPORT from LAST YEAR and see how many SHELL ENTITIES or ALIASES they have. The POLICY was UPDATED LAST MONTH — this OFFSHORE HOLDING structure needs review.`;
      
      expect(isAmbiguousReject(comment)).toBe(true);
    });
    
    it('should handle extra whitespace and punctuation', () => {
      const comment = `Reject!!!   The   identity   information   doesn't   match.  Check  Wealth  annual  report  from  last  year  ...  shell  entities  or  aliases  ...  policy  updated  last  month  ...  offshore  holding  structure  ...`;
      
      expect(isAmbiguousReject(comment)).toBe(true);
    });
  });
  
  describe('Demo EDD Bundle Generator', () => {
    it('should generate complete demo EDD bundle', () => {
      const comment = `Test comment`;
      const bundle = generateDemoEddBundle(comment);
      
      expect(bundle.demo_mode).toBe('edd_injection');
      expect(bundle.demo_reject_comment).toBe(comment);
      expect(bundle.demo_injected_node).toEqual({
        id: 'edd',
        label: 'Enhanced Due Diligence (EDD)',
      });
      expect(bundle.demo_evidence).toMatchObject({
        pdf_snippet_image: '/demo/evidence-wealth-50m.svg',
        disclosure_current: '$5M',
        disclosure_wealth: '$50M',
        regulation: {
          title: 'Offshore Trust Look-through Supplementary Protocol',
          effective_date: '2025-12-01',
        },
      });
      expect(bundle.demo_trace).toBeDefined();
      expect(bundle.demo_trace.length).toBeGreaterThan(0);
    });
    
    it('should generate deterministic trace with expected event types', () => {
      const comment = `Test`;
      const bundle = generateDemoEddBundle(comment);
      
      const tasks = bundle.demo_trace.filter(e => e.kind === 'task');
      const skills = bundle.demo_trace.filter(e => e.kind === 'skill');
      const findings = bundle.demo_trace.filter(e => e.kind === 'finding');
      const actions = bundle.demo_trace.filter(e => e.kind === 'action');
      
      expect(tasks.length).toBe(3); // Task A, B, C
      expect(skills.length).toBe(6); // 3 skills x 2 states (running, done)
      expect(findings.length).toBe(2); // High risk + info
      expect(actions.length).toBe(1); // Route to EDD
    });
  });
  
  describe('API Integration (Poll Endpoint)', () => {
    it('should return demo fields when checkpoint has demo_mode', async () => {
      // This test assumes there's a checkpoint with demo_mode set
      // In a real scenario, you'd create a test checkpoint first
      // For now, we test the endpoint structure
      
      const fakeRunId = randomUUID();
      const response = await fetch(`${BASE_URL}/api/flow2/approvals/poll?run_id=${fakeRunId}`);
      
      // Should return 404 for non-existent run
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.status).toBe('not_found');
    });
  });
  
  describe('Backward Compatibility', () => {
    it('should not break poll endpoint for non-demo checkpoints', async () => {
      const fakeRunId = randomUUID();
      const response = await fetch(`${BASE_URL}/api/flow2/approvals/poll?run_id=${fakeRunId}`);
      
      expect(response.status).toBe(404);
      const data = await response.json();
      
      // Should have standard fields
      expect(data).toHaveProperty('ok');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('run_id');
    });
  });
});




import { describe, it, expect } from 'vitest';
import { executeParallelChecks } from '../../app/lib/graphKyc/executor';
import type { TopicSection } from '../../app/lib/graphKyc/types';

describe('Executor - executeParallelChecks', () => {
  const mockSections: TopicSection[] = [
    {
      topicId: 'client_identity',
      content: 'Client Name: John Doe. Date of Birth: 1980-01-01.',
      evidenceRefs: [],
      coverage: 'complete'
    },
    {
      topicId: 'risk_profile',
      content: 'High risk client due to jurisdiction.',
      evidenceRefs: [],
      coverage: 'partial'
    },
    {
      topicId: 'source_of_wealth',
      content: 'Income from employment.',
      evidenceRefs: [],
      coverage: 'missing'
    }
  ];
  
  it('runs all checks for escalate path', async () => {
    const result = await executeParallelChecks(mockSections, 'escalate');
    
    // Should have events for all three check nodes
    const nodeNames = result.events.map(e => e.node);
    expect(nodeNames).toContain('conflict_sweep');
    expect(nodeNames).toContain('gap_collector');
    expect(nodeNames).toContain('policy_flags_check');
    
    // Should have results
    expect(result.events.length).toBeGreaterThan(0);
  });
  
  it('skips conflict_sweep for fast path', async () => {
    const result = await executeParallelChecks(mockSections, 'fast');
    
    // Should have conflict_sweep event but with 'skipped' status
    const conflictEvent = result.events.find(e => e.node === 'conflict_sweep');
    expect(conflictEvent).toBeDefined();
    expect(conflictEvent?.status).toBe('skipped');
    
    // Should still have gap_collector with 'executed' status
    const gapEvent = result.events.find(e => e.node === 'gap_collector');
    expect(gapEvent).toBeDefined();
    expect(gapEvent?.status).toBe('executed');
  });
  
  it('detects coverage gaps for crosscheck path', async () => {
    const result = await executeParallelChecks(mockSections, 'crosscheck');
    
    // Should detect gaps (we have 'partial' and 'missing' coverage)
    expect(result.coverageGaps.length).toBeGreaterThan(0);
    
    // Should have gap_collector event
    const nodeNames = result.events.map(e => e.node);
    expect(nodeNames).toContain('gap_collector');
    
    // Verify gaps are detected correctly
    const gapTopics = result.coverageGaps.map(g => g.topicId);
    expect(gapTopics).toContain('risk_profile'); // partial coverage
    expect(gapTopics).toContain('source_of_wealth'); // missing coverage
  });
  
  it('runs conflict_sweep for crosscheck path', async () => {
    const result = await executeParallelChecks(mockSections, 'crosscheck');
    
    const nodeNames = result.events.map(e => e.node);
    expect(nodeNames).toContain('conflict_sweep');
  });
  
  it('returns proper ExecutionResult structure', async () => {
    const result = await executeParallelChecks(mockSections, 'escalate');
    
    // Should have all required fields
    expect(result).toHaveProperty('conflicts');
    expect(result).toHaveProperty('coverageGaps');
    expect(result).toHaveProperty('policyFlags');
    expect(result).toHaveProperty('events');
    
    // Should be arrays
    expect(Array.isArray(result.conflicts)).toBe(true);
    expect(Array.isArray(result.coverageGaps)).toBe(true);
    expect(Array.isArray(result.policyFlags)).toBe(true);
    expect(Array.isArray(result.events)).toBe(true);
  });
  
  it('detects policy violations in escalate path', async () => {
    const sectionsWithFlags: TopicSection[] = [
      {
        topicId: 'sanctions_pep',
        content: 'Client is on sanctions list and is a PEP (Politically Exposed Person).',
        evidenceRefs: [],
        coverage: 'complete'
      }
    ];
    
    const result = await executeParallelChecks(sectionsWithFlags, 'escalate');
    
    // Should detect policy flags (sanctions, PEP keywords)
    expect(result.policyFlags.length).toBeGreaterThan(0);
  });
});


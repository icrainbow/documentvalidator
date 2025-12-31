import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockReflectionProvider, ClaudeReflectionProvider } from '../../app/lib/graphKyc/reflectionProvider';

describe('MockReflectionProvider', () => {
  beforeEach(() => {
    delete process.env.REFLECTION_TEST_MODE;
  });
  
  afterEach(() => {
    delete process.env.REFLECTION_TEST_MODE;
  });
  
  it('returns skip when no issues detected', async () => {
    const provider = new MockReflectionProvider();
    const payload = { replanCount: 0, issuesCount: 0 };
    const result = await provider.run(payload, 'test prompt');
    const parsed = JSON.parse(result);
    
    expect(parsed.should_replan).toBe(false);
    expect(parsed.new_plan).toContain('skip');
    expect(parsed.confidence).toBeGreaterThan(0);
  });
  
  it('returns ask_human_for_scope when replan limit reached', async () => {
    const provider = new MockReflectionProvider();
    const payload = { replanCount: 1, issuesCount: 0 };
    const result = await provider.run(payload, 'test prompt');
    const parsed = JSON.parse(result);
    
    expect(parsed.should_replan).toBe(false);
    expect(parsed.new_plan).toContain('ask_human_for_scope');
    expect(parsed.reason).toContain('Replan limit reached');
  });
  
  it('returns skip when issues detected', async () => {
    const provider = new MockReflectionProvider();
    const payload = { replanCount: 0, issuesCount: 3 };
    const result = await provider.run(payload, 'test prompt');
    const parsed = JSON.parse(result);
    
    expect(parsed.should_replan).toBe(false);
    expect(parsed.new_plan).toContain('skip');
    expect(parsed.reason).toContain('Issues detected');
  });
  
  it('respects REFLECTION_TEST_MODE=rerun', async () => {
    process.env.REFLECTION_TEST_MODE = 'rerun';
    const provider = new MockReflectionProvider();
    const payload = { replanCount: 0, issuesCount: 0 };
    const result = await provider.run(payload, 'test prompt');
    const parsed = JSON.parse(result);
    
    expect(parsed.should_replan).toBe(true);
    expect(parsed.new_plan).toContain('rerun_batch_review');
    expect(parsed.reason).toContain('[TEST] Forcing rerun');
  });
  
  it('respects REFLECTION_TEST_MODE=human', async () => {
    process.env.REFLECTION_TEST_MODE = 'human';
    const provider = new MockReflectionProvider();
    const payload = { replanCount: 0, issuesCount: 0 };
    const result = await provider.run(payload, 'test prompt');
    const parsed = JSON.parse(result);
    
    expect(parsed.should_replan).toBe(false);
    expect(parsed.new_plan).toContain('ask_human_for_scope');
    expect(parsed.reason).toContain('[TEST] Forcing human gate');
  });
  
  it('respects REFLECTION_TEST_MODE=section', async () => {
    process.env.REFLECTION_TEST_MODE = 'section';
    const provider = new MockReflectionProvider();
    const payload = { replanCount: 0, issuesCount: 0 };
    const result = await provider.run(payload, 'test prompt');
    const parsed = JSON.parse(result);
    
    expect(parsed.should_replan).toBe(false);
    expect(parsed.new_plan).toContain('switch_to_section_review');
    expect(parsed.reason).toContain('[TEST] Forcing section review');
  });
});

describe('ClaudeReflectionProvider', () => {
  it('returns safe fallback on API error', async () => {
    const provider = new ClaudeReflectionProvider('invalid-api-key-for-testing');
    const payload = { replanCount: 0, issuesCount: 0 };
    const result = await provider.run(payload, 'test prompt');
    const parsed = JSON.parse(result);
    
    // Should return fallback response
    expect(parsed.should_replan).toBe(false);
    expect(parsed.new_plan).toContain('skip');
    expect(parsed.reason).toContain('unavailable');
  });
  
  it('returns ask_human fallback when replan limit reached', async () => {
    const provider = new ClaudeReflectionProvider('invalid-api-key-for-testing');
    const payload = { replanCount: 1, issuesCount: 0 };
    const result = await provider.run(payload, 'test prompt');
    const parsed = JSON.parse(result);
    
    // Should return fallback response with human gate
    expect(parsed.should_replan).toBe(false);
    expect(parsed.new_plan).toContain('ask_human_for_scope');
    expect(parsed.reason).toContain('unavailable');
  });
});



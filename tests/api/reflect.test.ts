import { describe, it, expect, afterEach } from 'vitest';
import { reflectAndReplan } from '../../app/lib/graphKyc/reflect';
import { createDefaultFlow2State } from '../../app/lib/graphKyc/flow2State';

describe('reflectAndReplan', () => {
  afterEach(() => {
    delete process.env.REFLECTION_TEST_MODE;
  });
  
  it('skips when reflection disabled', async () => {
    const state = createDefaultFlow2State([{ name: 'test.txt', content: 'test content' }]);
    state.features.reflection = false;
    
    const result = await reflectAndReplan(state);
    
    // Should have trace event indicating disabled
    expect(result.trace.some(t => 
      t.message.toLowerCase().includes('disabled') || 
      t.message.toLowerCase().includes('skipping')
    )).toBe(true);
    
    // Should not modify state
    expect(result.reflection.enabled).toBe(false);
  });
  
  it('enforces max 1 replan', async () => {
    const state = createDefaultFlow2State([{ name: 'test.txt', content: 'test content' }]);
    state.features.reflection = true;
    state.reflection.replanCount = 1; // Already at limit
    
    const result = await reflectAndReplan(state);
    
    // Should route to human gate
    expect(result.nextAction).toBe('ask_human_for_scope');
    
    // Should have trace explaining why
    expect(result.trace.some(t => 
      t.message.toLowerCase().includes('limit') ||
      t.message.toLowerCase().includes('human')
    )).toBe(true);
  });
  
  it('parses JSON and validates with Zod using TEST_MODE', async () => {
    process.env.REFLECTION_TEST_MODE = 'rerun';
    const state = createDefaultFlow2State([{ name: 'test.txt', content: 'test content' }]);
    state.features.reflection = true;
    state.reflection.replanCount = 0; // Below limit
    
    const result = await reflectAndReplan(state);
    
    // Should set nextAction from forced output
    expect(result.nextAction).toBe('rerun_batch_review');
    
    // Should update reflection state
    expect(result.reflection.lastConfidence).toBeGreaterThan(0);
    expect(result.reflection.lastNewPlan).toContain('rerun_batch_review');
    
    // Should have trace event
    expect(result.trace.some(t => t.type === 'reflection')).toBe(true);
  });
  
  it('handles different TEST_MODE values', async () => {
    const testCases = [
      { mode: 'human', expectedAction: 'ask_human_for_scope' },
      { mode: 'section', expectedAction: 'section_review' },
    ];
    
    for (const testCase of testCases) {
      process.env.REFLECTION_TEST_MODE = testCase.mode;
      const state = createDefaultFlow2State([{ name: 'test.txt', content: 'test' }]);
      state.features.reflection = true;
      state.reflection.replanCount = 0;
      
      const result = await reflectAndReplan(state);
      
      expect(result.nextAction).toBe(testCase.expectedAction);
      
      delete process.env.REFLECTION_TEST_MODE;
    }
  });
  
  it('increments replan count when should_replan is true', async () => {
    process.env.REFLECTION_TEST_MODE = 'rerun'; // Forces should_replan: true
    const state = createDefaultFlow2State([{ name: 'test.txt', content: 'test' }]);
    state.features.reflection = true;
    state.reflection.replanCount = 0;
    
    const result = await reflectAndReplan(state);
    
    expect(result.reflection.replanCount).toBe(1);
    expect(result.reflection.lastShouldReplan).toBe(true);
  });
});



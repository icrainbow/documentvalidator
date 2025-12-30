/**
 * Phase 1.6: Reflection Provider Abstraction
 * 
 * Pluggable provider interface for reflection LLM calls.
 * Allows switching between mock (deterministic) and real Claude API.
 */

/**
 * Provider interface: accepts payload + prompt, returns raw LLM text
 */
export interface ReflectionProvider {
  name: string;
  run(payload: Record<string, any>, prompt: string): Promise<string>;
}

/**
 * Mock provider: Preserves existing deterministic logic from reflect.ts
 */
export class MockReflectionProvider implements ReflectionProvider {
  name = 'mock';
  
  async run(payload: Record<string, any>, prompt: string): Promise<string> {
    // PRESERVE EXACT LOGIC from reflect.ts lines 85-110
    
    // If replan limit reached, force human gate
    if (payload.replanCount >= 1) {
      return JSON.stringify({
        should_replan: false,
        reason: 'Replan limit reached; require human scope decision.',
        new_plan: ['ask_human_for_scope'],
        confidence: 0.8,
      });
    }
    
    // If issues detected, keep current plan
    if (payload.issuesCount > 0) {
      return JSON.stringify({
        should_replan: false,
        reason: 'Issues detected; continuing with current plan.',
        new_plan: ['skip'],
        confidence: 0.7,
      });
    }
    
    // Default: no replan needed
    return JSON.stringify({
      should_replan: false,
      reason: 'Review proceeding normally; no replan needed.',
      new_plan: ['skip'],
      confidence: 0.75,
    });
  }
}

/**
 * Claude provider: Phase 1.7 implementation (placeholder for Phase 1.6)
 */
export class ClaudeReflectionProvider implements ReflectionProvider {
  name = 'claude';
  private apiKey: string;
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for ClaudeReflectionProvider');
    }
    this.apiKey = apiKey;
  }
  
  async run(payload: Record<string, any>, prompt: string): Promise<string> {
    // Phase 1.6 placeholder: safe fallback (will implement in Phase 1.7)
    console.warn('[Flow2/Reflection/Claude] Provider not yet fully implemented; returning safe fallback');
    
    // Return safe fallback JSON (do NOT throw to avoid breaking graph)
    if (payload.replanCount >= 1) {
      return JSON.stringify({
        should_replan: false,
        reason: 'Claude provider placeholder; require human decision.',
        new_plan: ['ask_human_for_scope'],
        confidence: 0.6,
      });
    }
    
    return JSON.stringify({
      should_replan: false,
      reason: 'Claude provider placeholder; continuing with current plan.',
      new_plan: ['skip'],
      confidence: 0.5,
    });
  }
}

/**
 * Provider factory: reads REFLECTION_PROVIDER env var
 */
export function createReflectionProvider(): ReflectionProvider {
  const providerType = process.env.REFLECTION_PROVIDER || 'mock';
  
  console.log(`[Flow2/Reflection] Provider type: ${providerType}`);
  
  if (providerType === 'claude') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.warn('[Flow2/Reflection] REFLECTION_PROVIDER=claude but ANTHROPIC_API_KEY not set; falling back to mock');
      return new MockReflectionProvider();
    }
    
    try {
      return new ClaudeReflectionProvider(apiKey);
    } catch (error: any) {
      console.error('[Flow2/Reflection] Failed to initialize Claude provider:', error.message);
      console.warn('[Flow2/Reflection] Falling back to mock provider');
      return new MockReflectionProvider();
    }
  }
  
  // Default: mock provider
  return new MockReflectionProvider();
}


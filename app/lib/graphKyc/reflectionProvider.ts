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
    // TEST MODE: Allow env var to force specific routing decision
    const testMode = process.env.REFLECTION_TEST_MODE; // 'rerun' | 'human' | 'section' | undefined
    
    if (testMode) {
      console.log(`[MockReflectionProvider] TEST MODE: ${testMode}`);
      
      if (testMode === 'rerun') {
        return JSON.stringify({
          should_replan: true,
          reason: '[TEST] Forcing rerun',
          new_plan: ['rerun_batch_review'],
          confidence: 0.9,
        });
      }
      
      if (testMode === 'human') {
        return JSON.stringify({
          should_replan: false,
          reason: '[TEST] Forcing human gate',
          new_plan: ['ask_human_for_scope'],
          confidence: 0.8,
        });
      }
      
      if (testMode === 'section') {
        return JSON.stringify({
          should_replan: false,
          reason: '[TEST] Forcing section review',
          new_plan: ['switch_to_section_review'],
          confidence: 0.7,
        });
      }
    }
    
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
 * Claude provider: fetch-based implementation (Phase 1.7)
 * Uses direct fetch to Claude API (matching llmReviewExecutor.ts pattern)
 */
export class ClaudeReflectionProvider implements ReflectionProvider {
  name = 'claude';
  private apiKey: string;
  private readonly MAX_TOKENS = 512;
  private readonly MODEL = 'claude-sonnet-4-20250514'; // Match llmReviewExecutor.ts
  private readonly TIMEOUT_MS = 15000; // 15 seconds
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for ClaudeReflectionProvider');
    }
    this.apiKey = apiKey;
  }
  
  async run(payload: Record<string, any>, prompt: string): Promise<string> {
    console.log('[Flow2/Reflection/Claude] Calling Claude API');
    const startTime = Date.now();
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.MODEL,
          max_tokens: this.MAX_TOKENS,
          temperature: 0.3, // Low for structured output
          messages: [{
            role: 'user',
            content: prompt
          }]
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown' }));
        throw new Error(`Claude API returned ${response.status}: ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      console.log(`[Flow2/Reflection/Claude] Success (${duration}ms)`);
      
      // Extract text from response (match llmReviewExecutor pattern)
      if (data.content && data.content[0] && data.content[0].type === 'text') {
        return data.content[0].text;
      }
      
      throw new Error('Unexpected response format from Claude');
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[Flow2/Reflection/Claude] Error after ${duration}ms:`, error.message);
      
      // SAFE FALLBACK: Return deterministic mock response
      // DO NOT throw - this would break the graph
      if (payload.replanCount >= 1) {
        console.warn('[Flow2/Reflection/Claude] Fallback: replan limit reached');
        return JSON.stringify({
          should_replan: false,
          reason: 'Claude unavailable; replan limit reached; require human decision.',
          new_plan: ['ask_human_for_scope'],
          confidence: 0.6,
        });
      }
      
      console.warn('[Flow2/Reflection/Claude] Fallback: continuing with current plan');
      return JSON.stringify({
        should_replan: false,
        reason: 'Claude API unavailable; continuing with current plan.',
        new_plan: ['skip'],
        confidence: 0.5,
      });
    }
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


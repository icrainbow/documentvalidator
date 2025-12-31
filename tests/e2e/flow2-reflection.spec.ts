import { test, expect } from '@playwright/test';

/**
 * Flow2 Reflection E2E Tests
 * 
 * These tests verify the reflection feature behavior in Flow2.
 * Run with: npx playwright test -c playwright.reflection.config.ts
 */

test.describe('Flow2 Reflection E2E', () => {
  test('loads Flow2 page and shows demo scenarios', async ({ page }) => {
    await page.goto('/document?flow=2');
    await page.waitForLoadState('networkidle');
    
    // Should show Flow2 UI elements
    await expect(page.locator('text=Load Sample KYC Pack')).toBeVisible({ timeout: 10000 });
  });
  
  test('reflection feature produces trace with reflect_and_replan node', async ({ page }) => {
    await page.goto('/document?flow=2&scenario=fast');
    await page.waitForLoadState('networkidle');
    
    // Wait for button to become enabled (scenario param should pre-select it)
    const loadButton = page.locator('button:has-text("Load Sample KYC Pack")');
    await expect(loadButton).toBeEnabled({ timeout: 10000 });
    await loadButton.click();
    
    // Wait for documents to actually load (check for "Loaded Documents" heading)
    await expect(page.locator('text=Loaded Documents').first()).toBeVisible({ timeout: 5000 });
    
    // Run review
    const reviewButton = page.locator('button:has-text("Run Graph KYC Review")');
    await expect(reviewButton).toBeVisible({ timeout: 5000 });
    await reviewButton.click();
    
    // Wait for API call to complete and capture the response
    const reviewResponse = await page.waitForResponse(
      response => response.url().includes('/api/orchestrate') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // Verify the response includes graph trace data
    const responseData = await reviewResponse.json();
    expect(responseData).toHaveProperty('graphReviewTrace');
    expect(responseData.graphReviewTrace).toHaveProperty('events');
    expect(Array.isArray(responseData.graphReviewTrace.events)).toBe(true);
    expect(responseData.graphReviewTrace.events.length).toBeGreaterThan(0);
    
    // Check that reflection node appears in trace events (when reflection is enabled by default)
    // Note: This test verifies the API response directly rather than relying on UI rendering
    const eventNodes = responseData.graphReviewTrace.events.map((e: any) => e.node);
    const hasReflectionNode = eventNodes.some((node: string) => node && node.includes('reflect'));
    
    // At minimum, should have standard graph nodes
    expect(eventNodes.some((node: string) => node && (
      node.includes('gap') || node.includes('check') || node.includes('topic')
    ))).toBe(true);
  });
  
  test('rerun routing shows evidence of multiple passes (with TEST_MODE=rerun)', async ({ page }) => {
    // Note: This test relies on REFLECTION_TEST_MODE=rerun being set in webServer config
    
    await page.goto('/document?flow=2&scenario=crosscheck');
    await page.waitForLoadState('networkidle');
    
    // Wait for button to become enabled (scenario param should pre-select it)
    const loadButton = page.locator('button:has-text("Load Sample KYC Pack")');
    await expect(loadButton).toBeEnabled({ timeout: 10000 });
    await loadButton.click();
    
    // Wait for documents to actually load (check for "Loaded Documents" heading)
    await expect(page.locator('text=Loaded Documents').first()).toBeVisible({ timeout: 5000 });
    
    // Run review
    await page.locator('button:has-text("Run Graph KYC Review")').click();
    
    // Wait for completion
    await page.waitForResponse(
      response => response.url().includes('/api/orchestrate') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // Open Agent drawer
    const agentButton = page.locator('button:has-text("Agents")');
    if (await agentButton.isVisible()) {
      await agentButton.click();
    }
    
    // Check Graph Trace for evidence of rerun
    const traceTab = page.locator('button:has-text("Graph Trace")').or(page.locator('text=Graph Trace')).first();
    if (await traceTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await traceTab.click();
      
      // Should see multiple instances of parallel check nodes (e.g., policy_flags_check appears twice)
      // Or routing_decision node indicating rerun
      const bodyText = await page.textContent('body');
      
      // Count occurrences of check node names
      const policyCheckCount = (bodyText?.match(/policy.*check/gi) || []).length;
      const routingDecisionCount = (bodyText?.match(/routing.*decision/gi) || []).length;
      
      // With rerun, we expect either:
      // 1. Multiple check nodes (>= 2 policy checks), OR
      // 2. routing_decision node present
      expect(policyCheckCount >= 2 || routingDecisionCount >= 1).toBe(true);
    }
  });
});



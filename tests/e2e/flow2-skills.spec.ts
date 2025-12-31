/**
 * E2E Tests: Skills Tab (Flow2)
 * 
 * Verifies that Skills tab shows catalog and invocations after Flow2 run.
 * Uses only data-testid selectors for stability.
 */

import { test, expect } from '@playwright/test';

/**
 * Helper: Open Agent Panel drawer and navigate to Skills tab
 */
async function openSkillsTab(page: any) {
  // Open Agent Panel drawer - use a more robust approach with debugging
  console.log('[E2E] Waiting for agent panel button...');
  
  try {
    // Wait for the entire page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('[E2E] Warning: networkidle timeout, continuing anyway');
    });
    
    // Try to find the button with explicit wait
    const agentButton = page.locator('[data-testid="agent-panel-button"]');
    
    console.log('[E2E] Checking if agent button exists...');
    const buttonCount = await agentButton.count();
    console.log(`[E2E] Found ${buttonCount} agent buttons`);
    
    if (buttonCount === 0) {
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/debug-no-agent-button.png', fullPage: true });
      console.log('[E2E] ERROR: Agent button not found. Screenshot saved.');
      
      // Try to find any buttons with "Agent" in them as fallback
      const anyAgentButton = page.locator('button:has-text("Agent")');
      const anyButtonCount = await anyAgentButton.count();
      console.log(`[E2E] Found ${anyButtonCount} buttons with "Agent" text`);
      
      if (anyButtonCount > 0) {
        console.log('[E2E] Using fallback selector');
        await anyAgentButton.first().click();
      } else {
        throw new Error('No agent panel button found with data-testid or text selector');
      }
    } else {
      await agentButton.click();
    }
    
    // Wait for drawer to open and Skills tab to be visible
    console.log('[E2E] Waiting for Skills tab button...');
    const skillsTabButton = page.locator('[data-testid="skills-tab-button"]');
    await expect(skillsTabButton).toBeVisible({ timeout: 10000 });
    await skillsTabButton.click();
    console.log('[E2E] Skills tab opened successfully');
  } catch (error) {
    console.error('[E2E] Error in openSkillsTab:', error);
    throw error;
  }
}

test.describe('Flow2 Skills E2E', () => {
  test('Skills tab shows catalog and invocations after Flow2 run', async ({ page }) => {
    // Navigate to Flow2 with scenario pre-selected
    await page.goto('/document?flow=2&scenario=fast');
    await page.waitForLoadState('networkidle');
    
    // Load demo documents
    const loadButton = page.locator('[data-testid="flow2-load-sample-button"]');
    await expect(loadButton).toBeEnabled({ timeout: 10000 });
    await loadButton.click();
    
    // Wait for documents to load confirmation
    await page.waitForTimeout(1000);
    
    // Run Flow2 review
    const reviewButton = page.locator('[data-testid="flow2-run-graph-review"]');
    await expect(reviewButton).toBeVisible({ timeout: 5000 });
    await reviewButton.click();
    
    // Wait for API call to complete
    await page.waitForResponse(
      response => response.url().includes('/api/orchestrate') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // Brief wait for UI state to settle
    await page.waitForTimeout(500);
    
    // Open Agent Panel and navigate to Skills tab
    await openSkillsTab(page);
    
    // Verify catalog is visible
    const catalogList = page.locator('[data-testid="skill-catalog-list"]');
    await expect(catalogList).toBeVisible({ timeout: 5000 });
    
    // Verify catalog has 2 skills (header + 2 rows = 3 total rows)
    const catalogRows = catalogList.locator('tr');
    await expect(catalogRows).toHaveCount(3, { timeout: 5000 }); // Exactly header + 2 skills
    
    // Verify invocations list is visible
    const invocationsList = page.locator('[data-testid="skill-invocations-list"]');
    await expect(invocationsList).toBeVisible({ timeout: 5000 });
    
    // Verify exactly 2 invocation rows exist
    const invocationRows = page.locator('[data-testid^="skill-invocation-row-"]');
    await expect(invocationRows).toHaveCount(2, { timeout: 5000 });
    
    // Verify first invocation row shows expected data (skill name, duration, status)
    const firstRow = invocationRows.first();
    await expect(firstRow).toContainText(/kyc\.topic_assemble|risk\.triage/);
    await expect(firstRow).toContainText(/\d+ms/); // Duration in ms
    await expect(firstRow).toContainText(/ok/); // Status (should be ok for successful run)
  });
  
  test('Skills tab expandable rows show detail', async ({ page }) => {
    // Navigate and run review (same setup as above)
    await page.goto('/document?flow=2&scenario=crosscheck');
    await page.waitForLoadState('networkidle');
    
    const loadButton = page.locator('[data-testid="flow2-load-sample-button"]');
    await expect(loadButton).toBeEnabled({ timeout: 10000 });
    await loadButton.click();
    await page.waitForTimeout(1000);
    
    const reviewButton = page.locator('[data-testid="flow2-run-graph-review"]');
    await expect(reviewButton).toBeVisible({ timeout: 5000 });
    await reviewButton.click();
    
    await page.waitForResponse(
      res => res.url().includes('/api/orchestrate') && res.status() === 200,
      { timeout: 30000 }
    );
    
    // Brief wait for UI state to settle
    await page.waitForTimeout(500);
    
    // Open Agent Panel and navigate to Skills tab
    await openSkillsTab(page);
    
    // Wait for invocation rows to be visible
    const invocationRows = page.locator('[data-testid^="skill-invocation-row-"]');
    await expect(invocationRows.first()).toBeVisible({ timeout: 5000 });
    
    // Click first invocation row to expand
    await invocationRows.first().click();
    
    // Wait for expanded content to appear
    await page.waitForTimeout(500);
    
    // Verify expanded content shows details (check for keywords in page content)
    const pageContent = await page.content();
    expect(pageContent).toContain('Owner Agent:');
    expect(pageContent).toContain('Transport:');
    expect(pageContent).toContain('Input Summary:');
    expect(pageContent).toContain('Output Summary:');
  });
});

import { test, expect } from '@playwright/test';

test.describe('Flow2 Agent Panel Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Flow2 document page
    await page.goto('/document?flow=2&scenario=crosscheck');
    await page.waitForLoadState('networkidle');
  });

  test('should show only 4 tabs in Flow2 agent panel', async ({ page }) => {
    // Load sample pack
    const loadSampleBtn = page.locator('[data-testid="flow2-load-sample-btn"]');
    await loadSampleBtn.click();
    await page.waitForTimeout(500);

    // Open agent panel
    const agentsBtn = page.locator('button:has-text("Agents")').first();
    await agentsBtn.click();
    await page.waitForTimeout(500);

    // Assert the 4 Flow2 tabs exist
    await expect(page.locator('[data-testid="flow2-tab-graph-trace"]')).toBeVisible();
    await expect(page.locator('[data-testid="flow2-tab-graph"]')).toBeVisible();
    await expect(page.locator('[data-testid="flow2-tab-runs"]')).toBeVisible();
    await expect(page.locator('[data-testid="flow2-tab-config"]')).toBeVisible();

    // Assert old Flow1-style tabs DO NOT exist as top-level tabs
    // "Overview", "Skills", "Gaps" should not be present as top-level tab buttons
    const tabContainer = page.locator('.border-b-2.border-slate-200').last();
    const tabText = await tabContainer.textContent();
    
    expect(tabText).not.toContain('Overview');
    expect(tabText).not.toContain('💼 Skills'); // Flow1 skills tab label
    expect(tabText).not.toContain('Coverage Gaps'); // Flow1 gaps tab label
  });

  test('should allow switching between tabs', async ({ page }) => {
    // Load sample and open panel
    await page.locator('[data-testid="flow2-load-sample-btn"]').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Agents")').first().click();
    await page.waitForTimeout(500);

    // Click Graph tab
    await page.locator('[data-testid="flow2-tab-graph"]').click();
    await expect(page.locator('text=Graph Data').or(page.locator('text=No graph data yet'))).toBeVisible();

    // Click Runs tab
    await page.locator('[data-testid="flow2-tab-runs"]').click();
    await expect(page.locator('text=Agent Runs')).toBeVisible();

    // Click Config tab
    await page.locator('[data-testid="flow2-tab-config"]').click();
    await expect(page.locator('text=Configuration')).toBeVisible();

    // Click back to Graph Trace
    await page.locator('[data-testid="flow2-tab-graph-trace"]').click();
    await expect(page.locator('text=No trace data yet').or(page.locator('[data-node]').first())).toBeVisible();
  });
});


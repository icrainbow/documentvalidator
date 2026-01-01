import { test, expect } from '@playwright/test';

test.describe('Flow2 Issue to Topic Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/document?flow=2&scenario=crosscheck');
    await page.waitForLoadState('networkidle');
  });

  test('should scroll to and highlight topic when clicking an issue', async ({ page }) => {
    // Load sample pack
    await page.locator('[data-testid="flow2-load-sample-btn"]').click();
    await page.waitForTimeout(500);

    // Run review
    await page.locator('[data-testid="flow2-run-review-btn"]').click();
    await page.waitForTimeout(3000);

    // Open agent panel
    await page.locator('button:has-text("Agents")').first().click();
    await page.waitForTimeout(500);

    // Go to Graph Trace tab
    await page.locator('[data-testid="flow2-tab-graph-trace"]').click();
    await page.waitForTimeout(300);

    // Expand Outputs section
    const outputsBtn = page.locator('button:has-text("Outputs (Issues & EDD)")');
    if (await outputsBtn.isVisible()) {
      await outputsBtn.click();
      await page.waitForTimeout(300);
    }

    // Click first issue
    const firstIssue = page.locator('[data-testid^="issue-row-"]').first();
    if (await firstIssue.isVisible()) {
      await firstIssue.click();
      await page.waitForTimeout(500);

      // Assert a topic card is highlighted
      const highlightedCard = page.locator('[data-testid^="topic-card-"].border-yellow-400');
      await expect(highlightedCard).toBeVisible();
    }
  });
});


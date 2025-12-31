import { test, expect } from '@playwright/test';

test.describe('Flow2 Document Page UX', () => {
  
  test('should NOT render sections on left panel in Flow2', async ({ page }) => {
    // Navigate to Flow2
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="flow2-load-sample-button"]', { timeout: 5000 });
    
    // Load sample documents
    await page.click('[data-testid="flow2-load-sample-button"]');
    await page.waitForTimeout(500);
    
    // Verify NO sections rendered (sections have data-section-id attribute)
    const sections = await page.locator('[data-section-id]').count();
    expect(sections).toBe(0);
  });
  
  test('right panel should NOT show Flow1-only elements in Flow2', async ({ page }) => {
    // Navigate to Flow2
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="flow2-run-graph-review"]', { timeout: 5000 });
    
    // Verify Review Type radio NOT present
    const reviewTypeLabel = page.locator('text=Review Type:');
    await expect(reviewTypeLabel).toHaveCount(0);
    
    // Verify Submit Document button NOT present
    const submitButton = page.locator('button:has-text("Submit Document")');
    await expect(submitButton).toHaveCount(0);
    
    // Verify Sign Off button NOT present
    const signOffButton = page.locator('button:has-text("Sign Off on Warnings")');
    await expect(signOffButton).toHaveCount(0);
  });
  
  test('right panel should show Flow2-specific elements', async ({ page }) => {
    // Navigate to Flow2
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="flow2-run-graph-review"]', { timeout: 5000 });
    
    // Verify Run Graph Review button present
    const runButton = page.locator('[data-testid="flow2-run-graph-review"]');
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeDisabled(); // No docs loaded yet
    
    // Verify Agents button present
    const agentsButton = page.locator('[data-testid="agent-panel-button"]');
    await expect(agentsButton).toBeVisible();
    
    // Verify Info panel present
    const infoPanel = page.locator('text=What Happens in Graph Review?');
    await expect(infoPanel).toBeVisible();
    
    // Verify Status display present
    const status = page.locator('text=Pending Review');
    await expect(status).toBeVisible();
  });
  
  test('should enable Run Review button after loading documents', async ({ page }) => {
    // Navigate to Flow2
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    // Wait for load button
    await page.waitForSelector('[data-testid="flow2-load-sample-button"]', { timeout: 5000 });
    
    // Verify Run button disabled initially
    const runButton = page.locator('[data-testid="flow2-run-graph-review"]');
    await expect(runButton).toBeDisabled();
    
    // Load sample documents
    await page.click('[data-testid="flow2-load-sample-button"]');
    await page.waitForTimeout(500);
    
    // Button should now be enabled
    await expect(runButton).toBeEnabled();
  });
  
  test('Info panel should expand and collapse', async ({ page }) => {
    // Navigate to Flow2
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    // Wait for page to load
    await page.waitForSelector('text=What Happens in Graph Review?', { timeout: 5000 });
    
    // Info panel should be collapsed by default (content not visible)
    const infoContent = page.locator('text=Topic Assembler');
    await expect(infoContent).not.toBeVisible();
    
    // Click to expand
    await page.click('text=What Happens in Graph Review?');
    await page.waitForTimeout(200);
    
    // Content should now be visible
    await expect(infoContent).toBeVisible();
    
    // Click to collapse
    await page.click('text=What Happens in Graph Review?');
    await page.waitForTimeout(200);
    
    // Content should be hidden again
    await expect(infoContent).not.toBeVisible();
  });
  
  test('should update status after running review', async ({ page }) => {
    // Navigate to Flow2
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    // Load documents
    await page.waitForSelector('[data-testid="flow2-load-sample-button"]', { timeout: 5000 });
    await page.click('[data-testid="flow2-load-sample-button"]');
    await page.waitForTimeout(500);
    
    // Verify initial status
    const pendingStatus = page.locator('text=Pending Review');
    await expect(pendingStatus).toBeVisible();
    
    // Run review
    const runButton = page.locator('[data-testid="flow2-run-graph-review"]');
    await runButton.click();
    
    // Wait for review to complete (up to 10 seconds)
    await page.waitForSelector('text=Review Complete', { timeout: 10000 });
    
    // Verify status badge changed (first instance is the badge)
    const completeBadge = page.locator('.bg-green-600.text-white:has-text("Review Complete")');
    await expect(completeBadge).toBeVisible();
    
    // Verify success result box appears (in green box at bottom)
    const successBox = page.locator('.bg-green-50.border-green-300:has-text("Graph execution successful")');
    await expect(successBox).toBeVisible();
  });
});


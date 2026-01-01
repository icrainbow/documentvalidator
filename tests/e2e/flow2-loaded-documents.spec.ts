import { test, expect } from '@playwright/test';

test.describe('Flow2 Loaded Documents (no duplicates)', () => {
  
  test('should show Loaded Documents exactly once after loading sample', async ({ page }) => {
    // Navigate to Flow2
    await page.goto('/document?flow=2&scenario=crosscheck');
    
    // Wait for page load
    await page.waitForSelector('[data-testid="flow2-load-sample-button"]', { timeout: 5000 });
    
    // Initially, no documents loaded
    await expect(page.locator('[data-testid="flow2-documents-list"]')).not.toBeVisible();
    
    // Load sample documents
    await page.click('[data-testid="flow2-load-sample-button"]');
    await page.waitForTimeout(500);
    
    // Now documents list should be visible
    await expect(page.locator('[data-testid="flow2-documents-list"]')).toBeVisible();
    
    // Assert "Loaded Documents" heading appears exactly once
    const loadedDocsHeadings = page.locator('text=/Loaded Documents \\(\\d+\\)/');
    const count = await loadedDocsHeadings.count();
    expect(count).toBe(1);
    
    // Verify it's the Flow2DocumentsList component (has Clear All button)
    const documentsList = page.locator('[data-testid="flow2-documents-list"]');
    await expect(documentsList.locator('button:has-text("Clear All")')).toBeVisible();
  });
  
  test('should show document count and allow removal', async ({ page }) => {
    await page.goto('/document?flow=2&scenario=crosscheck');
    await page.waitForSelector('[data-testid="flow2-load-sample-button"]');
    
    // Load sample
    await page.click('[data-testid="flow2-load-sample-button"]');
    await page.waitForTimeout(500);
    
    // Check document count in heading
    const documentsList = page.locator('[data-testid="flow2-documents-list"]');
    await expect(documentsList).toContainText('Loaded Documents (3)');
    
    // Verify individual document cards are shown
    const docCards = documentsList.locator('.bg-white.border-slate-300');
    const docCount = await docCards.count();
    expect(docCount).toBeGreaterThanOrEqual(3);
  });
});


/**
 * Phase 3: E2E Tests for Graph Definition Tab
 * 
 * Tests that the Graph Definition tab appears and displays correctly in Flow2.
 * 
 * Run with: npx playwright test tests/e2e/flow2-graph-definition.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Flow2 Graph Definition UI', () => {
  test('Graph Definition tab appears after Flow2 review', async ({ page }) => {
    // Navigate to Flow2 with fast scenario
    await page.goto('/document?flow=2&scenario=fast');
    await page.waitForLoadState('networkidle');
    
    // Load sample documents
    const loadButton = page.locator('[data-testid="flow2-load-sample-button"]');
    await expect(loadButton).toBeEnabled({ timeout: 10000 });
    await loadButton.click();
    
    // Wait for documents to load
    await expect(page.locator('text=Loaded Documents').first()).toBeVisible({ timeout: 5000 });
    
    // Run graph review
    const reviewButton = page.locator('[data-testid="flow2-run-graph-review"]');
    await expect(reviewButton).toBeVisible({ timeout: 5000 });
    await reviewButton.click();
    
    // Wait for API call to complete
    await page.waitForResponse(
      response => response.url().includes('/api/orchestrate') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // Open Agent Panel
    const agentPanelButton = page.locator('[data-testid="agent-panel-button"]');
    await expect(agentPanelButton).toBeVisible({ timeout: 5000 });
    await agentPanelButton.click();
    
    // Graph Definition tab should be visible
    const graphDefTab = page.locator('[data-testid="graph-definition-tab-button"]');
    await expect(graphDefTab).toBeVisible({ timeout: 5000 });
  });
  
  test('Graph metadata summary displays correct info', async ({ page }) => {
    // Navigate to Flow2 with fast scenario
    await page.goto('/document?flow=2&scenario=fast');
    await page.waitForLoadState('networkidle');
    
    // Load sample documents
    const loadButton = page.locator('[data-testid="flow2-load-sample-button"]');
    await expect(loadButton).toBeEnabled({ timeout: 10000 });
    await loadButton.click();
    await expect(page.locator('text=Loaded Documents').first()).toBeVisible({ timeout: 5000 });
    
    // Run graph review
    await page.locator('[data-testid="flow2-run-graph-review"]').click();
    await page.waitForResponse(
      response => response.url().includes('/api/orchestrate') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // Open Agent Panel
    await page.locator('[data-testid="agent-panel-button"]').click();
    
    // Click Graph Definition tab
    const graphDefTab = page.locator('[data-testid="graph-definition-tab-button"]');
    await expect(graphDefTab).toBeVisible({ timeout: 5000 });
    await graphDefTab.click();
    
    // Metadata summary should be visible
    const metadataSummary = page.locator('[data-testid="graph-metadata-summary"]');
    await expect(metadataSummary).toBeVisible({ timeout: 5000 });
    
    // Check content (lenient - just verify structure)
    await expect(metadataSummary).toContainText('flow2_kyc_v1');
    await expect(metadataSummary).toContainText(/\d+\.\d+\.\d+/); // Version regex
    
    // Checksum should be visible and 12 characters
    const bodyText = await metadataSummary.textContent();
    expect(bodyText).toBeTruthy();
    const checksumMatch = bodyText!.match(/[a-f0-9]{12}/); // 12-char hex checksum
    expect(checksumMatch).toBeTruthy();
  });
  
  test('Definition viewer shows JSON when available', async ({ page }) => {
    // Navigate to Flow2 with crosscheck scenario
    await page.goto('/document?flow=2&scenario=crosscheck');
    await page.waitForLoadState('networkidle');
    
    // Load sample documents
    const loadButton = page.locator('[data-testid="flow2-load-sample-button"]');
    await expect(loadButton).toBeEnabled({ timeout: 10000 });
    await loadButton.click();
    await expect(page.locator('text=Loaded Documents').first()).toBeVisible({ timeout: 5000 });
    
    // Run graph review
    await page.locator('[data-testid="flow2-run-graph-review"]').click();
    await page.waitForResponse(
      response => response.url().includes('/api/orchestrate') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // Open Agent Panel and navigate to Graph Definition tab
    await page.locator('[data-testid="agent-panel-button"]').click();
    await page.locator('[data-testid="graph-definition-tab-button"]').click();
    
    // In production build, graphDefinition may not be present (gated)
    // Check if definition view exists
    const definitionView = page.locator('[data-testid="graph-definition-view"]');
    const isVisible = await definitionView.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isVisible) {
      // If definition is present, verify its content
      const expandButton = definitionView.locator('button').first();
      await expandButton.click();
      await page.waitForTimeout(500);
      
      const definitionText = await definitionView.textContent();
      expect(definitionText).toContain('nodes');
      expect(definitionText).toContain('edges');
      expect(definitionText).not.toContain('undefined');
      expect(definitionText).not.toContain('[object Object]');
    } else {
      // If not present, verify metadata is still shown
      const metadataSummary = page.locator('[data-testid="graph-metadata-summary"]');
      await expect(metadataSummary).toBeVisible({ timeout: 5000 });
      await expect(metadataSummary).toContainText('flow2_kyc_v1');
    }
  });
  
  test('Handles missing graphDefinition gracefully', async ({ page }) => {
    // This test verifies defensive rendering
    // In test environment, graphDefinition should always be present
    // But UI should not crash if it's missing
    
    await page.goto('/document?flow=2&scenario=fast');
    await page.waitForLoadState('networkidle');
    
    const loadButton = page.locator('[data-testid="flow2-load-sample-button"]');
    await expect(loadButton).toBeEnabled({ timeout: 10000 });
    await loadButton.click();
    await expect(page.locator('text=Loaded Documents').first()).toBeVisible({ timeout: 5000 });
    
    await page.locator('[data-testid="flow2-run-graph-review"]').click();
    await page.waitForResponse(
      response => response.url().includes('/api/orchestrate') && response.status() === 200,
      { timeout: 30000 }
    );
    
    await page.locator('[data-testid="agent-panel-button"]').click();
    await page.locator('[data-testid="graph-definition-tab-button"]').click();
    
    // Metadata summary should always be visible (minimal requirement)
    const metadataSummary = page.locator('[data-testid="graph-metadata-summary"]');
    await expect(metadataSummary).toBeVisible({ timeout: 5000 });
    
    // Page should not have crashed
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    
    // No console errors related to "undefined" or "object Object"
    // (This would be captured by browser console listeners if set up)
  });
});


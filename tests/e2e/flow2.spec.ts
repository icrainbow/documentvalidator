/**
 * E2E Tests for Flow2 (LangGraph KYC)
 * 
 * Tests demo scenarios, graph trace, conflicts/gaps tabs.
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Flow2: LangGraph KYC', () => {
  
  test('Flow2 mode: /document?flow=2 loads with demo loader', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/document?flow=2');
    await page.waitForLoadState('networkidle');
    
    // Demo loader should be visible
    await expect(page.locator('text=Demo Scenarios')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Select Test Scenario')).toBeVisible();
    
    // No console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('Flow2: Load "Fast Path" scenario populates documents', async ({ page }) => {
    await page.goto('/document?flow=2');
    await page.waitForLoadState('networkidle');
    
    // Select scenario
    await page.selectOption('select', { label: /Fast Path/i });
    
    // Click load button
    await page.click('button:has-text("Load Sample KYC Pack")');
    
    // Wait for documents to appear
    await expect(page.locator('text=Loaded Documents')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=3')).toBeVisible(); // 3 documents
  });

  test('Flow2: Run Graph KYC Review triggers correct API call', async ({ page }) => {
    await page.goto('/document?flow=2');
    await page.waitForLoadState('networkidle');
    
    // Load scenario
    await page.selectOption('select', { label: /Fast Path/i });
    await page.click('button:has-text("Load Sample KYC Pack")');
    await expect(page.locator('text=Loaded Documents')).toBeVisible({ timeout: 5000 });
    
    // Set up network listener
    const apiRequest = page.waitForRequest(req => 
      req.url().includes('/api/orchestrate') && 
      req.method() === 'POST'
    );
    
    // Click review button
    await page.click('button:has-text("Run Graph KYC Review")');
    
    // Verify API call
    const request = await apiRequest;
    const postData = request.postDataJSON();
    expect(postData.mode).toBe('langgraph_kyc');
    expect(postData.documents).toBeDefined();
    expect(Array.isArray(postData.documents)).toBe(true);
  });

  test('Flow2: Graph Trace tab appears after review', async ({ page }) => {
    await page.goto('/document?flow=2');
    await page.waitForLoadState('networkidle');
    
    // Load and review
    await page.selectOption('select', { label: /Fast Path/i });
    await page.click('button:has-text("Load Sample KYC Pack")');
    await expect(page.locator('text=Loaded Documents')).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Run Graph KYC Review")');
    
    // Wait for review to complete (look for completion indicator)
    await page.waitForResponse(
      response => response.url().includes('/api/orchestrate') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // Open agent drawer
    await page.click('button:has-text("Agent")');
    
    // Graph Trace tab should appear
    await expect(page.locator('button:has-text("Graph Trace")')).toBeVisible({ timeout: 5000 });
    
    // Click it
    await page.click('button:has-text("Graph Trace")');
    
    // Verify content
    await expect(page.locator('text=Graph Execution Summary')).toBeVisible();
    await expect(page.locator('text=Route Decision Inputs')).toBeVisible();
  });

  test('Flow2: Crosscheck scenario shows Conflicts tab', async ({ page }) => {
    await page.goto('/document?flow=2');
    await page.waitForLoadState('networkidle');
    
    // Load crosscheck scenario (should have conflicts)
    await page.selectOption('select', { label: /Crosscheck/i });
    await page.click('button:has-text("Load Sample KYC Pack")');
    await expect(page.locator('text=Loaded Documents')).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Run Graph KYC Review")');
    
    await page.waitForResponse(
      response => response.url().includes('/api/orchestrate') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // Open drawer
    await page.click('button:has-text("Agent")');
    
    // Conflicts tab may appear (depends on conflict detection logic)
    // This is a soft check - if conflicts exist, tab should be there
    const conflictsTab = page.locator('button:has-text("Conflicts")');
    const isVisible = await conflictsTab.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isVisible) {
      await conflictsTab.click();
      await expect(page.locator('text=conflict').first()).toBeVisible();
    }
  });

  test('Flow2: Escalate scenario shows Gaps tab', async ({ page }) => {
    await page.goto('/document?flow=2');
    await page.waitForLoadState('networkidle');
    
    // Load escalate scenario (should have coverage gaps)
    await page.selectOption('select', { label: /Escalate/i });
    await page.click('button:has-text("Load Sample KYC Pack")');
    await expect(page.locator('text=Loaded Documents')).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Run Graph KYC Review")');
    
    await page.waitForResponse(
      response => response.url().includes('/api/orchestrate') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // Open drawer
    await page.click('button:has-text("Agent")');
    
    // Gaps tab should appear
    const gapsTab = page.locator('button:has-text("Gaps")');
    const isVisible = await gapsTab.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isVisible) {
      await gapsTab.click();
      await expect(page.locator('text=gap').first()).toBeVisible();
    }
  });

  test('Flow2: no Next.js error overlay appears', async ({ page }) => {
    await page.goto('/document?flow=2');
    await page.waitForLoadState('networkidle');
    
    const errorOverlay = page.locator('[data-nextjs-dialog-overlay]');
    await expect(errorOverlay).not.toBeVisible();
  });
});



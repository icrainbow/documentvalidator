/**
 * E2E Tests for Flow1 (Agentic Batch Review)
 * 
 * Tests that Flow1 loads, renders correctly, and maintains isolation from Flow2.
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Flow1: Agentic Batch Review', () => {
  
  test('homepage loads without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    
    // Wait for main content
    await expect(page.locator('h1')).toContainText('Document Review System');
    
    // Verify both flow cards are visible
    await expect(page.locator('text=Flow 1 — Agentic Batch Review')).toBeVisible();
    await expect(page.locator('text=Flow 2 — KYC Graph Review')).toBeVisible();
    
    // No console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('/document page loads in Flow1 mode by default', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate without flow param (should default to Flow1)
    await page.goto('/document');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Flow1 elements should be present (if sections exist)
    // or show empty state
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeDefined();
    
    // Flow2 demo loader should NOT be visible
    await expect(page.locator('text=Demo Scenarios')).not.toBeVisible();
    
    // No console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('explicit Flow1 mode: /document?flow=1 works', async ({ page }) => {
    await page.goto('/document?flow=1');
    await page.waitForLoadState('networkidle');
    
    // Should not show Flow2 loader
    await expect(page.locator('text=Demo Scenarios')).not.toBeVisible();
  });

  test('Flow1: Agent drawer opens and shows correct tabs', async ({ page }) => {
    await page.goto('/document?flow=1');
    await page.waitForLoadState('networkidle');
    
    // Click Agent button (if visible)
    const agentButton = page.locator('button:has-text("Agent")').first();
    if (await agentButton.isVisible()) {
      await agentButton.click();
      
      // Drawer should open
      await expect(page.locator('text=Agent Overview').or(page.locator('text=Configuration'))).toBeVisible({ timeout: 5000 });
      
      // Flow2 tabs should NOT be visible
      await expect(page.locator('button:has-text("Graph Trace")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Conflicts")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Gaps/EDD")')).not.toBeVisible();
    }
  });

  test('Flow1: no Next.js error overlay appears', async ({ page }) => {
    await page.goto('/document?flow=1');
    await page.waitForLoadState('networkidle');
    
    // Next.js error overlay has specific selectors
    const errorOverlay = page.locator('[data-nextjs-dialog-overlay]');
    await expect(errorOverlay).not.toBeVisible();
    
    // Also check for common error text
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Application error: a client-side exception has occurred');
  });
});



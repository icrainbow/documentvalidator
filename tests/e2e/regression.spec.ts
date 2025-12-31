/**
 * Regression Guard Tests
 * 
 * Catches common issues: console errors, unhandled rejections, Next.js error overlays
 */

import { test, expect } from '@playwright/test';

test.describe('Regression Guards', () => {
  
  test('critical pages load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    // Test homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
    
    // Test sectioning page
    await page.goto('/sectioning');
    await page.waitForLoadState('networkidle');
    
    // Test Flow1 document page
    await page.goto('/document?flow=1');
    await page.waitForLoadState('networkidle');
    
    // Test Flow2 document page
    await page.goto('/document?flow=2');
    await page.waitForLoadState('networkidle');
    
    // Assert no errors (allow some known warnings)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('Watchpack Error') && // Known file watcher issue
      !err.includes('EMFILE') // Known macOS limit
    );
    
    expect(criticalErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
  
  test('no unhandled promise rejections', async ({ page }) => {
    const rejections: string[] = [];
    
    page.on('pageerror', error => {
      if (error.message.includes('unhandled') || error.message.includes('rejection')) {
        rejections.push(error.message);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/document?flow=2');
    await page.waitForLoadState('networkidle');
    
    expect(rejections).toHaveLength(0);
  });
  
  test('no Next.js error overlay on any page', async ({ page }) => {
    const pages = ['/', '/sectioning', '/document?flow=1', '/document?flow=2'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      const errorOverlay = page.locator('[data-nextjs-dialog-overlay]');
      await expect(errorOverlay).not.toBeVisible();
      
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('Application error: a client-side exception has occurred');
    }
  });
  
  test('build artifacts are not corrupted (200 status on static assets)', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes('/_next/')) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    expect(failedRequests).toHaveLength(0);
  });
});



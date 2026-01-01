import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Flow2 More Inputs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/document?flow=2&scenario=crosscheck');
    await page.waitForLoadState('networkidle');
  });

  test('should open More Inputs modal and upload file to topic', async ({ page }) => {
    // Load sample pack
    await page.locator('[data-testid="flow2-load-sample-btn"]').click();
    await page.waitForTimeout(500);

    // Assert derived topics appear
    await expect(page.locator('[data-testid="derived-topics"]')).toBeVisible();

    // Click More Inputs on first topic
    const moreInputsBtn = page.locator('[data-testid^="topic-more-inputs-"]').first();
    await moreInputsBtn.click();
    await page.waitForTimeout(300);

    // Assert modal opens
    await expect(page.locator('text=Add More Inputs:')).toBeVisible();

    // Upload test file
    const filePath = path.join(__dirname, '../fixtures/test-kyc-doc.txt');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Submit
    await page.locator('button:has-text("Upload & Fuse")').click();
    await page.waitForTimeout(1000);

    // Assert modal closes
    await expect(page.locator('text=Add More Inputs:')).not.toBeVisible();

    // Assert topic sources list contains new file
    await expect(page.locator('text=test-kyc-doc.txt')).toBeVisible();
  });
});


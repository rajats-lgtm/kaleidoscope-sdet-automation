import type { Page, TestInfo } from '@playwright/test';

/** Attaches a full-page screenshot to the HTML report for the given step. */
export async function attachScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  try {
    const body = await page.screenshot({ fullPage: true });
    await testInfo.attach(name, { body, contentType: 'image/png' });
  } catch {
    // Evidence capture must never fail a test.
  }
}

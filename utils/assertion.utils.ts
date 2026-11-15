import { expect, type Locator, type Page } from '@playwright/test';

/** Collapses whitespace and lower-cases so text comparisons ignore formatting. */
export const normalise = (value: string): string => value.replace(/\s+/g, ' ').trim().toLowerCase();

/** Asserts that the page body contains the given text (whitespace/case-insensitive). */
export async function expectPageToContain(page: Page, text: string, description = text): Promise<void> {
  const needle = normalise(text);
  await expect
    .poll(async () => normalise(await page.locator('body').innerText()), {
      message: `page should contain "${description}"`,
    })
    .toContain(needle);
}

/** Asserts that the page body does NOT contain the given text. */
export async function expectPageNotToContain(page: Page, text: string, description = text): Promise<void> {
  const needle = normalise(text);
  const body = normalise(await page.locator('body').innerText());
  expect(body, `page should not contain "${description}"`).not.toContain(needle);
}

/** Passes as soon as any one of the locators is visible. */
export async function expectAnyVisible(locators: Locator[], description: string): Promise<void> {
  await expect
    .poll(
      async () => {
        for (const locator of locators) {
          if (await locator.first().isVisible().catch(() => false)) return true;
        }
        return false;
      },
      { message: `${description} should be visible` },
    )
    .toBe(true);
}

export async function expectUrlToMatch(page: Page, pattern: RegExp, description = 'URL'): Promise<void> {
  await expect(page, `${description} should match ${pattern}`).toHaveURL(pattern);
}

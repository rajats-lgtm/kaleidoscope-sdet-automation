import { expect, type Locator, type Page } from '@playwright/test';
import type { Applicant } from '../testdata/applicant.data';
import { FormFiller, type FillOptions } from '../utils/form.utils';
import { createLogger, type Logger } from '../utils/logger';
import { pollUntil, waitForPageSettled } from '../utils/wait.utils';

/**
 * Shared behaviour for every page object: navigation, stepping through the wizard,
 * reading validation messages and filling forms.
 */
export abstract class BasePage {
  protected readonly log: Logger;
  protected readonly form: FormFiller;

  // Shared locators -------------------------------------------------------------------
  protected readonly continueButton: Locator;
  protected readonly errorMessages: Locator;

  protected constructor(
    protected readonly page: Page,
    protected readonly applicant: Applicant,
    scope: string,
  ) {
    this.log = createLogger(scope);
    this.form = new FormFiller(applicant);
    this.continueButton = page
      .getByRole('button', { name: /^(save\s*(&|and)\s*)?(continue|next)\b/i })
      .or(page.getByRole('link', { name: /^(save\s*(&|and)\s*)?(continue|next)\b/i }));
    this.errorMessages = page.locator(
      [
        '[role="alert"]',
        '[aria-live="assertive"]',
        '[class*="error" i]',
        '[class*="invalid" i]',
        '[data-testid*="error" i]',
        '.help-block',
        '.field-error',
      ].join(','),
    );
  }

  // Navigation ------------------------------------------------------------------------
  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.waitUntilReady();
  }

  async waitUntilReady(): Promise<void> {
    await waitForPageSettled(this.page);
  }

  get currentUrl(): string {
    return this.page.url();
  }

  // Wizard stepping -------------------------------------------------------------------
  /** Identifies "which wizard step am I on" using the URL plus the first heading. */
  protected async snapshot(): Promise<string> {
    const heading = await this.page
      .locator('h1, h2')
      .first()
      .innerText()
      .catch(() => '');
    const fields = await this.page.locator('input:visible, textarea:visible, select:visible').count();
    return `${this.page.url()}|${heading.trim()}|${fields}`;
  }

  /** Clicks Continue/Next and waits for the wizard to move to another step. */
  async advance(): Promise<void> {
    const before = await this.snapshot();
    await this.clickContinue();
    try {
      await pollUntil(async () => (await this.snapshot()) !== before, {
        timeout: 20_000,
        message: 'the wizard to move to the next step',
      });
    } catch (error) {
      const errors = await this.visibleErrors();
      throw new Error(
        `${(error as Error).message}. Visible validation messages: ${errors.length ? errors.join(' | ') : 'none'}`,
      );
    }
    await this.waitUntilReady();
  }

  /** Clicks Continue/Next and reports whether the step stayed put (i.e. validation blocked it). */
  async tryAdvance(): Promise<{ moved: boolean; errors: string[] }> {
    const before = await this.snapshot();
    await this.clickContinue();
    await this.page.waitForTimeout(1_500);
    await this.waitUntilReady();
    const after = await this.snapshot();
    return { moved: after !== before, errors: await this.visibleErrors() };
  }

  protected async clickContinue(): Promise<void> {
    const button = this.continueButton.first();
    await expect(button, 'Continue/Next button should be visible').toBeVisible();
    await expect(button).toBeEnabled();
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }

  // Validation ------------------------------------------------------------------------
  /** Visible validation text from ARIA alerts, error-styled nodes and native HTML5 messages. */
  async visibleErrors(): Promise<string[]> {
    const fromDom = await this.errorMessages.evaluateAll((nodes) =>
      nodes
        .filter((n) => {
          const r = (n as HTMLElement).getBoundingClientRect();
          const s = window.getComputedStyle(n as HTMLElement);
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
        })
        .map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter((t) => t.length > 0 && t.length < 300),
    );
    const native = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll('input, textarea, select'))
        .map((el) => (el as HTMLInputElement).validationMessage)
        .filter(Boolean),
    );
    return Array.from(new Set([...fromDom, ...native]));
  }

  // Forms -----------------------------------------------------------------------------
  protected async fillForm(scope: Locator = this.page.locator('main, form, body').first(), options?: FillOptions) {
    return this.form.fillEmpty(scope, options);
  }

  protected async clickIfVisible(locator: Locator, timeout = 3_000): Promise<boolean> {
    try {
      await locator.first().waitFor({ state: 'visible', timeout });
      await locator.first().click();
      return true;
    } catch {
      return false;
    }
  }
}

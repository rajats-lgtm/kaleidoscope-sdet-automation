import { expect, type Locator, type Page } from '@playwright/test';
import type { Applicant } from '../testdata/applicant.data';
import { expectPageNotToContain, expectPageToContain, normalise } from '../utils/assertion.utils';
import { BasePage } from './BasePage';

const UNANSWERED = /(un-?answered|not answered|incomplete|not (yet )?(provided|completed)|no response|missing)/i;

/** Review page: every page and answer must be shown as answered before submitting. */
export class ReviewPage extends BasePage {
  private readonly submitButton: Locator;
  private readonly confirmSubmit: Locator;
  private capturedUrl = '';

  constructor(page: Page, applicant: Applicant) {
    super(page, applicant, 'ReviewPage');
    this.submitButton = page.getByRole('button', { name: /submit( application)?/i }).first();
    this.confirmSubmit = page
      .getByRole('dialog')
      .getByRole('button', { name: /(yes|confirm|submit|ok|continue)/i })
      .first();
  }

  /** The application URL is captured so the test can return to it after submission. */
  captureApplicationUrl(): string {
    this.capturedUrl = this.page.url();
    this.log.info(`Captured application URL: ${this.capturedUrl}`);
    return this.capturedUrl;
  }

  get applicationUrl(): string {
    return this.capturedUrl;
  }

  async expectLoaded(): Promise<void> {
    await expect(this.submitButton, 'Submit button should be available on the review page').toBeVisible({
      timeout: 30_000,
    });
  }

  async expectPagesAndAnswersShownAsAnswered(selectedEssays: Array<'cars' | 'animals' | 'school' | 'other'>): Promise<void> {
    // 1. Nothing is flagged as unanswered / incomplete.
    const body = normalise(await this.page.locator('body').innerText());
    const flagged = body.match(UNANSWERED);
    expect(flagged, `review page should not flag unanswered items (found: ${flagged?.[0]})`).toBeNull();

    // 2. Answers from every page are rendered.
    for (const activity of this.applicant.activities) {
      await expectPageToContain(this.page, activity.name, `activity "${activity.name}"`);
    }
    await expectPageToContain(this.page, 'My School Transcript', 'uploaded transcript');
    for (const key of selectedEssays) {
      await expectPageToContain(this.page, this.applicant.essays[key].slice(0, 45), `${key} essay`);
    }

    // 3. Essays that were not selected must not appear.
    for (const key of ['cars', 'other'] as const) {
      if (!selectedEssays.includes(key)) {
        await expectPageNotToContain(this.page, this.applicant.essays[key].slice(0, 45), `${key} essay`);
      }
    }
    this.log.info('Review page shows all pages and answers as answered');
  }

  async submit(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
    if (await this.confirmSubmit.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.confirmSubmit.click();
    }
    await this.waitUntilReady();
  }
}

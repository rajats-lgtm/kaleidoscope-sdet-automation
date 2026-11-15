import { expect, type Locator, type Page } from '@playwright/test';
import type { Applicant } from '../testdata/applicant.data';
import { becomesVisible } from '../utils/wait.utils';
import { BasePage } from './BasePage';

/** Application – page 1: required personal / eligibility fields. */
export class ApplicationPage1 extends BasePage {
  private readonly startButton: Locator;
  private readonly formRoot: Locator;
  private readonly anyField: Locator;

  constructor(page: Page, applicant: Applicant) {
    super(page, applicant, 'ApplicationPage1');
    this.startButton = page
      .getByRole('button', { name: /(start|begin|resume|continue) (the |your |new )?application|apply now|start|begin/i })
      .or(page.getByRole('link', { name: /(start|begin|resume|continue) (the |your |new )?application|apply now|start|begin/i }));
    this.formRoot = page.locator('main, form, [role="main"]').first();
    this.anyField = page.locator('input:visible:not([type="hidden"]), textarea:visible, select:visible');
  }

  /** After sign-up the portal may return to the program page; make sure an application is open. */
  async beginApplication(): Promise<void> {
    await this.waitUntilReady();
    if (!(await becomesVisible(this.anyField, 5_000))) {
      this.log.info('No form visible yet – starting the application');
      await this.clickIfVisible(this.startButton, 5_000);
      await this.waitUntilReady();
    }
    await expect(this.anyField.first(), 'application page 1 should expose form fields').toBeVisible({
      timeout: 30_000,
    });
  }

  /** Fills every required field with data from the applicant profile. */
  async fillRequiredFields(): Promise<string[]> {
    const filled = await this.fillForm(this.formRoot, { requiredOnly: true });
    this.log.info(`Page 1: filled ${filled.length} required field(s)`, filled);
    expect(filled.length, 'page 1 should contain at least one fillable field').toBeGreaterThan(0);
    return filled;
  }

  async continueToNextPage(): Promise<void> {
    await this.advance();
  }
}

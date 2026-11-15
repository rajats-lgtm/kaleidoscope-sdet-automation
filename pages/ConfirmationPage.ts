import { expect, type Locator, type Page } from '@playwright/test';
import type { Applicant } from '../testdata/applicant.data';
import { BasePage } from './BasePage';

/** Post-submission confirmation and "read-only" verification. */
export class ConfirmationPage extends BasePage {
  private readonly confirmationText: Locator;
  private readonly submitButton: Locator;
  private readonly editControls: Locator;
  private readonly editableFields: Locator;

  constructor(page: Page, applicant: Applicant) {
    super(page, applicant, 'ConfirmationPage');
    this.confirmationText = page.getByText(/(application (has been )?submitted|thank you|submitted|successfully|received)/i);
    this.submitButton = page.getByRole('button', { name: /submit( application)?/i });
    this.editControls = page
      .getByRole('button', { name: /^(edit|change|update)\b/i })
      .or(page.getByRole('link', { name: /^(edit|change|update)\b/i }));
    this.editableFields = page.locator(
      'input:visible:not([type="hidden"]):not([disabled]):not([readonly]):not([type="button"]):not([type="submit"]), ' +
        'textarea:visible:not([disabled]):not([readonly]), select:visible:not([disabled]), [contenteditable="true"]:visible',
    );
  }

  async expectSubmitted(): Promise<void> {
    await expect(this.confirmationText.first(), 'a submission confirmation should be shown').toBeVisible({
      timeout: 45_000,
    });
    this.log.info('Submission confirmed');
  }

  /** Returns to the captured application URL and proves nothing can be edited or re-submitted. */
  async expectEditingNotAllowed(applicationUrl: string): Promise<void> {
    expect(applicationUrl, 'application URL must have been captured before submitting').toBeTruthy();
    await this.goto(applicationUrl);

    await expect(this.submitButton, 'Submit must not be offered again').toHaveCount(0);
    await expect(this.editControls, 'no Edit controls should be offered').toHaveCount(0);
    await expect(this.editableFields, 'no editable form fields should remain').toHaveCount(0);
    await expect(this.confirmationText.first(), 'page should still indicate the application is submitted').toBeVisible();
    this.log.info('Editing is blocked after submission');
  }
}

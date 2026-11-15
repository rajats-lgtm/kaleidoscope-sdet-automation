import { expect, type Locator, type Page } from '@playwright/test';
import * as path from 'path';
import type { Applicant } from '../testdata/applicant.data';
import { fixturePath } from '../utils/file.utils';
import { BasePage } from './BasePage';

export const TRANSCRIPT_FILE = 'My School Transcript.pdf';

/** Application – page 3: general form plus School Transcript upload. */
export class ApplicationPage3 extends BasePage {
  private readonly formRoot: Locator;
  private readonly fileInput: Locator;

  constructor(page: Page, applicant: Applicant) {
    super(page, applicant, 'ApplicationPage3');
    this.formRoot = page.locator('main, form, [role="main"]').first();
    this.fileInput = page.locator('input[type="file"]').first();
  }

  async fillForm3(): Promise<string[]> {
    const filled = await this.fillForm(this.formRoot);
    this.log.info(`Page 3: filled ${filled.length} field(s)`, filled);
    return filled;
  }

  async uploadTranscript(): Promise<void> {
    const file = fixturePath(TRANSCRIPT_FILE);
    await expect(this.fileInput, 'a file input should exist on page 3').toBeAttached({ timeout: 20_000 });
    await this.fileInput.setInputFiles(file);
    await this.expectUploaded();
    this.log.info(`Uploaded ${path.basename(file)}`);
  }

  /** The file name shows up in the page once the upload finishes; no error may be shown. */
  async expectUploaded(): Promise<void> {
    await expect(
      this.page.getByText(/my school transcript/i).first(),
      'uploaded file name should be displayed',
    ).toBeVisible({ timeout: 45_000 });
    const errors = (await this.visibleErrors()).filter((e) => /upload|file|pdf|size|type/i.test(e));
    expect(errors, `upload should not report errors: ${errors.join(' | ')}`).toHaveLength(0);
  }

  async continueToNextPage(): Promise<void> {
    await this.advance();
  }
}

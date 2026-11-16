import { expect, type Locator, type Page } from '@playwright/test';
import type { Applicant } from '../testdata/applicant.data';
import { BasePage } from './BasePage';

const PROGRAM_URL =
  process.env.BASE_URL ?? 'https://apply.mykaleidoscope.com/program/sdet-test-scholarship';

export class ScholarshipLandingPage extends BasePage {
  // Locators – adjust here if the portal copy changes -----------------------------------
  private readonly programHeading: Locator;
  private readonly applyButton: Locator;

  constructor(page: Page, applicant: Applicant) {
    super(page, applicant, 'LandingPage');
    this.programHeading = page.getByRole('heading', { level: 1 }).first();
    this.applyButton = page
      .getByRole('button', { name: /(start|begin|apply|continue)\b/i })
      .or(page.getByRole('link', { name: /(start|begin|apply|continue)\b/i }));
  }

  async open(): Promise<void> {
    await this.goto(PROGRAM_URL);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/sdet-test-scholarship/i);
    await expect(this.programHeading).toBeVisible();
    await expect(this.applyButton.first()).toBeVisible();
  }

  async programTitle(): Promise<string> {
    return (await this.programHeading.innerText()).trim();
  }

  async startApplication(): Promise<void> {
    const button = this.applyButton.first();
    await expect(button).toBeEnabled();
    await button.click();
    await this.waitUntilReady();
  }

  async isApplyVisible(): Promise<boolean> {
    return this.applyButton.first().isVisible().catch(() => false);
  }
}

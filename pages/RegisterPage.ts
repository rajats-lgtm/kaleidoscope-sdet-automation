import { expect, type Locator, type Page } from '@playwright/test';
import type { Applicant } from '../testdata/applicant.data';
import { becomesVisible } from '../utils/wait.utils';
import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  private readonly firstName: Locator;
  private readonly lastName: Locator;
  private readonly email: Locator;
  private readonly password: Locator;
  private readonly confirmPassword: Locator;
  private readonly termsCheckbox: Locator;
  private readonly signUpToggle: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page, applicant: Applicant) {
    super(page, applicant, 'RegisterPage');
    this.firstName = page.getByLabel(/first\s*name/i).first();
    this.lastName = page.getByLabel(/last\s*name/i).first();
    this.email = page.getByLabel(/e-?mail/i).first();
    this.password = page.getByLabel(/^password\b/i).first();
    this.confirmPassword = page.getByLabel(/confirm.*password|password.*confirm|re-?enter/i).first();
    this.termsCheckbox = page.getByRole('checkbox', { name: /agree|terms|privacy|consent/i });
    this.signUpToggle = page
      .getByRole('link', { name: /sign\s*up|create (an )?account|register|new (user|account)/i })
      .or(page.getByRole('button', { name: /sign\s*up|create (an )?account|register/i }));
    this.submitButton = page.getByRole('button', {
      name: /sign\s*up|create (an )?account|register|get started|continue/i,
    });
  }

  /** The auth screen may open on "Log in"; switch to registration when needed. */
  async switchToRegistration(): Promise<void> {
    await this.waitUntilReady();
    const hasNameFields = await becomesVisible(this.firstName, 4_000);
    if (!hasNameFields) {
      await this.clickIfVisible(this.signUpToggle, 4_000);
      await this.waitUntilReady();
    }
    await expect(this.email, 'registration form should expose an email field').toBeVisible();
  }

  async register(): Promise<void> {
    const { account } = this.applicant;
    await this.switchToRegistration();

    if (await this.firstName.isVisible().catch(() => false)) await this.firstName.fill(account.firstName);
    if (await this.lastName.isVisible().catch(() => false)) await this.lastName.fill(account.lastName);
    await this.email.fill(account.email);
    await this.password.fill(account.password);
    if (await this.confirmPassword.isVisible().catch(() => false)) {
      await this.confirmPassword.fill(account.password);
    }
    for (const box of await this.termsCheckbox.all()) {
      if (await box.isVisible().catch(() => false)) await box.check().catch(() => box.check({ force: true }));
    }

    this.log.info(`Registering ${account.email}`);
    const button = this.submitButton.last();
    await expect(button).toBeEnabled();
    await button.click();
    await this.waitUntilReady();
    await this.expectRegistered();
  }

  /** Registration is successful once the credential fields are gone and no error is displayed. */
  async expectRegistered(): Promise<void> {
    await expect(this.password, 'password field should disappear after sign-up').toBeHidden({ timeout: 30_000 });
    const errors = await this.visibleErrors();
    expect(errors, `registration should not show errors: ${errors.join(' | ')}`).toHaveLength(0);
  }
}

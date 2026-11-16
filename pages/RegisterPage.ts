import { expect, type Locator, type Page } from '@playwright/test';
import type { Applicant } from '../testdata/applicant.data';
import { becomesVisible } from '../utils/wait.utils';
import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  private readonly firstName: Locator;
  private readonly lastName: Locator;
  private readonly fullName: Locator;
  private readonly email: Locator;
  private readonly passwords: Locator;
  private readonly termsCheckbox: Locator;
  private readonly signUpToggle: Locator;
  private readonly stepButton: Locator;

  constructor(page: Page, applicant: Applicant) {
    super(page, applicant, 'RegisterPage');
    this.firstName = page.getByLabel(/first\s*name/i).first();
    this.lastName = page.getByLabel(/last\s*name/i).first();
    this.fullName = page.getByLabel(/^(full\s*)?name\b/i).first();
    this.email = page.locator('input[type="email"]').or(page.getByLabel(/e-?mail/i)).first();
    this.passwords = page.locator('input[type="password"]:visible');
    this.termsCheckbox = page.getByRole('checkbox', { name: /agree|terms|privacy|consent/i });
    this.signUpToggle = page
      .getByRole('link', { name: /sign\s*up|create (an )?account|register|new (user|account)/i })
      .or(page.getByRole('button', { name: /sign\s*up|create (an )?account|register/i }));
    this.stepButton = page.getByRole('button', {
      name: /continue|next|sign\s*up|create (an )?account|register|get started|submit/i,
    });
  }

  /** The auth screen may open on "Log in"; switch to registration when needed. */
  async switchToRegistration(): Promise<void> {
    await this.waitUntilReady();
    if (!(await becomesVisible(this.email, 6_000))) {
      await this.clickIfVisible(this.signUpToggle, 4_000);
      await this.waitUntilReady();
    }
    await expect(this.email, 'registration form should expose an email field').toBeVisible({ timeout: 20_000 });
  }

  private async fillIdentityIfVisible(): Promise<void> {
    const { account } = this.applicant;
    if (await this.firstName.isVisible().catch(() => false)) {
      if (!(await this.firstName.inputValue())) await this.firstName.fill(account.firstName);
      if (await this.lastName.isVisible().catch(() => false)) {
        if (!(await this.lastName.inputValue())) await this.lastName.fill(account.lastName);
      }
    } else if (await this.fullName.isVisible().catch(() => false)) {
      if (!(await this.fullName.inputValue())) await this.fullName.fill(`${account.firstName} ${account.lastName}`);
    }
  }

  /** Some portals ask for the email first and reveal the password on the next step. */
  private async revealPasswordStep(): Promise<void> {
    if (await becomesVisible(this.passwords, 3_000)) return;
    this.log.info('Password field not shown yet - continuing to the next sign-up step');
    await this.stepButton.last().click();
    await this.waitUntilReady();
    await expect(this.passwords.first(), 'a password field should appear after the email step').toBeVisible({
      timeout: 20_000,
    });
  }

  async register(): Promise<void> {
    const { account } = this.applicant;
    await this.switchToRegistration();

    await this.fillIdentityIfVisible();
    await this.email.fill(account.email);
    await this.revealPasswordStep();
    await this.fillIdentityIfVisible();

    // Fill every visible password box (password + optional confirmation).
    for (const box of await this.passwords.all()) await box.fill(account.password);

    for (const box of await this.termsCheckbox.all()) {
      if (await box.isVisible().catch(() => false)) await box.check().catch(() => box.check({ force: true }));
    }

    this.log.info(`Registering ${account.email}`);
    const button = this.stepButton.last();
    await expect(button).toBeEnabled();
    await button.click();
    await this.waitUntilReady();
    await this.expectRegistered();
  }

  /** Registration is successful once the credential fields are gone and no error is displayed. */
  async expectRegistered(): Promise<void> {
    await expect(this.passwords, 'password field should disappear after sign-up').toHaveCount(0, {
      timeout: 30_000,
    });
    const errors = await this.visibleErrors();
    expect(errors, `registration should not show errors: ${errors.join(' | ')}`).toHaveLength(0);
  }
}

import { expect, type Locator, type Page } from '@playwright/test';
import type { Activity, Applicant } from '../testdata/applicant.data';
import { BasePage } from './BasePage';

export const MINIMUM_ACTIVITIES = 2;

/** Application – page 2: extracurricular activities (2 required, 4 provided). */
export class ApplicationPage2 extends BasePage {
  private readonly formRoot: Locator;
  private readonly addActivityButton: Locator;
  private filled = 0;

  constructor(page: Page, applicant: Applicant) {
    super(page, applicant, 'ApplicationPage2');
    this.formRoot = page.locator('main, form, [role="main"]').first();
    this.addActivityButton = page
      .getByRole('button', { name: /add\s+(another\s+|an?\s+|new\s+)?(extracurricular\s+)?(activity|item|entry|more)?/i })
      .or(page.getByRole('link', { name: /add\s+(another\s+|an?\s+)?(activity|item|entry)/i }));
  }

  /** Maps a field label to the right value of the n-th activity. */
  private valueFor = ({ label, group }: { label: string; group: number }): string | undefined => {
    const activity: Activity = this.applicant.activities[Math.min(group + this.filled, this.applicant.activities.length - 1)];
    if (/hours/i.test(label)) return activity.hoursPerWeek;
    if (/weeks/i.test(label)) return activity.weeksPerYear;
    if (/years?\b/i.test(label)) return activity.years;
    if (/descri|detail|summary|accomplish/i.test(label)) return activity.description;
    if (/position|role|title/i.test(label)) return activity.role;
    if (/organi[sz]ation|club|team|employer|institution/i.test(label)) return activity.organisation;
    if (/activity|name/i.test(label)) return activity.name;
    return undefined;
  };

  /** Provides `count` activities in total; adds extra blocks with the "Add" control when needed. */
  async provideActivities(count: number, groupsPerRound = count): Promise<number> {
    let guard = 0;
    while (this.filled < count && guard++ < count + 3) {
      const remaining = Math.min(groupsPerRound, count - this.filled);
      const labels = await this.form.fillEmpty(this.formRoot, { maxGroups: remaining, valueFor: this.valueFor });
      if (labels.length > 0) {
        this.filled += remaining;
        this.log.info(`Activities provided so far: ${this.filled}/${count}`);
        continue;
      }
      if (!(await this.clickIfVisible(this.addActivityButton, 2_500))) {
        throw new Error(`Unable to add activity ${this.filled + 1}: no empty fields and no "Add" control found`);
      }
    }
    return this.filled;
  }

  /** Submits with fewer than two activities and asserts that the portal blocks it. */
  async expectMinimumActivitiesValidation(): Promise<string[]> {
    await this.provideActivities(1);
    const { moved, errors } = await this.tryAdvance();
    expect(moved, 'page 2 must NOT advance with only one activity').toBe(false);
    expect(
      errors.join(' | '),
      'a validation message should explain that at least two activities are required',
    ).toMatch(/(at least|minimum|min\.?|least)\D{0,20}(2|two)|(2|two)\D{0,20}(activit|required)|required/i);
    this.log.info('Minimum-activities validation observed', errors);
    return errors;
  }

  async provideFourActivities(): Promise<void> {
    const total = await this.provideActivities(4, 1);
    expect(total).toBe(4);
  }

  async continueToNextPage(): Promise<void> {
    await this.advance();
  }
}

import { expect, type Locator, type Page } from '@playwright/test';
import type { Applicant } from '../testdata/applicant.data';
import { BasePage } from './BasePage';

export type EssayType = 'Cars' | 'Animals' | 'School' | 'Other';
export const ESSAY_TYPES: EssayType[] = ['Cars', 'Animals', 'School', 'Other'];

/** Application – page 4: choose essay types, each reveals its own essay box. */
export class ApplicationPage4 extends BasePage {
  private readonly essayBoxes: Locator;

  constructor(page: Page, applicant: Applicant) {
    super(page, applicant, 'ApplicationPage4');
    // Plain textareas and rich-text editors both count as essay boxes.
    this.essayBoxes = page.locator(
      'textarea:visible, [contenteditable="true"]:visible, .ql-editor:visible, [role="textbox"]:visible',
    );
  }

  private checkbox(type: EssayType): Locator {
    return this.page
      .getByRole('checkbox', { name: new RegExp(`^\\s*${type}\\s*$`, 'i') })
      .or(this.page.getByLabel(new RegExp(`^\\s*${type}\\s*$`, 'i'), { exact: false }))
      .first();
  }

  async essayBoxCount(): Promise<number> {
    return this.essayBoxes.count();
  }

  private async setChecked(type: EssayType, checked: boolean): Promise<void> {
    const box = this.checkbox(type);
    await expect(box, `"${type}" checkbox should exist`).toBeAttached();
    try {
      await box.setChecked(checked, { timeout: 4_000 });
    } catch {
      await box.setChecked(checked, { force: true });
    }
    await expect(box).toBeChecked({ checked });
  }

  async deselectAll(): Promise<void> {
    for (const type of ESSAY_TYPES) {
      if (await this.checkbox(type).isChecked().catch(() => false)) await this.setChecked(type, false);
    }
    await expect.poll(() => this.essayBoxCount(), { message: 'no essay boxes with nothing selected' }).toBe(0);
  }

  /** Each option, when ticked on its own, must reveal exactly one additional essay box. */
  async expectEachOptionRevealsEssayBox(): Promise<void> {
    await this.deselectAll();
    for (const type of ESSAY_TYPES) {
      const before = await this.essayBoxCount();
      await this.setChecked(type, true);
      await expect
        .poll(() => this.essayBoxCount(), { message: `selecting "${type}" should reveal an essay box` })
        .toBe(before + 1);
      this.log.info(`"${type}" → essay box revealed`);
      await this.setChecked(type, false);
      await expect
        .poll(() => this.essayBoxCount(), { message: `unselecting "${type}" should hide its essay box` })
        .toBe(before);
    }
  }

  async selectOnly(types: EssayType[]): Promise<void> {
    for (const type of ESSAY_TYPES) await this.setChecked(type, types.includes(type));
    await expect.poll(() => this.essayBoxCount()).toBe(types.length);
    for (const type of ESSAY_TYPES) {
      await expect(this.checkbox(type)).toBeChecked({ checked: types.includes(type) });
    }
  }

  /** Writes the essays into the boxes in the order they appear on the page. */
  async writeEssays(types: EssayType[]): Promise<void> {
    const content: Record<EssayType, string> = {
      Cars: this.applicant.essays.cars,
      Animals: this.applicant.essays.animals,
      School: this.applicant.essays.school,
      Other: this.applicant.essays.other,
    };
    const ordered = ESSAY_TYPES.filter((t) => types.includes(t));
    const total = await this.essayBoxCount();
    expect(total).toBe(ordered.length);

    for (let i = 0; i < ordered.length; i++) {
      const box = this.essayBoxes.nth(i);
      await box.scrollIntoViewIfNeeded();
      await box.fill(content[ordered[i]]);
      await expect(box).not.toBeEmpty();
      this.log.info(`Essay written for ${ordered[i]}`);
    }
  }

  async continueToReview(): Promise<void> {
    await this.advance();
  }
}

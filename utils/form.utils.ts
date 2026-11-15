import type { Locator } from '@playwright/test';
import type { Applicant } from '../testdata/applicant.data';
import { createLogger } from './logger';

const log = createLogger('FormFiller');

const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"]):not([type="search"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="combobox"]:not(input):not(select)',
].join(',');

type Kind = 'text' | 'textarea' | 'select' | 'combobox' | 'checkbox' | 'radio' | 'date' | 'number' | 'editable';

export interface FieldInfo {
  index: number;
  kind: Kind;
  type: string;
  label: string;
  radioGroup: string;
  required: boolean;
  visible: boolean;
  enabled: boolean;
  filled: boolean;
  groupHasChecked: boolean;
}

export interface FillOptions {
  /** Fill only fields flagged as required. Falls back to all fields if none are flagged. */
  requiredOnly?: boolean;
  /** Maximum number of repeated field groups to fill (e.g. one activity block). */
  maxGroups?: number;
  /** Custom value resolver, consulted before the built-in rules. */
  valueFor?: (field: { label: string; type: string; kind: string; group: number }) => string | undefined;
  /** Rounds allow conditional fields revealed by earlier answers to be filled as well. */
  maxRounds?: number;
}

type Rule = [RegExp, (a: Applicant) => string];

const RULES: Rule[] = [
  [/e-?mail/i, (a) => a.account.email],
  [/first\s*name|given\s*name|\bfname\b/i, (a) => a.account.firstName],
  [/last\s*name|family\s*name|surname|\blname\b/i, (a) => a.account.lastName],
  [/phone|mobile|cell|tel\b/i, (a) => a.profile.phone],
  [/zip|postal/i, (a) => a.profile.zip],
  [/\bcity\b|town/i, (a) => a.profile.city],
  [/\bstate\b|province|region/i, (a) => a.profile.state],
  [/country|nationality|citizenship/i, (a) => a.profile.country],
  [/birth|dob|\bdate\b/i, (a) => a.profile.dateOfBirth],
  [/address|street/i, (a) => a.profile.street],
  [/gpa|grade point/i, (a) => a.profile.gpa],
  [/graduat|class of|year/i, (a) => a.profile.graduationYear],
  [/school|college|university|institution/i, (a) => a.profile.school],
  [/website|url|link|portfolio|linkedin/i, (a) => a.profile.website],
  [/essay|why|describe|explain|tell us|statement|goal|story|additional|comment/i, (a) => a.profile.paragraph],
  [/full\s*name|^name$|\bname\b/i, (a) => `${a.account.firstName} ${a.account.lastName}`],
];

const PREFERRED_OPTION: Array<[RegExp, RegExp]> = [
  [/country|nationality|citizenship/i, /united states|usa/i],
  [/\bstate\b|province/i, /illinois|california/i],
];

const CONSENT = /agree|certif|consent|terms|acknowledge|confirm|accept|privacy/i;

/**
 * Heuristic form filler. It understands native inputs, selects, radios, checkboxes,
 * rich-text (contenteditable) boxes and ARIA comboboxes, and resolves values from the
 * applicant profile by matching the field's accessible label.
 */
export class FormFiller {
  constructor(private readonly applicant: Applicant) {}

  async describe(scope: Locator): Promise<FieldInfo[]> {
    return scope.locator(FIELD_SELECTOR).evaluateAll((elements) => {
      const text = (n: Element | null): string => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
      return elements.map((node, index) => {
        const el = node as HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement;
        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') ?? '').toLowerCase();
        const role = el.getAttribute('role') ?? '';
        const editable = el.getAttribute('contenteditable') === 'true';

        let label = el.getAttribute('aria-label') ?? '';
        if (!label) {
          const ids = el.getAttribute('aria-labelledby');
          if (ids) label = ids.split(/\s+/).map((id) => text(document.getElementById(id))).join(' ').trim();
        }
        if (!label && el.labels && el.labels.length) label = Array.from(el.labels).map(text).join(' ');
        if (!label && el.id) {
          const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (l) label = text(l);
        }
        if (!label) label = text(el.closest('label'));
        if (!label) label = text(el.closest('fieldset')?.querySelector('legend') ?? null);
        if (!label) {
          let parent: Element | null = el.parentElement;
          for (let i = 0; i < 3 && parent && !label; i++, parent = parent.parentElement) {
            const candidate = parent.querySelector('label, legend, [class*="label" i]');
            if (candidate && !candidate.contains(el)) label = text(candidate);
          }
        }
        const rawLabel = label;
        if (!label) label = el.getAttribute('placeholder') ?? el.getAttribute('name') ?? el.id ?? '';

        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const isChoice = type === 'radio' || type === 'checkbox';
        const visible =
          style.display !== 'none' && style.visibility !== 'hidden' && (isChoice || (rect.width > 0 && rect.height > 0));

        let kind: string = 'text';
        if (tag === 'textarea') kind = 'textarea';
        else if (tag === 'select') kind = 'select';
        else if (editable) kind = 'editable';
        else if (role === 'combobox' && tag !== 'input') kind = 'combobox';
        else if (type === 'checkbox') kind = 'checkbox';
        else if (type === 'radio') kind = 'radio';
        else if (type === 'date') kind = 'date';
        else if (type === 'number') kind = 'number';
        else if (role === 'combobox') kind = 'combobox';

        let filled = false;
        if (kind === 'checkbox' || kind === 'radio') filled = el.checked;
        else if (kind === 'editable' || kind === 'combobox') filled = text(el).length > 0 && text(el) !== label;
        else if (kind === 'select') filled = !!el.value && el.selectedIndex > 0;
        else filled = (el.value ?? '').trim().length > 0;

        const name = el.getAttribute('name') ?? '';
        const radioGroup = kind === 'radio' ? name || rawLabel : '';
        let groupHasChecked = false;
        if (kind === 'radio' && name) {
          groupHasChecked = !!document.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
        }

        return {
          index,
          kind,
          type,
          label,
          radioGroup,
          required:
            el.required === true ||
            el.getAttribute('aria-required') === 'true' ||
            /\*|\(required\)/i.test(rawLabel),
          visible,
          enabled: !el.disabled && !el.readOnly && el.getAttribute('aria-disabled') !== 'true',
          filled,
          groupHasChecked,
        } as unknown as FieldInfo;
      });
    });
  }

  /** Fills every visible, enabled, empty field found under `scope`. Returns the labels filled. */
  async fillEmpty(scope: Locator, options: FillOptions = {}): Promise<string[]> {
    const { requiredOnly = false, maxGroups, valueFor, maxRounds = 3 } = options;
    const filledLabels: string[] = [];
    const attempted = new Set<string>();

    // With a group cap a single pass is used so the cap applies to the whole call.
    const rounds = maxGroups !== undefined ? 1 : maxRounds;
    for (let round = 0; round < rounds; round++) {
      const infos = await this.describe(scope);
      const usable = infos.filter((f) => f.visible && f.enabled && !f.filled);
      const hasRequiredFlags = infos.some((f) => f.required);
      let candidates = requiredOnly && hasRequiredFlags ? usable.filter((f) => f.required) : usable;

      candidates = this.dropFilledRadioGroups(candidates);
      candidates = candidates.filter((f) => f.kind !== 'checkbox' || f.required || CONSENT.test(f.label));
      if (maxGroups !== undefined) candidates = this.limitGroups(candidates, maxGroups);

      const groupOf = this.groupIndexer(candidates);
      let progress = false;

      for (const field of candidates) {
        const key = `${field.index}:${field.label}`;
        if (attempted.has(key)) continue;
        attempted.add(key);
        const el = scope.locator(FIELD_SELECTOR).nth(field.index);
        try {
          const done = await this.fillOne(el, field, groupOf(field), valueFor);
          if (done) {
            filledLabels.push(field.label || `(${field.kind})`);
            progress = true;
          }
        } catch (error) {
          log.debug(`Skipped "${field.label}" (${field.kind})`, (error as Error).message.split('\n')[0]);
        }
      }
      if (!progress) break;
    }

    log.debug(`Filled ${filledLabels.length} field(s)`, filledLabels);
    return filledLabels;
  }

  private dropFilledRadioGroups(fields: FieldInfo[]): FieldInfo[] {
    const seen = new Set<string>();
    return fields.filter((f) => {
      if (f.kind !== 'radio') return true;
      if (f.groupHasChecked) return false;
      const key = f.radioGroup || `idx-${f.index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** A new group starts every time the first field's label repeats (e.g. repeated activity blocks). */
  private groupIndexer(fields: FieldInfo[]): (f: FieldInfo) => number {
    const anchor = fields[0]?.label;
    let group = -1;
    const map = new Map<number, number>();
    for (const f of fields) {
      if (f.label === anchor) group++;
      map.set(f.index, Math.max(group, 0));
    }
    return (f) => map.get(f.index) ?? 0;
  }

  private limitGroups(fields: FieldInfo[], maxGroups: number): FieldInfo[] {
    const groupOf = this.groupIndexer(fields);
    return fields.filter((f) => groupOf(f) < maxGroups);
  }

  private resolveValue(field: FieldInfo, group: number, valueFor?: FillOptions['valueFor']): string {
    const custom = valueFor?.({ label: field.label, type: field.type, kind: field.kind, group });
    if (custom !== undefined) return custom;

    if (field.kind === 'date') return this.applicant.profile.dateOfBirthIso;
    if (field.kind === 'number') return /gpa/i.test(field.label) ? '3.8' : /year/i.test(field.label) ? '2025' : '5';
    if (field.type === 'email') return this.applicant.account.email;
    if (field.type === 'tel') return this.applicant.profile.phone;
    if (field.type === 'url') return this.applicant.profile.website;

    for (const [pattern, resolve] of RULES) {
      if (pattern.test(field.label)) return resolve(this.applicant);
    }
    return field.kind === 'textarea' || field.kind === 'editable'
      ? this.applicant.profile.paragraph
      : 'Automation Test';
  }

  private async fillOne(
    el: Locator,
    field: FieldInfo,
    group: number,
    valueFor?: FillOptions['valueFor'],
  ): Promise<boolean> {
    switch (field.kind) {
      case 'checkbox':
      case 'radio':
        await this.checkSafely(el);
        return true;
      case 'select':
        return this.pickNativeOption(el, field);
      case 'combobox':
        return this.pickComboboxOption(el, field);
      default: {
        await el.fill(this.resolveValue(field, group, valueFor), { timeout: 5_000 });
        await el.blur().catch(() => undefined);
        return true;
      }
    }
  }

  private async checkSafely(el: Locator): Promise<void> {
    try {
      await el.check({ timeout: 2_500 });
    } catch {
      await el.check({ force: true, timeout: 2_500 });
    }
  }

  private async pickNativeOption(el: Locator, field: FieldInfo): Promise<boolean> {
    const options = await el.locator('option').evaluateAll((opts) =>
      opts.map((o) => ({ value: (o as HTMLOptionElement).value, text: (o.textContent ?? '').trim() })),
    );
    const real = options.filter((o) => o.value !== '' && !/^(select|choose|please)/i.test(o.text));
    if (!real.length) return false;
    const preferred = PREFERRED_OPTION.find(([labelPattern]) => labelPattern.test(field.label))?.[1];
    const choice = (preferred && real.find((o) => preferred.test(o.text))) || real[0];
    await el.selectOption({ value: choice.value });
    return true;
  }

  private async pickComboboxOption(el: Locator, field: FieldInfo): Promise<boolean> {
    await el.click({ timeout: 3_000 });
    const page = el.page();
    const options = page.getByRole('option');
    await options.first().waitFor({ state: 'visible', timeout: 4_000 });
    const preferred = PREFERRED_OPTION.find(([labelPattern]) => labelPattern.test(field.label))?.[1];
    const target = preferred ? options.filter({ hasText: preferred }).first() : options.first();
    const chosen = (await target.count()) ? target : options.first();
    await chosen.click();
    return true;
  }
}

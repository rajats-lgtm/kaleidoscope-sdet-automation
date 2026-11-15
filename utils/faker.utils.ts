import { faker } from '@faker-js/faker';

/** Short, collision-resistant token: time-based + random. */
export function uniqueToken(): string {
  return `${Date.now().toString(36)}${faker.string.alphanumeric({ length: 4, casing: 'lower' })}`;
}

/**
 * Builds a unique email for every run.
 * - TEST_EMAIL_BASE=qa.inbox@gmail.com  ->  qa.inbox+<token>@gmail.com
 * - otherwise                           ->  sdet.candidate+<token>@<TEST_EMAIL_DOMAIN|example.com>
 */
export function uniqueEmail(token: string = uniqueToken()): string {
  const base = process.env.TEST_EMAIL_BASE?.trim();
  if (base && base.includes('@')) {
    const [local, domain] = base.split('@');
    return `${local}+${token}@${domain}`;
  }
  const domain = process.env.TEST_EMAIL_DOMAIN?.trim() || 'example.com';
  return `sdet.candidate+${token}@${domain}`;
}

/** Password that satisfies typical complexity rules (upper, lower, digit, symbol, 12+ chars). */
export function strongPassword(token: string = uniqueToken()): string {
  return `Sdet!${token}#9Aa`;
}

export function person(): { firstName: string; lastName: string } {
  return {
    firstName: faker.person.firstName().replace(/[^A-Za-z]/g, '') || 'Alex',
    lastName: faker.person.lastName().replace(/[^A-Za-z]/g, '') || 'Morgan',
  };
}

export { faker };

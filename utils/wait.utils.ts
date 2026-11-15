import type { Locator, Page } from '@playwright/test';

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  backoff?: number;
  label?: string;
}

/** Retries an async action with exponential backoff. Re-throws the last error. */
export async function retry<T>(action: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { attempts = 3, delayMs = 500, backoff = 2, label = 'action' } = options;
  let lastError: unknown;
  let delay = delayMs;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(delay);
        delay *= backoff;
      }
    }
  }
  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`"${label}" failed after ${attempts} attempts: ${reason}`);
}

/** Polls a predicate until it returns true or the timeout elapses. */
export async function pollUntil(
  predicate: () => Promise<boolean>,
  options: { timeout?: number; interval?: number; message?: string } = {},
): Promise<void> {
  const { timeout = 15_000, interval = 250, message = 'condition' } = options;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate().catch(() => false)) return;
    await sleep(interval);
  }
  throw new Error(`Timed out after ${timeout}ms waiting for ${message}`);
}

/** Waits for the DOM to be ready and, best-effort, for the network to go quiet. */
export async function waitForPageSettled(page: Page, networkIdleTimeout = 8_000): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: networkIdleTimeout }).catch(() => undefined);
}

/** Resolves true if the locator becomes visible within the timeout, false otherwise. */
export async function becomesVisible(locator: Locator, timeout = 5_000): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

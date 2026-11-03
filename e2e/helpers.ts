import type { Frame, Page } from '@playwright/test';

export const PARENT = 'http://localhost:8004';
export const CHILD = 'http://127.0.0.1:8003';

/** Open the parent harness page (see fixtures/parent.html for its globals). */
export async function openParent(page: Page) {
  await page.goto('/e2e/fixtures/parent.html');
}

/** Open the parent page and create a ready Player for the given fixture. */
export async function openPlayer(page: Page, fixture: string) {
  await openParent(page);
  await page.evaluate((path) => (window as any).createPlayer(path), `/e2e/fixtures/${fixture}`);
}

/** The cross-origin iframe whose URL contains `name`. */
export function childFrame(page: Page, name: string): Frame {
  const frame = page.frames().find((f) => f.url().startsWith(CHILD) && f.url().includes(name));
  if (!frame) throw new Error(`no child frame matching ${name}`);
  return frame;
}

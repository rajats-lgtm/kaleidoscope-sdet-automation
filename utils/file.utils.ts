import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

/** Absolute path to a file inside /fixtures; fails fast if it is missing or empty. */
export function fixturePath(fileName: string): string {
  const full = path.join(FIXTURES_DIR, fileName);
  if (!fs.existsSync(full)) {
    throw new Error(`Fixture not found: ${full}`);
  }
  if (fs.statSync(full).size === 0) {
    throw new Error(`Fixture is empty: ${full}`);
  }
  return full;
}

export function fileSizeKb(fullPath: string): number {
  return Math.round(fs.statSync(fullPath).size / 1024);
}

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

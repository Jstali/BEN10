import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '..', 'screenshots');
const url = process.env.SCREENSHOT_URL || 'http://127.0.0.1:4173';

await mkdir(outputDir, { recursive: true });

const defaultPath = chromium.executablePath();
const armPath = defaultPath.replace('mac-x64', 'mac-arm64');
const executablePath = existsSync(armPath) ? armPath : defaultPath;

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.screenshot({ path: path.join(outputDir, 'desktop.png'), fullPage: true });

const bookShell = page.locator('.book-shell');
if (await bookShell.count()) {
  await bookShell.screenshot({ path: path.join(outputDir, 'notebook.png') });
}

await page.setViewportSize({ width: 430, height: 900 });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(outputDir, 'mobile.png'), fullPage: true });

await browser.close();

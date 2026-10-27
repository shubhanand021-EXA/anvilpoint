/* Captures real product screenshots for docs (headless Chromium). */
const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const out = path.join(__dirname, '..', 'docs', 'assets', 'shots');
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 864 } });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle' });

  await page.screenshot({ path: path.join(out, '01-empty.png') });

  const picker = page.locator('.empty input[type="file"]');
  await picker.setInputFiles(path.join(__dirname, '..', 'tests', 'fixtures', 'sample-app.zip'));
  await page.getByText('Text files read', { exact: false }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '02-overview.png') });

  await page.getByRole('button', { name: /Repository Analysis/ }).click();
  await page.getByRole('button', { name: /src\/index\.ts|README\.md/ }).first().click().catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '03-analysis.png') });

  await page.getByRole('button', { name: /Findings/ }).click();
  await page.getByText('TEST-01', { exact: false }).first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '04-findings.png') });

  await page.getByRole('button', { name: /Documentation Studio/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '05-docs.png') });

  await page.getByRole('button', { name: /Integrations/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '06-integrations.png') });

  await browser.close();
  console.log('screenshots done');
})().catch((e) => { console.error(e); process.exit(1); });

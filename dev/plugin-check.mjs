// Runs the official Plugin Check (wordpress.org/plugins/plugin-check) on this plugin inside
// WordPress Playground and prints every error and warning. Exit code 1 when there are errors.
// Checks the release folder (run dev/dist.sh first), so dev files and node_modules are not scanned.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 9401;
const SITE = `http://127.0.0.1:${PORT}`;
const cwd = new URL('..', import.meta.url).pathname;
const server = spawn(
  'npx',
  ['-y', '@wp-playground/cli@3.1.62', 'server', `--port=${PORT}`, '--php=8.3', '--workers=1',
    `--mount=${cwd}dist/mini-shop-for-telegram:/wordpress/wp-content/plugins/mini-shop-for-telegram`, '--blueprint=dev/blueprint-plugin-check.json'],
  { cwd, stdio: ['ignore', 'pipe', 'inherit'], detached: true },
);
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => /Ready!/.test(String(d)) && resolve());
  server.on('exit', (code) => reject(new Error(`playground exited with ${code}`)));
});

let errors = 0;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(300000);
  await page.goto(`${SITE}/wp-admin/tools.php?page=plugin-check`);
  // WooCommerce may still bounce the first admin visit to its setup wizard: ask again once.
  if (!page.url().includes('page=plugin-check')) await page.goto(`${SITE}/wp-admin/tools.php?page=plugin-check`);
  if (!(await page.$('#plugin-check__plugins-dropdown'))) {
    throw new Error(`Plugin Check page did not load:\n${(await page.innerText('body')).slice(0, 1500)}`);
  }
  await page.selectOption('#plugin-check__plugins-dropdown', 'mini-shop-for-telegram/mini-shop-for-telegram.php');
  await page.click('#plugin-check__submit');
  await page.waitForFunction(() => /No errors found|Checks complete|errors|warnings/i.test(document.querySelector('#plugin-check__results')?.innerText || ''), null, { timeout: 300000 });
  await page.waitForTimeout(3000);
  const rows = await page.$$eval('#plugin-check__results table tbody tr', (trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())));
  const files = await page.$$eval('#plugin-check__results h4', (hs) => hs.map((h) => h.innerText));
  console.log('files:', files.join(', '));
  for (const r of rows) {
    if (r.some((c) => c === 'ERROR')) errors++;
    console.log(r.join(' | '));
  }
  if (!rows.length) console.log((await page.textContent('#plugin-check__results')).trim().slice(0, 500));
} finally {
  await browser.close();
  process.kill(-server.pid);
}
console.log(`\nPlugin Check: ${errors} error(s)`);
process.exit(errors ? 1 : 0);

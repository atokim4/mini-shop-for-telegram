// End-to-end test against WordPress Playground (start it first: npm start).
// Covers: bot connect from the settings page, /start webhook, Mini App catalog → variation → cart →
// MainButton checkout → WooCommerce block checkout → order linked to the Telegram user → status
// "completed" → message on the (fake) Bot API; plus tampered initData, reused links and screenshots.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { signInitData } from '../../dev/init-data.mjs';

const SITE = process.env.SITE_URL || 'http://127.0.0.1:9400';
const FAKE = process.env.FAKE_BOT_URL || 'http://127.0.0.1:8081';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
// A made-up token: the fake Bot API accepts anything shaped like a token.
const TOKEN = '4242:fake-local-test-token';
const BUYER = { id: 777000111, first_name: 'Demo', username: 'demo_buyer', language_code: 'en' };
const SHOTS = process.env.SHOTS === '0' ? null : 'docs/screenshots';
const stub = readFileSync(new URL('./telegram-stub.js', import.meta.url), 'utf8');

const steps = [];
async function step(name, fn) {
  const started = Date.now();
  await fn();
  steps.push(name);
  console.log(`  ok  ${name} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
}
const fakeCalls = async () => (await fetch(`${FAKE}/__calls`)).json();
const fakeReset = () => fetch(`${FAKE}/__reset`, { method: 'POST' });
async function waitFor(fn, what, timeoutMs = 60000, poke = async () => {}) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
    await poke();
    await new Promise((r) => setTimeout(r, 2000));
  }
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const errors = [];

// Admin: Playground logs the first visitor in as admin.
const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const adminPage = await admin.newPage();
adminPage.setDefaultTimeout(90000);

async function buyerPage({ initData, scheme = 'light', expect401 = false }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, locale: 'en-US' });
  await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: SITE }]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', (e) => errors.push(`${scheme}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error' || !page.url().includes('mstg_app')) return;
    if (expect401 && /status of 401/.test(m.text())) return;
    errors.push(`${scheme}: ${m.text()}`);
  });
  await page.addInitScript(`window.__tgStub = ${JSON.stringify({ initData, scheme })};`);
  await page.route('https://telegram.org/js/telegram-web-app.js', (r) => r.fulfill({ contentType: 'text/javascript', body: stub }));
  await page.goto(`${SITE}/?mstg_app=1`);
  await page.waitForSelector('.tile-name');
  return page;
}
const shot = (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const tile = (page, name) => page.locator('.tile', { hasText: name });
const option = (page, name) => page.locator('.sheet').getByRole('button', { name, exact: true });

let secret = '';
let orderId = 0;

await step('settings page saves the token, connects the bot and never prints the token', async () => {
  await fakeReset();
  const settingsUrl = `${SITE}/wp-admin/admin.php?page=mini-shop-for-telegram`;
  await adminPage.goto(settingsUrl);
  // On a fresh Playground, WooCommerce may bounce the first admin visit to its setup wizard: ask again once.
  if (!adminPage.url().includes('page=mini-shop-for-telegram')) await adminPage.goto(settingsUrl);
  await adminPage.fill('#mstg-token', TOKEN);
  await adminPage.fill('#mstg-title', 'Demo Coffee Shop');
  await adminPage.fill('#mstg-accent', '#c2410c');
  await adminPage.locator('input[name="notify_status[]"][value="completed"]').check();
  await adminPage.locator('input[name="notify_status[]"][value="processing"]').check();
  await adminPage.click('#submit');
  await adminPage.waitForSelector('.notice-success');
  assert.match(await adminPage.textContent('.notice-success'), /Connected to @demo_shop_bot/);
  assert.ok(!(await adminPage.content()).includes(TOKEN), 'token must not be printed');
  const calls = await fakeCalls();
  assert.deepEqual(calls.map((c) => c.method), ['getMe', 'setWebhook', 'setChatMenuButton']);
  secret = calls[1].params.secret_token;
  assert.equal(calls[2].params.menu_button.web_app.url, `${SITE}/?mstg_app=1`);
  await shot(adminPage, 'admin-settings');
});

await step('webhook rejects a wrong secret and answers /start with a web_app button', async () => {
  await fakeReset();
  const post = (headers) =>
    fetch(`${SITE}/wp-json/mstg/v1/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'playground_auto_login_already_happened=1', ...headers },
      body: JSON.stringify({ update_id: 1, message: { message_id: 1, chat: { id: BUYER.id, type: 'private' }, from: BUYER, text: '/start' } }),
    });
  assert.equal((await post({ 'X-Telegram-Bot-Api-Secret-Token': 'wrong' })).status, 403);
  assert.equal((await post({ 'X-Telegram-Bot-Api-Secret-Token': secret })).status, 200);
  const [call] = await fakeCalls();
  assert.equal(call.method, 'sendMessage');
  assert.equal(call.params.chat_id, BUYER.id);
  assert.equal(call.params.reply_markup.inline_keyboard[0][0].web_app.url, `${SITE}/?mstg_app=1`);
});

const initData = signInitData(TOKEN, { query_id: 'e2e', user: BUYER });

await step('dark theme renders catalog, sheet and cart', async () => {
  const page = await buyerPage({ initData, scheme: 'dark' });
  assert.equal(await page.getAttribute('html', 'data-scheme'), 'dark');
  await shot(page, 'dark-catalog');
  await tile(page, 'Colombia').locator('.tile-open').click();
  await option(page, 'Espresso').click();
  await option(page, '1 kg').click();
  await page.waitForTimeout(400);
  await shot(page, 'dark-product');
  await page.click('#tg-main-button');
  await tile(page, 'House Espresso').locator('.add').click();
  await page.click('#tg-main-button');
  await page.waitForSelector('.cart');
  await shot(page, 'dark-cart');
  await page.context().close();
});

await step('tampered initData: checkout is refused (401) and the buyer is told why', async () => {
  const tampered = initData.replace(String(BUYER.id), String(BUYER.id + 1));
  const res = await fetch(`${SITE}/wp-json/mstg/v1/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Telegram-Init-Data': tampered, cookie: 'playground_auto_login_already_happened=1' },
    body: JSON.stringify({ items: [{ id: 1, quantity: 1 }] }),
  });
  assert.equal(res.status, 401);
  const page = await buyerPage({ initData: tampered, expect401: true });
  await tile(page, 'Ethiopia').locator('.add').click();
  await page.click('#tg-main-button');
  await page.click('#tg-main-button');
  await page.waitForSelector('.notice');
  assert.match(await page.textContent('.notice'), /Open this shop from its Telegram bot/);
  assert.ok(page.url().includes('mstg_app'), 'must stay in the Mini App');
  await page.context().close();
});

await step('buyer orders in the Mini App: catalog → variation → cart → checkout → order', async () => {
  const page = await buyerPage({ initData });
  await shot(page, 'light-catalog');
  assert.equal(await page.locator('.chip').count(), 4);
  await page.locator('.chip', { hasText: 'Tea' }).click();
  assert.equal(await page.locator('.tile').count(), 1);
  await page.locator('.chip', { hasText: 'All' }).click();

  await tile(page, 'Ethiopia').locator('.add').click();
  await tile(page, 'Ethiopia').getByRole('button', { name: 'Increase quantity' }).click();
  assert.equal(await tile(page, 'Ethiopia').locator('output').textContent(), '2');
  assert.match(await page.textContent('#tg-main-button'), /View cart · \$29\.00/);

  await tile(page, 'Colombia').locator('.tile-open').click();
  assert.match(await page.textContent('#tg-main-button'), /Choose grind/);
  await option(page, 'Filter').click();
  await option(page, '250 g').click();
  await page.waitForTimeout(400);
  assert.match(await page.textContent('#tg-main-button'), /Add to cart · \$13\.00/);
  await shot(page, 'light-product');
  await page.click('#tg-main-button');
  assert.equal(await page.locator('.sheet').count(), 0);

  await page.click('#tg-main-button');
  await page.waitForSelector('.cart');
  assert.equal(await page.locator('.cart-line').count(), 2);
  assert.match(await page.textContent('.totals'), /\$42\.00/);
  await shot(page, 'light-cart');

  await page.click('#tg-main-button');
  await page.waitForURL(/\/checkout\//);
  await page.getByLabel('Email address').fill('buyer@example.com');
  await page.getByLabel('First name').first().fill('Demo');
  await page.getByLabel('Last name').first().fill('Buyer');
  await page.getByLabel('Address', { exact: true }).first().fill('1 Sample Street');
  await page.getByLabel('City').first().fill('Sample City');
  await page.getByLabel('State').first().selectOption('NY');
  await page.getByLabel('ZIP Code').first().fill('10001');
  await page.waitForTimeout(1500);
  await shot(page, 'checkout');
  await page.getByRole('button', { name: /Place Order/i }).click();
  await page.waitForURL(/order-received\/(\d+)/, { timeout: 120000 });
  orderId = Number(page.url().match(/order-received\/(\d+)/)[1]);
  assert.ok(orderId > 0);
  await page.context().close();
});

const rest = async (path, init = {}) => {
  const nonce = await adminPage.evaluate(async (site) => (await fetch(`${site}/wp-admin/admin-ajax.php?action=rest-nonce`)).text(), SITE);
  return adminPage.evaluate(
    async ({ url, init, nonce }) => {
      const r = await fetch(url, { ...init, headers: { 'content-type': 'application/json', 'X-WP-Nonce': nonce } });
      return { status: r.status, body: await r.json() };
    },
    { url: `${SITE}/wp-json/${path}`, init, nonce },
  );
};

await step('order holds the Telegram buyer and the variation the buyer chose', async () => {
  const { body: order } = await rest(`wc/v3/orders/${orderId}`);
  const meta = Object.fromEntries(order.meta_data.map((m) => [m.key, m.value]));
  assert.equal(meta._mstg_tg_user_id, String(BUYER.id));
  assert.equal(meta._mstg_tg_username, BUYER.username);
  assert.equal(order.total, '42.00');
  const colombia = order.line_items.find((i) => i.name.startsWith('Colombia'));
  assert.ok(colombia.meta_data.some((m) => m.display_value === 'Filter'), 'chosen "any" grind is on the order');
  await adminPage.goto(`${SITE}/wp-admin/admin.php?page=wc-orders&action=edit&id=${orderId}`);
  assert.match(await adminPage.textContent('body'), /Telegram buyer:\s*@demo_buyer/);
});

await step('status "completed" sends the buyer a Telegram message', async () => {
  await fakeReset();
  const { body } = await rest(`wc/v3/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status: 'completed' }) });
  assert.equal(body.status, 'completed');
  // Messages go through Action Scheduler; an admin page view runs the async queue.
  const message = await waitFor(
    async () => (await fakeCalls()).find((c) => c.method === 'sendMessage' && /Completed/.test(c.params.text)),
    'the completed message',
    90000,
    () => adminPage.goto(`${SITE}/wp-admin/`).catch(() => {}),
  );
  assert.equal(message.params.chat_id, BUYER.id);
  assert.match(message.params.text, new RegExp(`#${orderId}`));
  assert.match(message.params.text, /2 × Ethiopia Guji/);
  assert.match(message.params.text, /Total: \$42\.00/);
});

await step('a checkout link works once', async () => {
  const catalog = await (await fetch(`${SITE}/wp-json/mstg/v1/catalog`, { headers: { cookie: 'playground_auto_login_already_happened=1' } })).json();
  const create = await fetch(`${SITE}/wp-json/mstg/v1/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Telegram-Init-Data': initData, cookie: 'playground_auto_login_already_happened=1' },
    body: JSON.stringify({ items: [{ id: catalog.products[0].id, quantity: 1 }] }),
  });
  assert.equal(create.status, 201);
  const { checkout_url: url } = await create.json();
  const open = (u) => fetch(u, { redirect: 'manual', headers: { cookie: 'playground_auto_login_already_happened=1' } });
  assert.match((await open(url)).headers.get('location'), /\/checkout\/$/);
  assert.match((await open(url)).headers.get('location'), /\/cart\/$/);
});

await browser.close();
assert.deepEqual(errors, [], `browser errors: ${errors.join('; ')}`);
console.log(`\n${steps.length} E2E steps passed`);

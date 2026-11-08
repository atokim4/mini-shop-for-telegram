// Signs Telegram Mini App initData exactly like Telegram does, for tests and local development.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
import { createHmac } from 'node:crypto';

export function signInitData(botToken, fields) {
  const data = { auth_date: String(Math.floor(Date.now() / 1000)), ...fields };
  if (typeof data.user === 'object') data.user = JSON.stringify(data.user);
  const checkString = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secret).update(checkString).digest('hex');
  return new URLSearchParams({ ...data, hash }).toString();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [token, userId = '777000111', username = 'demo_buyer'] = process.argv.slice(2);
  if (!token) {
    console.error('usage: node dev/init-data.mjs <bot token> [user id] [username]');
    process.exit(1);
  }
  console.log(signInitData(token, { query_id: 'dev', user: { id: Number(userId), first_name: 'Demo', username, language_code: 'en' } }));
}

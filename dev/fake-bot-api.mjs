// Fake Telegram Bot API for local tests. Records every call; never talks to Telegram.
//   GET  /__calls   -> recorded calls [{ method, params, at }]
//   POST /__reset   -> clears them
//   POST /bot<token>/<method> -> { ok: true, result }
import http from 'node:http';

const PORT = Number(process.env.FAKE_BOT_PORT || 8081);
const BOT = { id: 1000001, is_bot: true, first_name: 'Demo Shop', username: 'demo_shop_bot' };
let calls = [];
let messageId = 1;

const results = {
  getMe: () => BOT,
  sendMessage: (p) => ({ message_id: messageId++, date: Math.floor(Date.now() / 1000), chat: { id: p.chat_id, type: 'private' }, text: p.text }),
};

export function startFakeBotApi(port = PORT) {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const send = (code, data) => {
        res.writeHead(code, { 'content-type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      if (req.url === '/__calls') return send(200, calls);
      if (req.url === '/__reset') { calls = []; return send(200, { ok: true }); }
      const m = req.url.match(/^\/bot(\d+:[\w-]+)\/(\w+)$/);
      if (!m) return send(404, { ok: false, error_code: 404, description: 'Not Found' });
      let params = {};
      try { params = body ? JSON.parse(body) : {}; } catch { return send(400, { ok: false, error_code: 400, description: 'Bad Request: invalid JSON' }); }
      calls.push({ method: m[2], params, at: Date.now() });
      const result = results[m[2]] ? results[m[2]](params) : true;
      send(200, { ok: true, result });
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startFakeBotApi();
  console.log(`fake Bot API on http://127.0.0.1:${PORT}`);
}

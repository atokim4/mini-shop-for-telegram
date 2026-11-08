import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createCheckout, fetchCatalog } from '../../src/api.js';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
  it('sends initData in a header and the cart lines as JSON', async () => {
    const fetch = vi.fn(() => json(201, { checkout_url: 'https://shop.test/?mstg_handoff=x', expires_in: 900 }));
    vi.stubGlobal('fetch', fetch);
    const result = await createCheckout('/wp-json/mstg/v1/', 'query_id=1&hash=abc', [{ id: 15, variation_id: 16, quantity: 2, attributes: { a: 'b' } }]);
    expect(result.checkout_url).toContain('mstg_handoff');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/wp-json/mstg/v1/checkout');
    expect(options.headers['X-Telegram-Init-Data']).toBe('query_id=1&hash=abc');
    expect(JSON.parse(options.body)).toEqual({ items: [{ id: 15, variation_id: 16, quantity: 2, attributes: { a: 'b' } }] });
  });

  it('turns WordPress REST errors into ApiError with status and code', async () => {
    vi.stubGlobal('fetch', () => json(422, { code: 'mstg_out_of_stock', message: '“Kettle” is out of stock.' }));
    await expect(createCheckout('/r/', 'x', [])).rejects.toMatchObject({ status: 422, code: 'mstg_out_of_stock', message: '“Kettle” is out of stock.' });
  });

  it('reports network failures and non-JSON answers', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    await expect(fetchCatalog('/r/')).rejects.toMatchObject({ code: 'network' });
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError('html')) }));
    const error = await fetchCatalog('/r/').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
  });
});

// REST client for /wp-json/mstg/v1.

export class ApiError extends Error {
  constructor(message, { status = 0, code = '' } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal, credentials: 'same-origin' });
  } catch {
    throw new ApiError('network', { code: 'network' });
  } finally {
    clearTimeout(timer);
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON answer (proxy error page, PHP fatal): handled below.
  }
  if (!response.ok || body === null) {
    throw new ApiError(body?.message || `HTTP ${response.status}`, { status: response.status, code: body?.code || 'http' });
  }
  return body;
}

export function fetchCatalog(restUrl) {
  return request(`${restUrl}catalog`);
}

/** @returns {Promise<{checkout_url: string, expires_in: number}>} */
export function createCheckout(restUrl, initData, lines) {
  return request(`${restUrl}checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
    body: JSON.stringify({
      items: lines.map((l) => ({ id: l.id, variation_id: l.variation_id || 0, quantity: l.quantity, attributes: l.attributes })),
    }),
  });
}

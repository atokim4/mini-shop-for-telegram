// Cart kept in localStorage. Lines hold ids only; prices always come from the live catalog.

const VERSION = 1;

export function lineKey(line) {
  const attrs = Object.keys(line.attributes ?? {}).sort().map((k) => `${k}=${line.attributes[k]}`).join('&');
  return `${line.id}:${line.variation_id ?? 0}:${attrs}`;
}

export class Cart {
  /** @param {Storage|null} storage @param {string} storageKey */
  constructor(storage, storageKey) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.lines = this.#load();
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  quantity(key) {
    return this.lines.find((l) => lineKey(l) === key)?.quantity ?? 0;
  }

  count() {
    return this.lines.reduce((n, l) => n + l.quantity, 0);
  }

  /** Adds or changes a line; quantity 0 removes it. Clamps to max. */
  set(line, quantity, max = 99) {
    const key = lineKey(line);
    const q = Math.max(0, Math.min(Math.trunc(quantity), max));
    const index = this.lines.findIndex((l) => lineKey(l) === key);
    if (q === 0) {
      if (index >= 0) this.lines.splice(index, 1);
    } else if (index >= 0) {
      this.lines[index] = { ...this.lines[index], quantity: q };
    } else {
      this.lines.push({ id: line.id, variation_id: line.variation_id ?? 0, attributes: line.attributes ?? {}, quantity: q });
    }
    this.#save();
  }

  clear() {
    this.lines = [];
    this.#save();
  }

  /**
   * Resolves lines against the catalog: drops products that are gone or out of stock and clamps
   * quantities. Returns { items, subtotal, changed }.
   */
  resolve(catalog) {
    const byId = new Map(catalog.products.map((p) => [p.id, p]));
    const items = [];
    let changed = false;
    for (const line of this.lines) {
      const product = byId.get(line.id);
      const variation = line.variation_id ? product?.variations?.find((v) => v.id === line.variation_id) : null;
      const sellable = line.variation_id ? variation : product?.type === 'simple' ? product : null;
      if (!sellable || !sellable.in_stock) {
        changed = true;
        continue;
      }
      const quantity = Math.min(line.quantity, sellable.max_qty);
      if (quantity !== line.quantity) changed = true;
      items.push({ line: { ...line, quantity }, product, variation, price: sellable.price, image: variation?.image ?? product.image, max: sellable.max_qty });
    }
    if (changed) {
      this.lines = items.map((i) => i.line);
      this.#save();
    }
    const subtotal = items.reduce((sum, i) => sum + i.price * i.line.quantity, 0);
    return { items, subtotal, changed };
  }

  #load() {
    try {
      const data = JSON.parse(this.storage?.getItem(this.storageKey) ?? 'null');
      if (data?.v !== VERSION || !Array.isArray(data.lines)) return [];
      return data.lines.filter((l) => Number.isInteger(l.id) && Number.isInteger(l.quantity) && l.quantity > 0);
    } catch {
      return [];
    }
  }

  #save() {
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify({ v: VERSION, lines: this.lines }));
    } catch {
      // Storage full or blocked: the cart still works for this session.
    }
    for (const fn of this.listeners) fn();
  }
}

import { describe, expect, it, vi } from 'vitest';
import { Cart, lineKey } from '../../src/cart.js';
import { catalog, memoryStorage } from './fixtures.js';

const beans = { id: 10, variation_id: 0, attributes: {} };

describe('Cart', () => {
  it('adds, updates and removes lines and persists them', () => {
    const storage = memoryStorage();
    const cart = new Cart(storage, 'k');
    cart.set(beans, 2);
    cart.set(beans, 3);
    expect(cart.count()).toBe(3);
    expect(new Cart(storage, 'k').quantity(lineKey(beans))).toBe(3);
    cart.set(beans, 0);
    expect(cart.lines).toEqual([]);
  });

  it('keys variable lines by variation and chosen attributes', () => {
    const a = { id: 15, variation_id: 16, attributes: { attribute_pa_grind: 'filter' } };
    const b = { id: 15, variation_id: 16, attributes: { attribute_pa_grind: 'whole-bean' } };
    expect(lineKey(a)).not.toBe(lineKey(b));
  });

  it('clamps to the max quantity', () => {
    const cart = new Cart(memoryStorage(), 'k');
    cart.set({ id: 14 }, 10, 3);
    expect(cart.count()).toBe(3);
  });

  it('notifies subscribers', () => {
    const cart = new Cart(memoryStorage(), 'k');
    const fn = vi.fn();
    cart.subscribe(fn);
    cart.set(beans, 1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('prices lines from the live catalog and drops gone or sold-out items', () => {
    const storage = memoryStorage();
    storage.setItem(
      'k',
      JSON.stringify({
        v: 1,
        lines: [
          { id: 10, variation_id: 0, attributes: {}, quantity: 2 },
          { id: 14, variation_id: 0, attributes: {}, quantity: 9 },
          { id: 20, variation_id: 0, attributes: {}, quantity: 1 },
          { id: 999, variation_id: 0, attributes: {}, quantity: 1 },
          { id: 15, variation_id: 16, attributes: { attribute_pa_grind: 'filter' }, quantity: 1 },
          { id: 15, variation_id: 18, attributes: {}, quantity: 1 },
        ],
      }),
    );
    const cart = new Cart(storage, 'k');
    const { items, subtotal, changed } = cart.resolve(catalog());
    expect(changed).toBe(true);
    expect(items.map((i) => [i.line.id, i.line.quantity])).toEqual([
      [10, 2],
      [14, 3],
      [15, 1],
    ]);
    expect(subtotal).toBe(2 * 1450 + 3 * 4900 + 1300);
    expect(cart.resolve(catalog()).changed).toBe(false);
  });

  it('ignores corrupt storage', () => {
    const storage = memoryStorage();
    storage.setItem('k', '{not json');
    expect(new Cart(storage, 'k').lines).toEqual([]);
    expect(new Cart(null, 'k').lines).toEqual([]);
  });
});

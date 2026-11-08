import { describe, expect, it } from 'vitest';
import { findVariation, isOptionAvailable, lineAttributes } from '../../src/variations.js';
import { catalog } from './fixtures.js';

const product = catalog().products.find((p) => p.id === 15);

describe('variations', () => {
  it('needs every attribute before matching', () => {
    expect(findVariation(product, { attribute_size: '250 g' })).toBeNull();
  });

  it('matches "any" attributes and exact ones', () => {
    expect(findVariation(product, { attribute_pa_grind: 'filter', attribute_size: '250 g' }).id).toBe(16);
    expect(findVariation(product, { attribute_pa_grind: 'whole-bean', attribute_size: '1 kg' }).id).toBe(17);
  });

  it('marks options that only lead to out-of-stock variations as unavailable', () => {
    expect(isOptionAvailable(product, { attribute_size: '1 kg' }, 'attribute_pa_grind', 'filter')).toBe(false);
    expect(isOptionAvailable(product, { attribute_size: '1 kg' }, 'attribute_pa_grind', 'whole-bean')).toBe(true);
    expect(isOptionAvailable(product, {}, 'attribute_size', '250 g')).toBe(true);
  });

  it('sends only the buyer-chosen values of "any" attributes', () => {
    const v = product.variations[0];
    expect(lineAttributes(v, { attribute_pa_grind: 'filter', attribute_size: '250 g' })).toEqual({ attribute_pa_grind: 'filter' });
    expect(lineAttributes(product.variations[1], { attribute_pa_grind: 'whole-bean', attribute_size: '1 kg' })).toEqual({});
  });
});

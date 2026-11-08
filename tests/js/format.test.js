import { describe, expect, it } from 'vitest';
import { formatPrice, sprintf } from '../../src/format.js';

const usd = { symbol: '$', decimals: 2, decimal: '.', thousand: ',', position: 'left' };

describe('formatPrice', () => {
  it('formats minor units with grouping', () => {
    expect(formatPrice(123456789, usd)).toBe('$1,234,567.89');
    expect(formatPrice(5, usd)).toBe('$0.05');
  });

  it('follows the WooCommerce symbol position and separators', () => {
    const eur = { symbol: '€', decimals: 2, decimal: ',', thousand: '.', position: 'right_space' };
    expect(formatPrice(149990, eur)).toBe('1.499,90 €');
    expect(formatPrice(100, { ...usd, position: 'right' })).toBe('1.00$');
    expect(formatPrice(100, { ...usd, position: 'left_space' })).toBe('$ 1.00');
  });

  it('handles zero-decimal currencies and negatives', () => {
    const uzs = { symbol: 'сўм', decimals: 0, decimal: '.', thousand: ' ', position: 'right_space' };
    expect(formatPrice(125000, uzs)).toBe('125 000 сўм');
    expect(formatPrice(-250, usd)).toBe('-$2.50');
  });
});

describe('sprintf', () => {
  it('fills %s in order', () => {
    expect(sprintf('Checkout · %s', '$4.00')).toBe('Checkout · $4.00');
    expect(sprintf('%s and %s', 'a')).toBe('a and ');
  });
});

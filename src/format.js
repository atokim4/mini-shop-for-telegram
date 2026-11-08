/**
 * Formats a price in minor units with the store's WooCommerce currency settings.
 * @param {number} minor  Amount in minor units (cents).
 * @param {{symbol:string, decimals:number, decimal:string, thousand:string, position:string}} currency
 */
const NBSP = '\u00a0';

export function formatPrice(minor, currency) {
  const decimals = Math.max(0, Number(currency.decimals) || 0);
  const negative = minor < 0;
  const fixed = (Math.abs(minor) / 10 ** decimals).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousand);
  const number = frac ? `${grouped}${currency.decimal}${frac}` : grouped;
  const sign = negative ? '-' : '';
  switch (currency.position) {
    case 'right':
      return `${sign}${number}${currency.symbol}`;
    case 'left_space':
      return `${sign}${currency.symbol}${NBSP}${number}`;
    case 'right_space':
      return `${sign}${number}${NBSP}${currency.symbol}`;
    default:
      return `${sign}${currency.symbol}${number}`;
  }
}

/** Replaces %s placeholders in order (the strings come translated from PHP). */
export function sprintf(template, ...args) {
  let i = 0;
  return String(template).replace(/%s/g, () => String(args[i++] ?? ''));
}

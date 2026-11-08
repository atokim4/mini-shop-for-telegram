// Variation matching for variable products. An empty attribute value on a variation means "any".

/** @returns the variation matching a complete selection, or null. */
export function findVariation(product, selection) {
  if (!product.attributes?.every((a) => selection[a.key])) return null;
  return product.variations.find((v) => matches(v, selection)) ?? null;
}

/** Whether an option can still lead to an in-stock variation, given the other choices. */
export function isOptionAvailable(product, selection, key, value) {
  const next = { ...selection, [key]: value };
  return product.variations.some((v) => v.in_stock && matches(v, next, true));
}

/** Attributes the cart must send: the "any" ones need the buyer's choice. */
export function lineAttributes(variation, selection) {
  const out = {};
  for (const [key, value] of Object.entries(variation.attributes)) {
    if (value === '' && selection[key]) out[key] = selection[key];
  }
  return out;
}

function matches(variation, selection, partial = false) {
  return Object.entries(variation.attributes).every(([key, value]) => {
    const chosen = selection[key];
    if (!chosen) return partial;
    return value === '' || value === chosen;
  });
}

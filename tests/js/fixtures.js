// Sample catalog in the shape GET /catalog returns (made-up demo products).
export const catalog = () => ({
  store: { title: 'Demo shop', currency: { symbol: '$', decimals: 2, decimal: '.', thousand: ',', position: 'left' } },
  categories: [{ id: 1, name: 'Coffee' }],
  products: [
    { id: 10, type: 'simple', name: 'Beans', description: '', category_ids: [1], price: 1450, regular: 1450, in_stock: true, max_qty: 99, image: null },
    { id: 14, type: 'simple', name: 'Kettle', description: '', category_ids: [1], price: 4900, regular: 4900, in_stock: true, max_qty: 3, image: null },
    { id: 20, type: 'simple', name: 'Sold out mug', description: '', category_ids: [1], price: 900, regular: 900, in_stock: false, max_qty: 99, image: null },
    {
      id: 15,
      type: 'variable',
      name: 'Colombia',
      description: '',
      category_ids: [1],
      price: 1300,
      regular: 1300,
      price_max: 4200,
      in_stock: true,
      max_qty: 99,
      image: null,
      attributes: [
        { key: 'attribute_pa_grind', label: 'Grind', options: [{ value: 'whole-bean', label: 'Whole bean' }, { value: 'filter', label: 'Filter' }] },
        { key: 'attribute_size', label: 'Size', options: [{ value: '250 g', label: '250 g' }, { value: '1 kg', label: '1 kg' }] },
      ],
      variations: [
        { id: 16, attributes: { attribute_pa_grind: '', attribute_size: '250 g' }, price: 1300, regular: 1300, in_stock: true, max_qty: 99, image: null },
        { id: 17, attributes: { attribute_pa_grind: 'whole-bean', attribute_size: '1 kg' }, price: 4200, regular: 4200, in_stock: true, max_qty: 99, image: null },
        { id: 18, attributes: { attribute_pa_grind: 'filter', attribute_size: '1 kg' }, price: 4200, regular: 4200, in_stock: false, max_qty: 99, image: null },
      ],
    },
  ],
});

export function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
}

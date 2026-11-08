import { ApiError, createCheckout, fetchCatalog } from './api.js';
import { Cart, lineKey } from './cart.js';
import { h, icon } from './dom.js';
import { formatPrice, sprintf } from './format.js';
import { telegram } from './telegram.js';
import { findVariation, isOptionAvailable, lineAttributes } from './variations.js';

const config = window.mstgConfig;
const t = config.i18n;
const tg = telegram();
const root = document.getElementById('mstg-app');
const cart = new Cart(safeStorage(), `mstg-cart:${location.host}`);

const state = {
  status: 'loading',
  catalog: null,
  view: 'catalog',
  category: 0,
  query: '',
  searchOpen: false,
  sheet: null, // { product, selection, quantity }
  busy: false,
  notice: '',
};
const tileUpdates = new Map();

if (config.accent) document.documentElement.style.setProperty('--mstg-accent', config.accent);
applyScheme(tg.colorScheme);
tg.onTheme(applyScheme);
tg.ready();
cart.subscribe(onCartChange);
load();

function applyScheme(scheme) {
  document.documentElement.dataset.scheme = scheme === 'dark' ? 'dark' : 'light';
}

async function load() {
  state.status = 'loading';
  render();
  try {
    state.catalog = await fetchCatalog(config.restUrl);
    state.status = 'ready';
    if (cart.resolve(state.catalog).changed) state.notice = t.cartChanged;
  } catch {
    state.status = 'error';
  }
  render();
}

function money(minor) {
  return formatPrice(minor, state.catalog.store.currency);
}

// ---------------------------------------------------------------- rendering

function render() {
  tileUpdates.clear();
  const screen = state.status === 'loading' ? renderLoading() : state.status === 'error' ? renderError() : state.view === 'cart' ? renderCart() : renderCatalog();
  // A modal sheet makes the page behind it unreachable for taps, focus and screen readers.
  screen.inert = Boolean(state.sheet);
  root.replaceChildren(screen, state.sheet ? renderSheet() : '', renderFallbackBar());
  syncChrome();
}

function renderLoading() {
  return h(
    'main',
    { class: 'screen', 'aria-busy': 'true' },
    h('p', { class: 'sr-only' }, t.loading),
    h('div', { class: 'chips' }, [1, 2, 3].map(() => h('span', { class: 'chip skeleton' }))),
    h('div', { class: 'grid' }, [1, 2, 3, 4].map(() => h('div', { class: 'tile' }, h('div', { class: 'tile-media skeleton' }), h('span', { class: 'line skeleton' }), h('span', { class: 'line short skeleton' })))),
  );
}

function renderError() {
  return h(
    'main',
    { class: 'screen state' },
    h('p', { class: 'state-title' }, t.loadError),
    h('button', { class: 'button', type: 'button', onClick: load }, t.retry),
  );
}

function renderHeader() {
  const count = cart.count();
  const search = state.searchOpen
    ? h('input', {
        class: 'search',
        type: 'search',
        placeholder: t.search,
        'aria-label': t.search,
        value: state.query,
        enterkeyhint: 'search',
        onInput: (e) => {
          state.query = e.target.value;
          renderGridOnly();
        },
      })
    : h('h1', { class: 'title' }, state.catalog.store.title || config.title);
  return h(
    'header',
    { class: 'bar' },
    search,
    h(
      'button',
      {
        class: 'icon-button',
        type: 'button',
        'aria-label': state.searchOpen ? t.back : t.search,
        onClick: () => {
          state.searchOpen = !state.searchOpen;
          if (!state.searchOpen) state.query = '';
          render();
          if (state.searchOpen) root.querySelector('.search')?.focus();
        },
      },
      icon(state.searchOpen ? 'close' : 'search'),
    ),
    h(
      'button',
      { class: 'icon-button cart-button', type: 'button', 'aria-label': `${t.cart} (${count})`, onClick: () => go('cart') },
      icon('bag'),
      count ? h('span', { class: 'badge', 'aria-hidden': 'true' }, count > 99 ? '99+' : count) : '',
    ),
  );
}

function renderCatalog() {
  const { categories } = state.catalog;
  const chips =
    categories.length > 1
      ? h(
          'nav',
          { class: 'chips', 'aria-label': t.all },
          [{ id: 0, name: t.all }, ...categories].map((c) =>
            h(
              'button',
              {
                class: 'chip',
                type: 'button',
                'aria-pressed': String(state.category === c.id),
                onClick: () => {
                  state.category = c.id;
                  tg.haptic('select');
                  render();
                },
              },
              c.name,
            ),
          ),
        )
      : '';
  return h('main', { class: 'screen' }, renderHeader(), chips, notice(), h('div', { class: 'grid-wrap' }, renderGrid()));
}

function renderGridOnly() {
  tileUpdates.clear();
  root.querySelector('.grid-wrap')?.replaceChildren(renderGrid());
}

function visibleProducts() {
  const q = state.query.trim().toLocaleLowerCase();
  return state.catalog.products.filter(
    (p) => (!state.category || p.category_ids.includes(state.category)) && (!q || p.name.toLocaleLowerCase().includes(q) || p.description.toLocaleLowerCase().includes(q)),
  );
}

function renderGrid() {
  const products = visibleProducts();
  if (!products.length) {
    return h('div', { class: 'state' }, h('p', { class: 'state-title' }, state.query ? sprintf(t.noResults, state.query) : t.noProducts));
  }
  return h('ul', { class: 'grid', role: 'list' }, products.map(renderTile));
}

function renderTile(product) {
  const onSale = product.regular > product.price;
  const priceText = product.type === 'variable' && product.price_max > product.price ? sprintf(t.from, money(product.price)) : money(product.price);
  const action = h('div', { class: 'tile-action' });
  const tile = h(
    'li',
    { class: `tile${product.in_stock ? '' : ' is-out'}` },
    h(
      'button',
      { class: 'tile-open', type: 'button', onClick: () => openSheet(product), 'aria-label': product.name },
      h(
        'div',
        { class: 'tile-media' },
        media(product.image, product),
        h('span', { class: `sticker${onSale ? ' is-sale' : ''}` }, onSale ? h('s', { class: 'was' }, money(product.regular)) : '', h('span', { class: 'now' }, priceText)),
      ),
      h('span', { class: 'tile-name' }, product.name),
    ),
    action,
  );

  let shownQty = -1;
  const update = () => {
    if (!product.in_stock) {
      action.replaceChildren(h('span', { class: 'muted' }, t.outOfStock));
      return;
    }
    if (product.type === 'variable') {
      const inCart = cart.lines.filter((l) => l.id === product.id).reduce((n, l) => n + l.quantity, 0);
      action.replaceChildren(
        h('button', { class: `add${inCart ? ' has-count' : ''}`, type: 'button', onClick: () => openSheet(product) }, inCart ? `${t.added} · ${inCart}` : t.add),
      );
      return;
    }
    const line = { id: product.id, variation_id: 0, attributes: {} };
    const qty = cart.quantity(lineKey(line));
    // The Add button morphs into the stepper; animate only that first change.
    const reveal = qty > 0 && shownQty === 0;
    shownQty = qty;
    action.replaceChildren(
      qty
        ? stepper(qty, product.max_qty, (n) => cart.set(line, n, product.max_qty), product.name, { reveal })
        : h(
            'button',
            {
              class: 'add',
              type: 'button',
              onClick: () => {
                cart.set(line, 1, product.max_qty);
                tg.haptic('light');
              },
            },
            icon('plus'),
            t.add,
          ),
    );
  };
  update();
  tileUpdates.set(product.id, update);
  return tile;
}

function media(image, product) {
  if (image?.src) return h('img', { src: image.src, alt: image.alt || '', loading: 'lazy', decoding: 'async' });
  // No photo: a monogram tile tinted from the product id, so the grid still reads as a shelf.
  const hue = (product.id * 47) % 360;
  return h('span', { class: 'monogram', style: `--hue:${hue}`, 'aria-hidden': 'true' }, initials(product.name));
}

function initials(name) {
  return name
    .split(/[\s,]+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0].toLocaleUpperCase())
    .join('');
}

/** Quantity control. With min 0 the last tap on minus removes the line (trash icon). */
function stepper(qty, max, onChange, name, { min = 0, reveal = false } = {}) {
  const removes = min === 0 && qty === 1;
  return h(
    'div',
    { class: `stepper${reveal ? ' is-new' : ''}`, role: 'group', 'aria-label': name },
    h(
      'button',
      { type: 'button', 'aria-label': removes ? t.remove : t.decrease, disabled: qty <= Math.max(min, 0) || undefined, onClick: () => (tg.haptic('light'), onChange(qty - 1)) },
      icon(removes ? 'trash' : 'minus'),
    ),
    h('output', { 'aria-live': 'polite' }, qty),
    h('button', { type: 'button', 'aria-label': t.increase, disabled: qty >= max || undefined, onClick: () => (tg.haptic('light'), onChange(qty + 1)) }, icon('plus')),
  );
}

function notice() {
  return state.notice ? h('p', { class: 'notice', role: 'status' }, state.notice) : '';
}

// ---------------------------------------------------------------- product sheet

function openSheet(product) {
  const selection = {};
  // Preselect options that have a single value.
  for (const a of product.attributes ?? []) if (a.options.length === 1) selection[a.key] = a.options[0].value;
  state.sheet = { product, selection, quantity: 1, entering: true };
  render();
  root.querySelector('.sheet')?.focus();
}

function closeSheet() {
  state.sheet = null;
  render();
}

function sheetSellable() {
  const { product, selection } = state.sheet;
  if (product.type !== 'variable') return { sellable: product, missing: null };
  const missing = product.attributes.find((a) => !selection[a.key]) ?? null;
  return { sellable: missing ? null : findVariation(product, selection), missing };
}

function renderSheet() {
  const { product, selection } = state.sheet;
  const { sellable } = sheetSellable();
  const image = sellable?.image ?? product.image;
  const price = sellable ? sellable.price : product.price;
  const regular = sellable ? sellable.regular : product.regular;
  // The entrance animation plays once; re-renders while choosing options must not replay it.
  const entering = state.sheet.entering;
  state.sheet.entering = false;

  return h(
    'div',
    { class: `sheet-layer${entering ? ' is-entering' : ''}` },
    h('div', { class: 'scrim', onClick: closeSheet }),
    h(
      'section',
      { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': product.name, tabindex: '-1', onKeydown: (e) => e.key === 'Escape' && closeSheet() },
      h('button', { class: 'icon-button sheet-close', type: 'button', 'aria-label': t.back, onClick: closeSheet }, icon('close')),
      h('div', { class: 'sheet-media' }, media(image, product)),
      h('h2', { class: 'sheet-name' }, product.name),
      h('p', { class: 'sheet-price' }, regular > price ? h('s', { class: 'was' }, money(regular)) : '', h('span', {}, money(price))),
      product.description ? h('p', { class: 'sheet-text' }, product.description) : '',
      (product.attributes ?? []).map((a) =>
        h(
          'fieldset',
          { class: 'options' },
          h('legend', {}, a.label),
          h(
            'div',
            { class: 'option-row' },
            a.options.map((o) => {
              const available = isOptionAvailable(product, selection, a.key, o.value);
              return h(
                'button',
                {
                  class: 'option',
                  type: 'button',
                  'aria-pressed': String(selection[a.key] === o.value),
                  disabled: !available,
                  onClick: () => {
                    selection[a.key] = selection[a.key] === o.value ? '' : o.value;
                    state.sheet.quantity = 1;
                    tg.haptic('select');
                    render();
                  },
                },
                o.label,
              );
            }),
          ),
        ),
      ),
      product.type === 'variable' && product.attributes.every((a) => selection[a.key]) && !sellable ? h('p', { class: 'muted' }, t.unavailable) : '',
      sellable && sellable.in_stock
        ? h('div', { class: 'sheet-qty' }, stepper(state.sheet.quantity, sellable.max_qty, (n) => ((state.sheet.quantity = n), render()), product.name, { min: 1 }))
        : '',
    ),
  );
}

function addFromSheet() {
  const { product, selection, quantity } = state.sheet;
  const { sellable, missing } = sheetSellable();
  if (missing || !sellable || !sellable.in_stock) {
    tg.haptic('error');
    return;
  }
  const line =
    product.type === 'variable'
      ? { id: product.id, variation_id: sellable.id, attributes: lineAttributes(sellable, selection) }
      : { id: product.id, variation_id: 0, attributes: {} };
  cart.set(line, cart.quantity(lineKey(line)) + quantity, sellable.max_qty);
  tg.haptic('success');
  state.sheet = null;
  render();
}

// ---------------------------------------------------------------- cart

function renderCart() {
  const { items, subtotal } = cart.resolve(state.catalog);
  const header = h(
    'header',
    { class: 'bar' },
    tg.backButton ? '' : h('button', { class: 'icon-button', type: 'button', 'aria-label': t.back, onClick: () => go('catalog') }, icon('back')),
    h('h1', { class: 'title' }, t.cart),
  );
  if (!items.length) {
    return h(
      'main',
      { class: 'screen' },
      header,
      h(
        'div',
        { class: 'state' },
        h('p', { class: 'state-title' }, t.cartEmpty),
        h('p', { class: 'muted' }, t.cartEmptyHint),
        h('button', { class: 'button', type: 'button', onClick: () => go('catalog') }, t.browse),
      ),
    );
  }
  return h(
    'main',
    { class: 'screen' },
    header,
    notice(),
    h(
      'ul',
      { class: 'cart', role: 'list' },
      items.map((item) =>
        h(
          'li',
          { class: 'cart-line' },
          h('div', { class: 'cart-media' }, media(item.image, item.product)),
          h(
            'div',
            { class: 'cart-info' },
            h('span', { class: 'cart-name' }, item.product.name),
            item.variation ? h('span', { class: 'muted' }, variationLabel(item.product, item.variation, item.line.attributes)) : '',
            h('span', { class: 'cart-price' }, money(item.price * item.line.quantity)),
          ),
          stepper(item.line.quantity, item.max, (n) => cart.set(item.line, n, item.max), item.product.name),
        ),
      ),
    ),
    h('div', { class: 'totals' }, h('span', {}, t.subtotal), h('strong', {}, money(subtotal))),
    h('p', { class: 'muted fineprint' }, t.shippingNote),
  );
}

function variationLabel(product, variation, chosen) {
  return product.attributes
    .map((a) => {
      const value = variation.attributes[a.key] || chosen[a.key];
      return a.options.find((o) => o.value === value)?.label ?? value;
    })
    .filter(Boolean)
    .join(', ');
}

async function checkout() {
  if (state.busy) return;
  if (!tg.inside) {
    state.notice = t.outsideTg;
    render();
    return;
  }
  state.busy = true;
  state.notice = '';
  syncChrome();
  try {
    const { checkout_url: url } = await createCheckout(config.restUrl, tg.initData, cart.lines);
    tg.haptic('success');
    cart.clear();
    tg.openLink(url);
  } catch (error) {
    tg.haptic('error');
    state.notice = error instanceof ApiError && error.status === 401 ? t.outsideTg : error instanceof ApiError && error.status === 422 ? error.message : t.checkoutError;
    state.busy = false;
    if (error instanceof ApiError && error.status === 422) {
      // Stock or options changed: refresh prices and availability before the next try.
      const message = state.notice;
      await load();
      state.notice = message;
    }
    render();
  }
}

// ---------------------------------------------------------------- navigation & chrome

function go(view) {
  state.view = view;
  state.notice = '';
  state.searchOpen = false;
  state.query = '';
  render();
  window.scrollTo(0, 0);
}

function onCartChange() {
  if (state.view === 'cart') {
    render();
    return;
  }
  for (const update of tileUpdates.values()) update();
  const badge = root.querySelector('.cart-button');
  if (badge) badge.replaceWith(renderHeader().querySelector('.cart-button'));
  syncChrome();
}

/** The primary action: Telegram's MainButton inside Telegram, our own bar elsewhere. */
function primaryAction() {
  if (state.status !== 'ready') return null;
  if (state.sheet) {
    const { sellable, missing } = sheetSellable();
    if (missing) return { text: sprintf(t.choose, missing.label.toLocaleLowerCase()), run: () => tg.haptic('warning') };
    if (!sellable || !sellable.in_stock) return null;
    return { text: `${t.add} · ${money(sellable.price * state.sheet.quantity)}`, run: addFromSheet };
  }
  const { items, subtotal } = cart.resolve(state.catalog);
  if (!items.length) return null;
  return state.view === 'cart' ? { text: sprintf(t.checkout, money(subtotal)), run: checkout } : { text: sprintf(t.viewCart, money(subtotal)), run: () => go('cart') };
}

function syncChrome() {
  const action = primaryAction();
  if (tg.mainButton) {
    if (action) tg.mainButton.show(action.text, action.run);
    else tg.mainButton.hide();
    tg.mainButton.loading(state.busy);
  } else {
    const bar = root.querySelector('.fallback-bar');
    if (bar) bar.replaceWith(renderFallbackBar(action));
  }
  if (tg.backButton) {
    if (state.sheet) tg.backButton.show(closeSheet);
    else if (state.view === 'cart') tg.backButton.show(() => go('catalog'));
    else tg.backButton.hide();
  }
}

function renderFallbackBar(action = primaryAction()) {
  if (tg.mainButton || !action) return h('div', { class: 'fallback-bar', hidden: true });
  return h('div', { class: 'fallback-bar' }, h('button', { class: 'button main', type: 'button', disabled: state.busy, onClick: action.run }, action.text));
}

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

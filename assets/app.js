/* Mini Shop for Telegram. Built from src/ with esbuild (npm run build). GPL-2.0-or-later. */
(() => {
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // src/api.js
  var ApiError = class extends Error {
    constructor(message, { status = 0, code = "" } = {}) {
      super(message);
      this.status = status;
      this.code = code;
    }
  };
  async function request(url, options = {}, timeoutMs = 15e3) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, { ...options, signal: controller.signal, credentials: "same-origin" });
    } catch {
      throw new ApiError("network", { code: "network" });
    } finally {
      clearTimeout(timer);
    }
    let body = null;
    try {
      body = await response.json();
    } catch {
    }
    if (!response.ok || body === null) {
      throw new ApiError((body == null ? void 0 : body.message) || `HTTP ${response.status}`, { status: response.status, code: (body == null ? void 0 : body.code) || "http" });
    }
    return body;
  }
  function fetchCatalog(restUrl) {
    return request(`${restUrl}catalog`);
  }
  function createCheckout(restUrl, initData, lines) {
    return request(`${restUrl}checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": initData },
      body: JSON.stringify({
        items: lines.map((l) => ({ id: l.id, variation_id: l.variation_id || 0, quantity: l.quantity, attributes: l.attributes }))
      })
    });
  }

  // src/cart.js
  var VERSION = 1;
  function lineKey(line) {
    const attrs = Object.keys(line.attributes ?? {}).sort().map((k) => `${k}=${line.attributes[k]}`).join("&");
    return `${line.id}:${line.variation_id ?? 0}:${attrs}`;
  }
  var _Cart_instances, load_fn, save_fn;
  var Cart = class {
    /** @param {Storage|null} storage @param {string} storageKey */
    constructor(storage, storageKey) {
      __privateAdd(this, _Cart_instances);
      this.storage = storage;
      this.storageKey = storageKey;
      this.lines = __privateMethod(this, _Cart_instances, load_fn).call(this);
      this.listeners = /* @__PURE__ */ new Set();
    }
    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }
    quantity(key) {
      var _a;
      return ((_a = this.lines.find((l) => lineKey(l) === key)) == null ? void 0 : _a.quantity) ?? 0;
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
      __privateMethod(this, _Cart_instances, save_fn).call(this);
    }
    clear() {
      this.lines = [];
      __privateMethod(this, _Cart_instances, save_fn).call(this);
    }
    /**
     * Resolves lines against the catalog: drops products that are gone or out of stock and clamps
     * quantities. Returns { items, subtotal, changed }.
     */
    resolve(catalog) {
      var _a;
      const byId = new Map(catalog.products.map((p) => [p.id, p]));
      const items = [];
      let changed = false;
      for (const line of this.lines) {
        const product = byId.get(line.id);
        const variation = line.variation_id ? (_a = product == null ? void 0 : product.variations) == null ? void 0 : _a.find((v) => v.id === line.variation_id) : null;
        const sellable = line.variation_id ? variation : (product == null ? void 0 : product.type) === "simple" ? product : null;
        if (!sellable || !sellable.in_stock) {
          changed = true;
          continue;
        }
        const quantity = Math.min(line.quantity, sellable.max_qty);
        if (quantity !== line.quantity) changed = true;
        items.push({ line: { ...line, quantity }, product, variation, price: sellable.price, image: (variation == null ? void 0 : variation.image) ?? product.image, max: sellable.max_qty });
      }
      if (changed) {
        this.lines = items.map((i) => i.line);
        __privateMethod(this, _Cart_instances, save_fn).call(this);
      }
      const subtotal = items.reduce((sum, i) => sum + i.price * i.line.quantity, 0);
      return { items, subtotal, changed };
    }
  };
  _Cart_instances = new WeakSet();
  load_fn = function() {
    var _a;
    try {
      const data = JSON.parse(((_a = this.storage) == null ? void 0 : _a.getItem(this.storageKey)) ?? "null");
      if ((data == null ? void 0 : data.v) !== VERSION || !Array.isArray(data.lines)) return [];
      return data.lines.filter((l) => Number.isInteger(l.id) && Number.isInteger(l.quantity) && l.quantity > 0);
    } catch {
      return [];
    }
  };
  save_fn = function() {
    var _a;
    try {
      (_a = this.storage) == null ? void 0 : _a.setItem(this.storageKey, JSON.stringify({ v: VERSION, lines: this.lines }));
    } catch {
    }
    for (const fn of this.listeners) fn();
  };

  // src/dom.js
  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === void 0 || value === null || value === false) continue;
      if (key === "class") el.className = value;
      else if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === "html") throw new Error("html prop is not allowed");
      else el.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children.flat()) {
      if (child === null || child === void 0 || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }
  var ICONS = {
    // 24px, 2px stroke, round caps: one consistent set drawn for this app.
    search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.2-4.2",
    close: "M6 6l12 12M18 6L6 18",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
    bag: "M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8zM9 8V7a3 3 0 0 1 6 0v1",
    trash: "M5 7h14M10 11v6M14 11v6M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12M9 7V5h6v2",
    back: "M15 18l-6-6 6-6"
  };
  function icon(name, label = "") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", `icon icon-${name}`);
    if (label) {
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", label);
    } else {
      svg.setAttribute("aria-hidden", "true");
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", ICONS[name]);
    svg.append(path);
    return svg;
  }

  // src/format.js
  var NBSP = "\xA0";
  function formatPrice(minor, currency) {
    const decimals = Math.max(0, Number(currency.decimals) || 0);
    const negative = minor < 0;
    const fixed = (Math.abs(minor) / 10 ** decimals).toFixed(decimals);
    const [int, frac] = fixed.split(".");
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousand);
    const number = frac ? `${grouped}${currency.decimal}${frac}` : grouped;
    const sign = negative ? "-" : "";
    switch (currency.position) {
      case "right":
        return `${sign}${number}${currency.symbol}`;
      case "left_space":
        return `${sign}${currency.symbol}${NBSP}${number}`;
      case "right_space":
        return `${sign}${number}${NBSP}${currency.symbol}`;
      default:
        return `${sign}${currency.symbol}${number}`;
    }
  }
  function sprintf(template, ...args) {
    let i = 0;
    return String(template).replace(/%s/g, () => String(args[i++] ?? ""));
  }

  // src/telegram.js
  var noop = () => {
  };
  function telegram(win = window) {
    var _a, _b;
    const wa = (_a = win.Telegram) == null ? void 0 : _a.WebApp;
    const inside = Boolean(wa && wa.initData);
    return {
      inside,
      initData: inside ? wa.initData : "",
      colorScheme: (wa == null ? void 0 : wa.colorScheme) || (((_b = win.matchMedia) == null ? void 0 : _b.call(win, "(prefers-color-scheme: dark)").matches) ? "dark" : "light"),
      ready: () => {
        var _a2;
        if (!wa) return;
        wa.ready();
        (_a2 = wa.expand) == null ? void 0 : _a2.call(wa);
      },
      onTheme: (fn) => {
        var _a2;
        return (_a2 = wa == null ? void 0 : wa.onEvent) == null ? void 0 : _a2.call(wa, "themeChanged", () => fn(wa.colorScheme));
      },
      haptic: (kind = "light") => {
        var _a2, _b2, _c;
        if (!inside) return;
        if (kind === "success" || kind === "error" || kind === "warning") (_a2 = wa.HapticFeedback) == null ? void 0 : _a2.notificationOccurred(kind);
        else if (kind === "select") (_b2 = wa.HapticFeedback) == null ? void 0 : _b2.selectionChanged();
        else (_c = wa.HapticFeedback) == null ? void 0 : _c.impactOccurred(kind);
      },
      mainButton: inside && wa.MainButton ? mainButton(wa.MainButton) : null,
      backButton: inside && wa.BackButton ? backButton(wa.BackButton) : null,
      openLink: (url) => {
        win.location.assign(url);
      },
      close: inside ? () => wa.close() : noop
    };
  }
  function mainButton(btn) {
    let handler = null;
    return {
      show(text, onClick) {
        if (handler) btn.offClick(handler);
        handler = onClick;
        btn.onClick(handler);
        btn.setParams({ text, is_visible: true, is_active: true });
      },
      loading(on) {
        if (on) btn.showProgress(false);
        else btn.hideProgress();
      },
      hide() {
        if (handler) btn.offClick(handler);
        handler = null;
        btn.hide();
      }
    };
  }
  function backButton(btn) {
    let handler = null;
    return {
      show(onClick) {
        if (handler) btn.offClick(handler);
        handler = onClick;
        btn.onClick(handler);
        btn.show();
      },
      hide() {
        if (handler) btn.offClick(handler);
        handler = null;
        btn.hide();
      }
    };
  }

  // src/variations.js
  function findVariation(product, selection) {
    var _a;
    if (!((_a = product.attributes) == null ? void 0 : _a.every((a) => selection[a.key]))) return null;
    return product.variations.find((v) => matches(v, selection)) ?? null;
  }
  function isOptionAvailable(product, selection, key, value) {
    const next = { ...selection, [key]: value };
    return product.variations.some((v) => v.in_stock && matches(v, next, true));
  }
  function lineAttributes(variation, selection) {
    const out = {};
    for (const [key, value] of Object.entries(variation.attributes)) {
      if (value === "" && selection[key]) out[key] = selection[key];
    }
    return out;
  }
  function matches(variation, selection, partial = false) {
    return Object.entries(variation.attributes).every(([key, value]) => {
      const chosen = selection[key];
      if (!chosen) return partial;
      return value === "" || value === chosen;
    });
  }

  // src/app.js
  var config = window.mstgConfig;
  var t = config.i18n;
  var tg = telegram();
  var root = document.getElementById("mstg-app");
  var cart = new Cart(safeStorage(), `mstg-cart:${location.host}`);
  var state = {
    status: "loading",
    catalog: null,
    view: "catalog",
    category: 0,
    query: "",
    searchOpen: false,
    sheet: null,
    // { product, selection, quantity }
    busy: false,
    notice: ""
  };
  var tileUpdates = /* @__PURE__ */ new Map();
  if (config.accent) document.documentElement.style.setProperty("--mstg-accent", config.accent);
  applyScheme(tg.colorScheme);
  tg.onTheme(applyScheme);
  tg.ready();
  cart.subscribe(onCartChange);
  load();
  function applyScheme(scheme) {
    document.documentElement.dataset.scheme = scheme === "dark" ? "dark" : "light";
  }
  async function load() {
    state.status = "loading";
    render();
    try {
      state.catalog = await fetchCatalog(config.restUrl);
      state.status = "ready";
      if (cart.resolve(state.catalog).changed) state.notice = t.cartChanged;
    } catch {
      state.status = "error";
    }
    render();
  }
  function money(minor) {
    return formatPrice(minor, state.catalog.store.currency);
  }
  function render() {
    tileUpdates.clear();
    const screen = state.status === "loading" ? renderLoading() : state.status === "error" ? renderError() : state.view === "cart" ? renderCart() : renderCatalog();
    screen.inert = Boolean(state.sheet);
    root.replaceChildren(screen, state.sheet ? renderSheet() : "", renderFallbackBar());
    syncChrome();
  }
  function renderLoading() {
    return h(
      "main",
      { class: "screen", "aria-busy": "true" },
      h("p", { class: "sr-only" }, t.loading),
      h("div", { class: "chips" }, [1, 2, 3].map(() => h("span", { class: "chip skeleton" }))),
      h("div", { class: "grid" }, [1, 2, 3, 4].map(() => h("div", { class: "tile" }, h("div", { class: "tile-media skeleton" }), h("span", { class: "line skeleton" }), h("span", { class: "line short skeleton" }))))
    );
  }
  function renderError() {
    return h(
      "main",
      { class: "screen state" },
      h("p", { class: "state-title" }, t.loadError),
      h("button", { class: "button", type: "button", onClick: load }, t.retry)
    );
  }
  function renderHeader() {
    const count = cart.count();
    const search = state.searchOpen ? h("input", {
      class: "search",
      type: "search",
      placeholder: t.search,
      "aria-label": t.search,
      value: state.query,
      enterkeyhint: "search",
      onInput: (e) => {
        state.query = e.target.value;
        renderGridOnly();
      }
    }) : h("h1", { class: "title" }, state.catalog.store.title || config.title);
    return h(
      "header",
      { class: "bar" },
      search,
      h(
        "button",
        {
          class: "icon-button",
          type: "button",
          "aria-label": state.searchOpen ? t.back : t.search,
          onClick: () => {
            var _a;
            state.searchOpen = !state.searchOpen;
            if (!state.searchOpen) state.query = "";
            render();
            if (state.searchOpen) (_a = root.querySelector(".search")) == null ? void 0 : _a.focus();
          }
        },
        icon(state.searchOpen ? "close" : "search")
      ),
      h(
        "button",
        { class: "icon-button cart-button", type: "button", "aria-label": `${t.cart} (${count})`, onClick: () => go("cart") },
        icon("bag"),
        count ? h("span", { class: "badge", "aria-hidden": "true" }, count > 99 ? "99+" : count) : ""
      )
    );
  }
  function renderCatalog() {
    const { categories } = state.catalog;
    const chips = categories.length > 1 ? h(
      "nav",
      { class: "chips", "aria-label": t.all },
      [{ id: 0, name: t.all }, ...categories].map(
        (c) => h(
          "button",
          {
            class: "chip",
            type: "button",
            "aria-pressed": String(state.category === c.id),
            onClick: () => {
              state.category = c.id;
              tg.haptic("select");
              render();
            }
          },
          c.name
        )
      )
    ) : "";
    return h("main", { class: "screen" }, renderHeader(), chips, notice(), h("div", { class: "grid-wrap" }, renderGrid()));
  }
  function renderGridOnly() {
    var _a;
    tileUpdates.clear();
    (_a = root.querySelector(".grid-wrap")) == null ? void 0 : _a.replaceChildren(renderGrid());
  }
  function visibleProducts() {
    const q = state.query.trim().toLocaleLowerCase();
    return state.catalog.products.filter(
      (p) => (!state.category || p.category_ids.includes(state.category)) && (!q || p.name.toLocaleLowerCase().includes(q) || p.description.toLocaleLowerCase().includes(q))
    );
  }
  function renderGrid() {
    const products = visibleProducts();
    if (!products.length) {
      return h("div", { class: "state" }, h("p", { class: "state-title" }, state.query ? sprintf(t.noResults, state.query) : t.noProducts));
    }
    return h("ul", { class: "grid", role: "list" }, products.map(renderTile));
  }
  function renderTile(product) {
    const onSale = product.regular > product.price;
    const priceText = product.type === "variable" && product.price_max > product.price ? sprintf(t.from, money(product.price)) : money(product.price);
    const action = h("div", { class: "tile-action" });
    const tile = h(
      "li",
      { class: `tile${product.in_stock ? "" : " is-out"}` },
      h(
        "button",
        { class: "tile-open", type: "button", onClick: () => openSheet(product), "aria-label": product.name },
        h(
          "div",
          { class: "tile-media" },
          media(product.image, product),
          h("span", { class: `sticker${onSale ? " is-sale" : ""}` }, onSale ? h("s", { class: "was" }, money(product.regular)) : "", h("span", { class: "now" }, priceText))
        ),
        h("span", { class: "tile-name" }, product.name)
      ),
      action
    );
    let shownQty = -1;
    const update = () => {
      if (!product.in_stock) {
        action.replaceChildren(h("span", { class: "muted" }, t.outOfStock));
        return;
      }
      if (product.type === "variable") {
        const inCart = cart.lines.filter((l) => l.id === product.id).reduce((n, l) => n + l.quantity, 0);
        action.replaceChildren(
          h("button", { class: `add${inCart ? " has-count" : ""}`, type: "button", onClick: () => openSheet(product) }, inCart ? `${t.added} \xB7 ${inCart}` : t.add)
        );
        return;
      }
      const line = { id: product.id, variation_id: 0, attributes: {} };
      const qty = cart.quantity(lineKey(line));
      const reveal = qty > 0 && shownQty === 0;
      shownQty = qty;
      action.replaceChildren(
        qty ? stepper(qty, product.max_qty, (n) => cart.set(line, n, product.max_qty), product.name, { reveal }) : h(
          "button",
          {
            class: "add",
            type: "button",
            onClick: () => {
              cart.set(line, 1, product.max_qty);
              tg.haptic("light");
            }
          },
          icon("plus"),
          t.add
        )
      );
    };
    update();
    tileUpdates.set(product.id, update);
    return tile;
  }
  function media(image, product) {
    if (image == null ? void 0 : image.src) return h("img", { src: image.src, alt: image.alt || "", loading: "lazy", decoding: "async" });
    const hue = product.id * 47 % 360;
    return h("span", { class: "monogram", style: `--hue:${hue}`, "aria-hidden": "true" }, initials(product.name));
  }
  function initials(name) {
    return name.split(/[\s,]+/).filter((w) => new RegExp("^\\p{L}", "u").test(w)).slice(0, 2).map((w) => w[0].toLocaleUpperCase()).join("");
  }
  function stepper(qty, max, onChange, name, { min = 0, reveal = false } = {}) {
    const removes = min === 0 && qty === 1;
    return h(
      "div",
      { class: `stepper${reveal ? " is-new" : ""}`, role: "group", "aria-label": name },
      h(
        "button",
        { type: "button", "aria-label": removes ? t.remove : t.decrease, disabled: qty <= Math.max(min, 0) || void 0, onClick: () => (tg.haptic("light"), onChange(qty - 1)) },
        icon(removes ? "trash" : "minus")
      ),
      h("output", { "aria-live": "polite" }, qty),
      h("button", { type: "button", "aria-label": t.increase, disabled: qty >= max || void 0, onClick: () => (tg.haptic("light"), onChange(qty + 1)) }, icon("plus"))
    );
  }
  function notice() {
    return state.notice ? h("p", { class: "notice", role: "status" }, state.notice) : "";
  }
  function openSheet(product) {
    var _a;
    const selection = {};
    for (const a of product.attributes ?? []) if (a.options.length === 1) selection[a.key] = a.options[0].value;
    state.sheet = { product, selection, quantity: 1, entering: true };
    render();
    (_a = root.querySelector(".sheet")) == null ? void 0 : _a.focus();
  }
  function closeSheet() {
    state.sheet = null;
    render();
  }
  function sheetSellable() {
    const { product, selection } = state.sheet;
    if (product.type !== "variable") return { sellable: product, missing: null };
    const missing = product.attributes.find((a) => !selection[a.key]) ?? null;
    return { sellable: missing ? null : findVariation(product, selection), missing };
  }
  function renderSheet() {
    const { product, selection } = state.sheet;
    const { sellable } = sheetSellable();
    const image = (sellable == null ? void 0 : sellable.image) ?? product.image;
    const price = sellable ? sellable.price : product.price;
    const regular = sellable ? sellable.regular : product.regular;
    const entering = state.sheet.entering;
    state.sheet.entering = false;
    return h(
      "div",
      { class: `sheet-layer${entering ? " is-entering" : ""}` },
      h("div", { class: "scrim", onClick: closeSheet }),
      h(
        "section",
        { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": product.name, tabindex: "-1", onKeydown: (e) => e.key === "Escape" && closeSheet() },
        h("button", { class: "icon-button sheet-close", type: "button", "aria-label": t.back, onClick: closeSheet }, icon("close")),
        h("div", { class: "sheet-media" }, media(image, product)),
        h("h2", { class: "sheet-name" }, product.name),
        h("p", { class: "sheet-price" }, regular > price ? h("s", { class: "was" }, money(regular)) : "", h("span", {}, money(price))),
        product.description ? h("p", { class: "sheet-text" }, product.description) : "",
        (product.attributes ?? []).map(
          (a) => h(
            "fieldset",
            { class: "options" },
            h("legend", {}, a.label),
            h(
              "div",
              { class: "option-row" },
              a.options.map((o) => {
                const available = isOptionAvailable(product, selection, a.key, o.value);
                return h(
                  "button",
                  {
                    class: "option",
                    type: "button",
                    "aria-pressed": String(selection[a.key] === o.value),
                    disabled: !available,
                    onClick: () => {
                      selection[a.key] = selection[a.key] === o.value ? "" : o.value;
                      state.sheet.quantity = 1;
                      tg.haptic("select");
                      render();
                    }
                  },
                  o.label
                );
              })
            )
          )
        ),
        product.type === "variable" && product.attributes.every((a) => selection[a.key]) && !sellable ? h("p", { class: "muted" }, t.unavailable) : "",
        sellable && sellable.in_stock ? h("div", { class: "sheet-qty" }, stepper(state.sheet.quantity, sellable.max_qty, (n) => (state.sheet.quantity = n, render()), product.name, { min: 1 })) : ""
      )
    );
  }
  function addFromSheet() {
    const { product, selection, quantity } = state.sheet;
    const { sellable, missing } = sheetSellable();
    if (missing || !sellable || !sellable.in_stock) {
      tg.haptic("error");
      return;
    }
    const line = product.type === "variable" ? { id: product.id, variation_id: sellable.id, attributes: lineAttributes(sellable, selection) } : { id: product.id, variation_id: 0, attributes: {} };
    cart.set(line, cart.quantity(lineKey(line)) + quantity, sellable.max_qty);
    tg.haptic("success");
    state.sheet = null;
    render();
  }
  function renderCart() {
    const { items, subtotal } = cart.resolve(state.catalog);
    const header = h(
      "header",
      { class: "bar" },
      tg.backButton ? "" : h("button", { class: "icon-button", type: "button", "aria-label": t.back, onClick: () => go("catalog") }, icon("back")),
      h("h1", { class: "title" }, t.cart)
    );
    if (!items.length) {
      return h(
        "main",
        { class: "screen" },
        header,
        h(
          "div",
          { class: "state" },
          h("p", { class: "state-title" }, t.cartEmpty),
          h("p", { class: "muted" }, t.cartEmptyHint),
          h("button", { class: "button", type: "button", onClick: () => go("catalog") }, t.browse)
        )
      );
    }
    return h(
      "main",
      { class: "screen" },
      header,
      notice(),
      h(
        "ul",
        { class: "cart", role: "list" },
        items.map(
          (item) => h(
            "li",
            { class: "cart-line" },
            h("div", { class: "cart-media" }, media(item.image, item.product)),
            h(
              "div",
              { class: "cart-info" },
              h("span", { class: "cart-name" }, item.product.name),
              item.variation ? h("span", { class: "muted" }, variationLabel(item.product, item.variation, item.line.attributes)) : "",
              h("span", { class: "cart-price" }, money(item.price * item.line.quantity))
            ),
            stepper(item.line.quantity, item.max, (n) => cart.set(item.line, n, item.max), item.product.name)
          )
        )
      ),
      h("div", { class: "totals" }, h("span", {}, t.subtotal), h("strong", {}, money(subtotal))),
      h("p", { class: "muted fineprint" }, t.shippingNote)
    );
  }
  function variationLabel(product, variation, chosen) {
    return product.attributes.map((a) => {
      var _a;
      const value = variation.attributes[a.key] || chosen[a.key];
      return ((_a = a.options.find((o) => o.value === value)) == null ? void 0 : _a.label) ?? value;
    }).filter(Boolean).join(", ");
  }
  async function checkout() {
    if (state.busy) return;
    if (!tg.inside) {
      state.notice = t.outsideTg;
      render();
      return;
    }
    state.busy = true;
    state.notice = "";
    syncChrome();
    try {
      const { checkout_url: url } = await createCheckout(config.restUrl, tg.initData, cart.lines);
      tg.haptic("success");
      cart.clear();
      tg.openLink(url);
    } catch (error) {
      tg.haptic("error");
      state.notice = error instanceof ApiError && error.status === 401 ? t.outsideTg : error instanceof ApiError && error.status === 422 ? error.message : t.checkoutError;
      state.busy = false;
      if (error instanceof ApiError && error.status === 422) {
        const message = state.notice;
        await load();
        state.notice = message;
      }
      render();
    }
  }
  function go(view) {
    state.view = view;
    state.notice = "";
    state.searchOpen = false;
    state.query = "";
    render();
    window.scrollTo(0, 0);
  }
  function onCartChange() {
    if (state.view === "cart") {
      render();
      return;
    }
    for (const update of tileUpdates.values()) update();
    const badge = root.querySelector(".cart-button");
    if (badge) badge.replaceWith(renderHeader().querySelector(".cart-button"));
    syncChrome();
  }
  function primaryAction() {
    if (state.status !== "ready") return null;
    if (state.sheet) {
      const { sellable, missing } = sheetSellable();
      if (missing) return { text: sprintf(t.choose, missing.label.toLocaleLowerCase()), run: () => tg.haptic("warning") };
      if (!sellable || !sellable.in_stock) return null;
      return { text: `${t.add} \xB7 ${money(sellable.price * state.sheet.quantity)}`, run: addFromSheet };
    }
    const { items, subtotal } = cart.resolve(state.catalog);
    if (!items.length) return null;
    return state.view === "cart" ? { text: sprintf(t.checkout, money(subtotal)), run: checkout } : { text: sprintf(t.viewCart, money(subtotal)), run: () => go("cart") };
  }
  function syncChrome() {
    const action = primaryAction();
    if (tg.mainButton) {
      if (action) tg.mainButton.show(action.text, action.run);
      else tg.mainButton.hide();
      tg.mainButton.loading(state.busy);
    } else {
      const bar = root.querySelector(".fallback-bar");
      if (bar) bar.replaceWith(renderFallbackBar(action));
    }
    if (tg.backButton) {
      if (state.sheet) tg.backButton.show(closeSheet);
      else if (state.view === "cart") tg.backButton.show(() => go("catalog"));
      else tg.backButton.hide();
    }
  }
  function renderFallbackBar(action = primaryAction()) {
    if (tg.mainButton || !action) return h("div", { class: "fallback-bar", hidden: true });
    return h("div", { class: "fallback-bar" }, h("button", { class: "button main", type: "button", disabled: state.busy, onClick: action.run }, action.text));
  }
  function safeStorage() {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
})();

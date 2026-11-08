// Stand-in for telegram.org/js/telegram-web-app.js in tests: same API surface the app uses, the
// theme CSS variables the real SDK sets, and a drawn MainButton/BackButton so tests can click them.
// Config comes from window.__tgStub = { initData, scheme }.
(() => {
  const cfg = window.__tgStub || {};
  const themes = {
    light: { bg_color: '#ffffff', text_color: '#000000', hint_color: '#999999', link_color: '#2481cc', button_color: '#2481cc', button_text_color: '#ffffff', secondary_bg_color: '#efeff3', section_separator_color: '#e7e7e7', destructive_text_color: '#ff3b30' },
    dark: { bg_color: '#212121', text_color: '#ffffff', hint_color: '#aaaaaa', link_color: '#8774e1', button_color: '#8774e1', button_text_color: '#ffffff', secondary_bg_color: '#181818', section_separator_color: '#2c2c2c', destructive_text_color: '#ff595a' },
  };
  const scheme = cfg.scheme === 'dark' ? 'dark' : 'light';
  const theme = themes[scheme];
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(theme)) root.setProperty(`--tg-theme-${k.replace(/_/g, '-')}`, v);
  root.setProperty('--tg-viewport-stable-height', `${window.innerHeight}px`);
  window.__tgCalls = [];

  function control(id, css) {
    let el = null;
    const handlers = new Set();
    const ensure = () => {
      if (el || !document.body) return el;
      el = document.createElement('button');
      el.id = id;
      el.type = 'button';
      el.style.cssText = css;
      // Snapshot: handlers swapped during a click must not run in the same click.
      el.addEventListener('click', () => [...handlers].forEach((h) => h()));
      document.body.append(el);
      return el;
    };
    return { handlers, ensure, get el() { return ensure(); } };
  }

  const main = control('tg-main-button', `position:fixed;left:0;right:0;bottom:0;height:56px;border:0;z-index:1000;font:600 15px system-ui,sans-serif;background:${theme.button_color};color:${theme.button_text_color};display:none`);
  const back = control('tg-back-button', 'position:fixed;left:8px;top:8px;z-index:1000;display:none;width:1px;height:1px;opacity:0');

  window.Telegram = {
    WebApp: {
      initData: cfg.initData || '',
      initDataUnsafe: {},
      colorScheme: scheme,
      themeParams: theme,
      platform: 'stub',
      version: '8.0',
      ready: () => window.__tgCalls.push('ready'),
      expand: () => window.__tgCalls.push('expand'),
      close: () => window.__tgCalls.push('close'),
      onEvent: () => {},
      HapticFeedback: { impactOccurred: () => {}, notificationOccurred: (k) => window.__tgCalls.push(`haptic:${k}`), selectionChanged: () => {} },
      MainButton: {
        onClick: (h) => main.handlers.add(h),
        offClick: (h) => main.handlers.delete(h),
        setParams: (p) => {
          if (p.text !== undefined) main.el.textContent = p.text;
          if (p.is_visible !== undefined) main.el.style.display = p.is_visible ? 'block' : 'none';
        },
        show: () => (main.el.style.display = 'block'),
        hide: () => main.ensure() && (main.el.style.display = 'none'),
        showProgress: () => main.ensure() && (main.el.dataset.progress = '1'),
        hideProgress: () => main.ensure() && delete main.el.dataset.progress,
      },
      BackButton: {
        onClick: (h) => back.handlers.add(h),
        offClick: (h) => back.handlers.delete(h),
        show: () => (back.el.style.display = 'block'),
        hide: () => back.ensure() && (back.el.style.display = 'none'),
      },
    },
  };
})();

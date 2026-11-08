// Thin wrapper over window.Telegram.WebApp that degrades to plain buttons outside Telegram.

const noop = () => {};

export function telegram(win = window) {
  const wa = win.Telegram?.WebApp;
  const inside = Boolean(wa && wa.initData);
  return {
    inside,
    initData: inside ? wa.initData : '',
    colorScheme: wa?.colorScheme || (win.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    ready: () => {
      if (!wa) return;
      wa.ready();
      wa.expand?.();
    },
    onTheme: (fn) => wa?.onEvent?.('themeChanged', () => fn(wa.colorScheme)),
    haptic: (kind = 'light') => {
      if (!inside) return;
      if (kind === 'success' || kind === 'error' || kind === 'warning') wa.HapticFeedback?.notificationOccurred(kind);
      else if (kind === 'select') wa.HapticFeedback?.selectionChanged();
      else wa.HapticFeedback?.impactOccurred(kind);
    },
    mainButton: inside && wa.MainButton ? mainButton(wa.MainButton) : null,
    backButton: inside && wa.BackButton ? backButton(wa.BackButton) : null,
    openLink: (url) => {
      win.location.assign(url);
    },
    close: inside ? () => wa.close() : noop,
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
    },
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
    },
  };
}

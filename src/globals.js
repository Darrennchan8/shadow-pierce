// Registered by the background worker only while the "bare $ / $$" setting is
// on. Defines window.$ / window.$$ from the API pierce.js exposes, replacing
// the DevTools built-ins.
(() => {
  'use strict';

  // Waits until page scripts have had their chance to claim the names, so
  // boot-time feature detection (`if (window.$)`) still sees nothing.
  // Configurable data properties also let a later `var $` / `let $` /
  // `window.$ =` win cleanly.
  const claimGlobals = () => {
    const api = window[Symbol.for('shadow-pierce.api')];
    if (!api) return;
    for (const name of ['$', '$$']) {
      if (!(name in window)) {
        Object.defineProperty(window, name, { value: api[name], writable: true, configurable: true, enumerable: false });
      }
    }
  };
  if (document.readyState === 'complete') claimGlobals();
  else window.addEventListener('load', claimGlobals, { once: true });
})();

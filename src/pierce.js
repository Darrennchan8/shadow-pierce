// Runs in the page's main world at document_start, before any page script.
// Records every shadow root (open or closed) as it is created, then exposes
// shadow-piercing $ / $$ for the DevTools console.
(() => {
  'use strict';

  // Holds the registry on Element.prototype, where same-origin child frames
  // can find it and where a re-run would see the realm is already patched.
  const KEY = Symbol.for('shadow-pierce');
  const shadowRootGetter = Object.getOwnPropertyDescriptor(Element.prototype, 'shadowRoot').get;

  // A Proxy keeps the patched function's name, length and native-looking toString().
  const tap = (fn, after) => new Proxy(fn, {
    apply(target, self, args) {
      const result = Reflect.apply(target, self, args);
      after(self, result);
      return result;
    },
  });

  if (Element.prototype[KEY]) return;

  // Chrome runs this in a new about:blank iframe as soon as it is attached,
  // so a parent can't reach an unpatched realm. Sharing the parent's registry
  // lets a search started in the parent see roots created through the child.
  let state;
  try {
    if (window.parent !== window) state = window.parent.Element.prototype[KEY];
  } catch {} // cross-origin parent
  state ??= { roots: new WeakMap(), internals: new WeakMap() };
  Object.defineProperty(Element.prototype, KEY, { value: state });

  Element.prototype.attachShadow = tap(Element.prototype.attachShadow, (host, root) => state.roots.set(host, root));

  // Declarative shadow roots never go through attachShadow, but custom
  // elements that adopt one reach it through ElementInternals.shadowRoot.
  HTMLElement.prototype.attachInternals = tap(HTMLElement.prototype.attachInternals, (host, internals) => state.internals.set(host, internals));

  const rootOf = el =>
    shadowRootGetter.call(el) ?? state.roots.get(el) ?? state.internals.get(el)?.shadowRoot ?? null;

  // Every element below scope in composed-tree order: a host's shadow tree is
  // visited before its light-DOM children. Excludes scope itself.
  function* descendants(scope) {
    const stack = [];
    const pushChildren = node => {
      for (let c = node.lastElementChild; c; c = c.previousElementSibling) stack.push(c);
      // Pushed last, so the shadow tree pops first.
      const root = node.nodeType === Node.ELEMENT_NODE ? rootOf(node) : null;
      if (root) {
        for (let c = root.lastElementChild; c; c = c.previousElementSibling) stack.push(c);
      }
    };
    pushChildren(scope);
    while (stack.length) {
      const el = stack.pop();
      yield el;
      pushChildren(el);
    }
  }

  const scratch = document.createDocumentFragment();

  // `a >>> b` matches b anywhere inside a, crossing any number of shadow
  // boundaries. A plain selector matches within each tree separately.
  const parse = selector => {
    if (typeof selector !== 'string') throw new TypeError('Selector must be a string');
    const parts = selector.split('>>>').map(s => s.trim());
    for (const part of parts) scratch.querySelector(part); // throws SyntaxError like querySelector does
    return parts;
  };

  function* match(parts, scope) {
    const [first, ...rest] = parts;
    if (!rest.length) {
      for (const el of descendants(scope)) if (el.matches(first)) yield el;
      return;
    }
    const seen = new Set();
    for (const host of match([first], scope)) {
      for (const el of match(rest, host)) {
        if (!seen.has(el)) {
          seen.add(el);
          yield el;
        }
      }
    }
  }

  const api = {
    $(selector, startNode) {
      return match(parse(selector), startNode ?? document).next().value ?? null;
    },
    $$(selector, startNode) {
      return [...match(parse(selector), startNode ?? document)];
    },
  };

  const define = (obj, name, value) =>
    Object.defineProperty(obj, name, { value, writable: true, configurable: true, enumerable: false });

  define(console, '$', api.$);
  define(console, '$$', api.$$);

  // The bare globals replace the DevTools built-ins, but only once page
  // scripts have had their chance to claim the names, so boot-time feature
  // detection (`if (window.$)`) still sees nothing. Configurable data
  // properties also let later `var $` / `let $` / `window.$ =` win cleanly.
  const claimGlobals = () => {
    for (const name of ['$', '$$']) if (!(name in window)) define(window, name, api[name]);
  };
  if (document.readyState === 'complete') claimGlobals();
  else window.addEventListener('load', claimGlobals, { once: true });
})();

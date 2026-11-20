# Shadow Pierce

A Chrome extension that makes `$` and `$$` in the DevTools console find
elements inside shadow roots — including **closed** ones.

```js
$$('button')                        // every <button>, in every shadow tree
$('#submit', $('my-form'))          // first match below <my-form>, shadow tree included
$$('my-app >>> settings-panel >>> input')  // explicit descent across shadow boundaries
console.$$('button')                // same thing, for pages that own $ / $$ (jQuery, minifiers)
```

## Install

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → pick this directory.
3. Optional: enable **Allow access to file URLs** to use it on `file://` pages.

## How it works

`src/pierce.js` is a content script registered with `"world": "MAIN"` and
`"run_at": "document_start"`, so it runs in the page's own JS context before
any page script (and is not subject to the page's CSP).

It wraps two APIs with a `Proxy` (which keeps their `name` and native-looking
`toString()`) and records every shadow root in a `WeakMap`:

- `Element.prototype.attachShadow`: every root created by script, open or closed.
- `HTMLElement.prototype.attachInternals`: custom elements with a
  declarative (`<template shadowrootmode="closed">`) root, which they reach
  via `ElementInternals.shadowRoot`.

Same-origin child frames share their parent's registry, so
`$$(sel, iframe.contentDocument)` from the parent sees closed roots in the
iframe too.

### Search semantics

- `$(selector, startNode?)` returns the first match or `null`;
  `$$(selector, startNode?)` returns an `Array`. Same signatures as the
  DevTools built-ins.
- A plain selector is matched within each tree separately, because CSS
  combinators can't cross shadow boundaries: `$$('my-app button')` won't find
  a button inside `my-app`'s shadow root. Use `>>>` for that.
- `a >>> b` matches `b` anywhere inside `a`, crossing any number of shadow
  boundaries (like Puppeteer's deep descendant combinator).
- Results are in composed-tree order: a host's shadow tree comes before its
  light-DOM children.

### `$` / `$$` vs `console.$` / `console.$$`

`console.$` and `console.$$` are always defined.

The DevTools built-ins are only used when the page has no `$` / `$$` of its
own, so defining `window.$` / `window.$$` replaces them. To avoid breaking
sites, the extension:

- waits for the `load` event, and only defines a name the page hasn't already
  claimed, so boot-time checks like `if (window.$)` still see nothing;
- uses non-enumerable, writable, configurable data properties, so a later
  `var $`, `let $`, `function $() {}` or `window.$ = jQuery` replaces it
  cleanly, with no SyntaxError and no setter surprises.

## Known gaps

- **Closed declarative roots on elements no script ever touches** (e.g. a
  plain `<div>` with `<template shadowrootmode="closed">`). The parser creates
  them without calling any patchable API. Chrome's
  `chrome.dom.openOrClosedShadowRoot()` can see them, but only from the
  extension's isolated content-script context. Use the Elements panel and
  `$0` for these.
- Cross-origin iframes: same as the DevTools built-ins, search the frame by
  switching the console's context dropdown.
- Pages where Chrome doesn't run extensions: `chrome://`, the Chrome Web
  Store, other extensions' pages.
- Patching is detectable by a determined page (e.g. by comparing against a
  pristine `attachShadow` from another realm). It's a debugging aid, not
  stealth tooling.

## Tests

The tests load the unpacked extension into Chromium with Playwright and run
the fixtures in `test/fixtures/`.

```sh
npm install
npm test                                   # uses Playwright's bundled Chromium (npx playwright-core install chromium)
CHROMIUM_PATH=/usr/bin/chromium npm test   # or any Chromium build
```

Branded Google Chrome ignores `--load-extension` since v137, so use Chromium.

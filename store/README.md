# Chrome Web Store submission

Copy for the developer dashboard, plus the assets this folder provides.

## Package

```sh
npm run package   # dist/shadow-pierce-<version>.zip, built from the committed HEAD
```

Bump `version` in both `manifest.json` and `package.json` (a test checks they
match) and commit before packaging an update.

## Store listing

**Category:** Developer Tools

**Summary** (from the manifest, max 132 chars):
Makes $ and $$ in the DevTools console find elements inside open and closed shadow roots.

**Description:**

> DevTools' `$` and `$$` stop at shadow DOM boundaries, so they can't find
> elements inside web components, and closed shadow roots can't be reached
> from the console at all. Shadow Pierce fixes that.
>
> • `$$('button')` finds every button, including those inside open and closed shadow roots, at any depth.
> • `$('#id', startNode)` and `$$(selector, startNode)` work like the DevTools built-ins.
> • `a >>> b` matches b anywhere inside a, crossing shadow boundaries.
> • On pages that use `$` themselves (jQuery, minified code), use `console.$` and `console.$$`.
>
> How it works: before any page script runs, the extension records every
> shadow root as it is created. It does not read page content, collect data,
> or make network requests. Source code: https://github.com/Darrennchan8/shadow-pierce
>
> Options: you can turn off the replacement of the console's `$` / `$$`
> if a site misbehaves; `console.$` / `console.$$` keep working.

**Assets:**

- Icon: `icons/128.png`
- Small promo tile (440×280): `store/promo-tile-440x280.png`
- Screenshot (1280×800): take one yourself. Open DevTools on a page with web
  components and run `$$('…')` so the result shows elements from inside shadow
  roots. Crop or resize the window to 1280×800.

## Privacy practices tab

**Single purpose:**
Make the DevTools console's `$` and `$$` helpers find elements inside open and closed shadow roots.

**Permission justifications:**

- **Host permissions (`<all_urls>`) / content scripts:** The extension must
  run before page scripts on whatever site the user is debugging, to record
  shadow roots as they're created; closed shadow roots can't be found
  afterwards. It runs only locally in the page, and reads or sends no page data.
- **`scripting`:** Registers or unregisters the small script that defines the
  bare `$` / `$$` globals, according to the user's setting on the options page.
- **`storage`:** Stores that one on/off setting.

**Remote code:** No. All code is in the package.

**Data usage:** Collects no user data. Tick none of the data categories and
certify the three disclosures (no selling, no unrelated use, no
creditworthiness use).

**Privacy policy URL:** Not required when no data is collected. If the form
asks, use https://github.com/Darrennchan8/shadow-pierce#privacy.

## Account

One-time $5 registration fee, 2-step verification, and the EU trader
declaration. A free hobby project normally declares **non-trader**.

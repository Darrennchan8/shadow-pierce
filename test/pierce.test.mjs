import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(root, 'test', 'fixtures');

let server, origin, profile, context;

before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      const body = await readFile(path.join(fixtures, path.basename(new URL(req.url, 'http://x').pathname)));
      res.writeHead(200, { 'content-type': 'text/html' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;

  profile = await mkdtemp(path.join(tmpdir(), 'shadow-pierce-'));
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`, '--no-sandbox'],
  });
});

after(async () => {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
  server?.close();
});

async function open(name) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e));
  await page.goto(`${origin}/${name}`, { waitUntil: 'load' });
  return { page, errors };
}

const ids = (page, expr) => page.evaluate(`(${expr}).map(el => el.id)`);

test('finds elements in open, closed, nested, custom-element and iframe shadow roots', async () => {
  const { page, errors } = await open('index.html');
  assert.deepEqual(await ids(page, "$$('.target')"), [
    'light', 'in-open', 'in-closed', 'in-nested', 'in-custom', 'in-dsd-custom',
  ]);
  assert.deepEqual(await ids(page, "$$('.target', document.getElementById('frame').contentDocument)"), ['in-frame']);
  assert.equal(await page.evaluate("$('#in-nested').textContent"), 'nested closed');
  assert.equal(await page.evaluate("$('.nope')"), null);
  assert.deepEqual(errors, []);
});

test('closed declarative roots on plain elements are a known gap', async () => {
  const { page } = await open('index.html');
  assert.equal(await page.evaluate("$('#in-dsd-plain')"), null);
});

test('startNode scopes the search to its descendants, including its shadow tree', async () => {
  const { page } = await open('index.html');
  assert.deepEqual(await ids(page, "$$('.target', $('#closed-host'))"), ['in-closed', 'in-nested']);
});

test('>>> crosses shadow boundaries between selector parts', async () => {
  const { page } = await open('index.html');
  assert.deepEqual(await ids(page, "$$('#closed-host >>> #nested-host >>> i')"), ['in-nested']);
  assert.deepEqual(await ids(page, "$$('x-closed >>> u')"), ['in-custom']);
});

test('invalid selectors throw like querySelector', async () => {
  const { page } = await open('index.html');
  const message = await page.evaluate("try { $$('a >>>') } catch (e) { e.name }");
  assert.equal(message, 'SyntaxError');
});

test('globals stay undefined during boot and are non-enumerable afterwards', async () => {
  const { page } = await open('index.html');
  assert.equal(await page.evaluate('typeofAtBoot'), 'undefined/undefined');
  assert.equal(await page.evaluate("Object.keys(window).includes('$')"), false);
  assert.equal(await page.evaluate('console.$$ === $$'), true);
});

test('patched APIs still look native', async () => {
  const { page } = await open('index.html');
  assert.match(await page.evaluate('String(Element.prototype.attachShadow)'), /\[native code\]/);
  assert.equal(await page.evaluate('Element.prototype.attachShadow.name'), 'attachShadow');
});

test('page-defined $ and $$ win, console.$ / console.$$ still work', async () => {
  const { page, errors } = await open('taken.html');
  assert.equal(await page.evaluate('$()'), 'page $');
  assert.equal(await page.evaluate('$$'), 'page $$');
  assert.deepEqual(await ids(page, "console.$$('.target')"), ['in-closed']);
  assert.deepEqual(errors, []);
});

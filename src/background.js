// Keeps globals.js registered only while the "bare $ / $$" setting is on.
// Page-world scripts can't read extension storage, so the setting is applied
// by registering or unregistering the script.

const GLOBALS_SCRIPT = {
  id: 'globals',
  js: ['src/globals.js'],
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  allFrames: true,
  matchOriginAsFallback: true,
};

const DEFAULTS = { bareGlobals: true };

let pending = Promise.resolve();

// Serialized so overlapping triggers can't register the same id twice.
const sync = () => (pending = pending.then(async () => {
  const { bareGlobals } = await chrome.storage.sync.get(DEFAULTS);
  const [registered] = await chrome.scripting.getRegisteredContentScripts({ ids: [GLOBALS_SCRIPT.id] });
  if (bareGlobals && !registered) await chrome.scripting.registerContentScripts([GLOBALS_SCRIPT]);
  if (!bareGlobals && registered) await chrome.scripting.unregisterContentScripts({ ids: [GLOBALS_SCRIPT.id] });
}).catch(console.error));

chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onStartup.addListener(sync);
chrome.storage.onChanged.addListener(changes => {
  if ('bareGlobals' in changes) sync();
});

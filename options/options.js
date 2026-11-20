const checkbox = document.getElementById('bareGlobals');

chrome.storage.sync.get({ bareGlobals: true }).then(({ bareGlobals }) => {
  checkbox.checked = bareGlobals;
});
checkbox.addEventListener('change', () => {
  chrome.storage.sync.set({ bareGlobals: checkbox.checked });
});

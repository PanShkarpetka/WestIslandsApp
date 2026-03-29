// ==UserScript==
// @name         D&D Beyond Balance Sync PoC
// @namespace    west-islands
// @version      0.1.0
// @description  Proof of concept: fetch D&D Beyond character balances from a logged-in browser session.
// @author       West Islands
// @match        https://www.dndbeyond.com/*
// @match        https://dndbeyond.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @connect      character-service.dndbeyond.com
// ==/UserScript==

/*
README (Quick Start)
1) Install Tampermonkey in your browser.
2) Create a new userscript and replace its contents with this file.
3) Save it, then open any D&D Beyond page while logged in.
4) Click the floating "WI Balances" button.
5) Paste character IDs (one per line, treated as strings), then click "Fetch Balances".
6) Use "Copy JSON" to copy all results.

Where to run:
- Any page on dndbeyond.com (script is matched there).

What successful output looks like:
[
  {
    "characterId": "146266373",
    "status": "success",
    "balance": { "cp": 0, "sp": 0, "gp": 140, "ep": 0, "pp": 0 }
  },
  {
    "characterId": "154993405",
    "status": "error",
    "error": "403 Forbidden"
  }
]
*/

(function () {
  'use strict';

  const STORAGE_KEYS = {
    ids: 'wi_balance_poc_character_ids',
    lastResults: 'wi_balance_poc_last_results',
  };

  const REQUEST_DELAY_MS = 300;
  const panelState = {
    isOpen: false,
    isFetching: false,
    results: [],
    counters: {
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
    },
  };

  const ui = {};

  init();

  async function init() {
    injectStyles();
    buildUI();
    await hydrateState();
    render();
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .wi-balance-fab {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        border: none;
        border-radius: 999px;
        padding: 10px 14px;
        background: #1f6feb;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 6px 18px rgba(0,0,0,0.25);
      }
      .wi-balance-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 2147483646;
        display: none;
      }
      .wi-balance-overlay.open {
        display: block;
      }
      .wi-balance-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(760px, 92vw);
        max-height: 88vh;
        overflow: auto;
        background: #0f172a;
        color: #e2e8f0;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 14px;
        z-index: 2147483647;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      .wi-balance-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .wi-balance-title {
        margin: 0;
        font-size: 14px;
      }
      .wi-balance-close {
        border: none;
        background: transparent;
        color: #cbd5e1;
        cursor: pointer;
        font-size: 18px;
      }
      .wi-balance-textarea {
        width: 100%;
        min-height: 120px;
        resize: vertical;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #020617;
        color: #e2e8f0;
        padding: 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        box-sizing: border-box;
      }
      .wi-balance-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 10px 0;
      }
      .wi-balance-btn {
        border: 1px solid #334155;
        border-radius: 8px;
        background: #1e293b;
        color: #e2e8f0;
        padding: 8px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .wi-balance-btn.primary {
        background: #1d4ed8;
        border-color: #1d4ed8;
      }
      .wi-balance-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .wi-balance-status {
        font-size: 12px;
        color: #cbd5e1;
        margin-bottom: 8px;
      }
      .wi-balance-results {
        border: 1px solid #334155;
        border-radius: 8px;
        background: #020617;
        padding: 8px;
        font-size: 12px;
      }
      .wi-balance-results-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 6px;
      }
      .wi-balance-item {
        padding: 6px;
        border-radius: 6px;
        border: 1px solid #1e293b;
      }
      .wi-balance-item.success { border-color: #166534; background: rgba(22, 101, 52, 0.2); }
      .wi-balance-item.error { border-color: #991b1b; background: rgba(153, 27, 27, 0.2); }
      .wi-balance-json {
        margin-top: 10px;
        width: 100%;
        min-height: 140px;
        resize: vertical;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #020617;
        color: #e2e8f0;
        padding: 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
  }

  function buildUI() {
    ui.fab = document.createElement('button');
    ui.fab.className = 'wi-balance-fab';
    ui.fab.textContent = 'WI Balances';

    ui.overlay = document.createElement('div');
    ui.overlay.className = 'wi-balance-overlay';

    ui.panel = document.createElement('section');
    ui.panel.className = 'wi-balance-panel';

    ui.panel.innerHTML = `
      <div class="wi-balance-header">
        <h2 class="wi-balance-title">D&D Beyond Balance Sync PoC</h2>
        <button class="wi-balance-close" title="Close">×</button>
      </div>
      <label for="wi-balance-ids" style="font-size:12px;display:block;margin-bottom:6px;">Character IDs (one per line)</label>
      <textarea id="wi-balance-ids" class="wi-balance-textarea" placeholder="146266373\n154993405"></textarea>
      <div class="wi-balance-actions">
        <button class="wi-balance-btn primary" data-action="fetch">Fetch Balances</button>
        <button class="wi-balance-btn" data-action="copy">Copy JSON</button>
        <button class="wi-balance-btn" data-action="download">Download JSON</button>
      </div>
      <div class="wi-balance-status" data-role="status"></div>
      <div class="wi-balance-results">
        <ul class="wi-balance-results-list" data-role="results-list"></ul>
      </div>
      <textarea class="wi-balance-json" data-role="json" readonly></textarea>
    `;

    document.body.appendChild(ui.overlay);
    document.body.appendChild(ui.panel);
    document.body.appendChild(ui.fab);

    ui.closeButton = ui.panel.querySelector('.wi-balance-close');
    ui.idsTextarea = ui.panel.querySelector('#wi-balance-ids');
    ui.fetchButton = ui.panel.querySelector('[data-action="fetch"]');
    ui.copyButton = ui.panel.querySelector('[data-action="copy"]');
    ui.downloadButton = ui.panel.querySelector('[data-action="download"]');
    ui.status = ui.panel.querySelector('[data-role="status"]');
    ui.resultsList = ui.panel.querySelector('[data-role="results-list"]');
    ui.jsonOutput = ui.panel.querySelector('[data-role="json"]');

    ui.fab.addEventListener('click', () => setPanelOpen(!panelState.isOpen));
    ui.overlay.addEventListener('click', () => setPanelOpen(false));
    ui.closeButton.addEventListener('click', () => setPanelOpen(false));

    ui.fetchButton.addEventListener('click', fetchBalancesHandler);
    ui.copyButton.addEventListener('click', copyResultsHandler);
    ui.downloadButton.addEventListener('click', downloadResultsHandler);

    ui.idsTextarea.addEventListener('blur', saveIdsToStorage);

    setPanelOpen(false);
  }

  async function hydrateState() {
    const savedIds = await gmGet(STORAGE_KEYS.ids, '');
    const savedResults = await gmGet(STORAGE_KEYS.lastResults, []);

    ui.idsTextarea.value = typeof savedIds === 'string' ? savedIds : '';
    panelState.results = Array.isArray(savedResults) ? savedResults : [];

    const success = panelState.results.filter((r) => r.status === 'success').length;
    const failed = panelState.results.filter((r) => r.status === 'error').length;

    panelState.counters = {
      total: panelState.results.length,
      processed: panelState.results.length,
      success,
      failed,
    };
  }

  function setPanelOpen(open) {
    panelState.isOpen = open;
    ui.overlay.classList.toggle('open', open);
    ui.panel.style.display = open ? 'block' : 'none';
  }

  function getCharacterIds() {
    return ui.idsTextarea.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  async function saveIdsToStorage() {
    await gmSet(STORAGE_KEYS.ids, ui.idsTextarea.value);
  }

  async function fetchBalancesHandler() {
    if (panelState.isFetching) return;

    const characterIds = getCharacterIds();
    await saveIdsToStorage();

    panelState.results = [];
    panelState.counters = {
      total: characterIds.length,
      processed: 0,
      success: 0,
      failed: 0,
    };

    panelState.isFetching = true;
    render();

    for (let i = 0; i < characterIds.length; i += 1) {
      const characterId = characterIds[i];
      const result = await fetchCharacterBalance(characterId);
      panelState.results.push(result);
      panelState.counters.processed += 1;
      if (result.status === 'success') {
        panelState.counters.success += 1;
      } else {
        panelState.counters.failed += 1;
      }

      render();

      if (i < characterIds.length - 1) {
        await sleep(REQUEST_DELAY_MS);
      }
    }

    panelState.isFetching = false;
    await gmSet(STORAGE_KEYS.lastResults, panelState.results);
    render();
  }

  function copyResultsHandler() {
    const json = JSON.stringify(panelState.results, null, 2);
    if (!json || json === '[]') return;

    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(json, 'text');
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json);
    }
  }

  function downloadResultsHandler() {
    const json = JSON.stringify(panelState.results, null, 2);
    if (!json || json === '[]') return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `dndbeyond-balances-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function fetchCharacterBalance(characterId) {
    const url = `https://character-service.dndbeyond.com/character/v5/character/${characterId}?includeCustomItems=true`;

    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers: {
          Accept: 'application/json',
        },
        onload: (response) => {
          if (response.status < 200 || response.status >= 300) {
            resolve({
              characterId,
              status: 'error',
              error: `${response.status} ${response.statusText || 'Request failed'}`,
            });
            return;
          }

          let parsed;
          try {
            parsed = JSON.parse(response.responseText);
          } catch (error) {
            resolve({
              characterId,
              status: 'error',
              error: 'Invalid JSON response',
            });
            return;
          }

          const balance = {
            cp: parsed?.data?.currencies?.cp ?? 0,
            sp: parsed?.data?.currencies?.sp ?? 0,
            gp: parsed?.data?.currencies?.gp ?? 0,
            ep: parsed?.data?.currencies?.ep ?? 0,
            pp: parsed?.data?.currencies?.pp ?? 0,
          };

          resolve({
            characterId,
            status: 'success',
            balance,
          });
        },
        onerror: (error) => {
          resolve({
            characterId,
            status: 'error',
            error: error?.error || 'Network error',
          });
        },
        ontimeout: () => {
          resolve({
            characterId,
            status: 'error',
            error: 'Request timed out',
          });
        },
      });
    });
  }

  function render() {
    const { total, processed, success, failed } = panelState.counters;
    ui.fetchButton.disabled = panelState.isFetching;

    ui.status.textContent = `Total: ${total} | Processed: ${processed} | Success: ${success} | Failed: ${failed}${panelState.isFetching ? ' | Fetching...' : ''}`;

    ui.resultsList.innerHTML = '';
    for (const item of panelState.results) {
      const li = document.createElement('li');
      li.className = `wi-balance-item ${item.status}`;
      if (item.status === 'success') {
        li.textContent = `${item.characterId}: cp=${item.balance.cp}, sp=${item.balance.sp}, gp=${item.balance.gp}, ep=${item.balance.ep}, pp=${item.balance.pp}`;
      } else {
        li.textContent = `${item.characterId}: ${item.error}`;
      }
      ui.resultsList.appendChild(li);
    }

    ui.jsonOutput.value = JSON.stringify(panelState.results, null, 2);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function gmGet(key, defaultValue) {
    if (typeof GM_getValue !== 'function') return Promise.resolve(defaultValue);
    try {
      const value = GM_getValue(key, defaultValue);
      if (value && typeof value.then === 'function') return value;
      return Promise.resolve(value);
    } catch {
      return Promise.resolve(defaultValue);
    }
  }

  function gmSet(key, value) {
    if (typeof GM_setValue !== 'function') return Promise.resolve();
    try {
      const result = GM_setValue(key, value);
      if (result && typeof result.then === 'function') return result;
      return Promise.resolve();
    } catch {
      return Promise.resolve();
    }
  }
})();

// Preloaded via `node --import` before any test module loads.
// Sets browser globals that pinia's devtools-kit calls at module init time.
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} }
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} }

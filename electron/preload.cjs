/* Minimal preload bridge: exposes read-only app facts. No Node APIs leak. */
const { contextBridge } = require('electron');

const VERSION = (() => {
  try {
    return require('../package.json').version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

contextBridge.exposeInMainWorld('anvilpoint', {
  version: VERSION,
  platform: process.platform,
  isDesktop: true,
});

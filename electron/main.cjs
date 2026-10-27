/* Anvilpoint desktop shell (Electron main process).
 * Security posture: no Node integration in the renderer, full sandbox,
 * context isolation, and all external links open in the system browser.
 * The renderer is the same audited Vite bundle shipped to the web build —
 * repository analysis still runs locally, nothing is uploaded.
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const VERSION = (() => {
  try {
    return require('../package.json').version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

// Headless smoke test: `Anvilpoint.exe --version` prints and exits.
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(`Anvilpoint ${VERSION}`);
  app.exit(0);
}
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Anvilpoint — local-first open-source project readiness workbench.\nUsage: anvilpoint [--version|--help]');
  app.exit(0);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock && !process.argv.includes('--version')) {
  app.quit();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: '#14161b',
    title: 'Anvilpoint',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Registry/docs links open in the system browser; never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:')) {
      event.preventDefault();
    }
  });

  void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

void app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

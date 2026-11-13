'use strict';
// Main process. Same wiring as the official SmartSpectra electron-quickstart:
// one window, the SDK IPC bridge, and a camera-only permission rule.
const path = require('path');
const { app, BrowserWindow, Menu, session } = require('electron');
const { bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main');

// Development aid for machines with no camera. Chromium supplies a test pattern.
if (process.env.IGNITION_FAKE_CAMERA === '1') app.commandLine.appendSwitch('use-fake-device-for-media-stream');

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 800,
    minWidth: 760,
    minHeight: 620,
    backgroundColor: '#0A0A0F',
    title: 'IGNITION',
    webPreferences: {
      preload: path.join(__dirname, 'dist', 'preload.bundle.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  bindSmartSpectraIpc(win);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, 'index.html'));
  if (process.env.SMARTSPECTRA_DIAGNOSTICS === '1') win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // Allow the camera only. No microphone, no other permission, and only for the app's own page.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const url = (details && details.requestingUrl) || (wc && wc.getURL()) || '';
    const types = (details && details.mediaTypes) || [];
    const cameraOnly = types.length === 1 && types[0] === 'video';
    callback(permission === 'media' && cameraOnly && url.startsWith('file://'));
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

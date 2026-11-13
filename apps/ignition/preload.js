'use strict';
// Bundled by esbuild into dist/preload.bundle.js (a sandboxed preload cannot require other files).
require('@smartspectra/node-sdk/preload');   // exposes window.__smartspectraBridge
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('ignitionEnv', {
  apiKey: process.env.SMARTSPECTRA_API_KEY || '',
  sim: process.env.IGNITION_SIM === '1',
});

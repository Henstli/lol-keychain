const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', { invoke: (ch, ...a) => ipcRenderer.invoke(ch, ...a) });

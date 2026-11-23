const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  invoke: (ch, ...a) => ipcRenderer.invoke(ch, ...a),
  on: (ch, fn) => {
    const ok = ['progress', 'active', 'copied', 'locked', 'account', 'update', 'hello', 'riot'];
    if (ok.includes(ch)) ipcRenderer.on(ch, (_, data) => fn(data));
  },
});

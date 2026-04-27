/**
 * Electron Preload Script — contextBridge 安全暴露 API
 * 仅暴露必要的 IPC 通道，不向 renderer 暴露 Node.js 原生 API
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 自定义标题栏控制
  minimize: () => ipcRenderer.send('title-bar:minimize'),
  maximize: () => ipcRenderer.send('title-bar:maximize'),
  close:    () => ipcRenderer.send('title-bar:close'),

  // 是否在 Electron 环境内（前端用于自适应 WS 地址）
  isElectron: true,

  // 平台信息
  platform: process.platform,
});

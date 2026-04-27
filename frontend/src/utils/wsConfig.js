/**
 * wsConfig.js — WebSocket / HTTP 地址自适应
 *
 * 优先级：
 *  1. Electron 环境 → 强制使用 127.0.0.1:8000（后端随 exe 一起启动）
 *  2. 浏览器开发模式 → 使用 Vite proxy（相对路径 / 同主机端口）
 *  3. 浏览器生产模式 → 使用同域名
 */

const BACKEND_PORT = 8000;

function getBackendOrigin() {
  // Electron 环境：window.electronAPI 由 preload.js 注入
  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    return `http://127.0.0.1:${BACKEND_PORT}`;
  }
  // 浏览器环境：使用当前页面主机名（Vite proxy 会转发 /api 和 /ws）
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
  }
  return `http://127.0.0.1:${BACKEND_PORT}`;
}

function getWsOrigin() {
  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    return `ws://127.0.0.1:${BACKEND_PORT}`;
  }
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.hostname}:${BACKEND_PORT}`;
  }
  return `ws://127.0.0.1:${BACKEND_PORT}`;
}

export const HTTP_BASE = getBackendOrigin();
export const WS_BASE   = getWsOrigin();

/**
 * MICRO-EARTH · DIGITAL TWIN
 * Electron 主进程 — 无边框全屏窗口 + Python 后端静默驻留
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http  = require('http');
const fs    = require('fs');

// ── 配置 ──────────────────────────────────────────────────────────
const BACKEND_PORT  = 8000;
const FRONTEND_PORT = 5180;            // Vite dev-server / 打包后改用 file://
const IS_DEV        = !app.isPackaged; // 开发模式 vs 打包模式

// ── Python 子进程句柄 ──────────────────────────────────────────────
let pyProcess = null;

// ── 工具：等待 HTTP 端口就绪 ───────────────────────────────────────
function waitForPort(port, retries = 40, delay = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        if (res.statusCode < 500) resolve();
        else attempt(n - 1);
      });
      req.on('error', () => {
        if (n <= 0) return reject(new Error(`Port ${port} not ready`));
        setTimeout(() => attempt(n - 1), delay);
      });
      req.setTimeout(800, () => { req.destroy(); attempt(n - 1); });
    };
    attempt(retries);
  });
}

// ── 启动 Python FastAPI 后端 ──────────────────────────────────────
function startBackend() {
  // 打包模式：使用 PyInstaller 生成的 micro_earth_backend.exe
  // 开发模式：直接用系统 Python / venv 启动 uvicorn
  let execPath, args, cwd;

  if (IS_DEV) {
    // ---- 开发模式 ----
    // 尝试在 backend 目录的 .venv / venv / conda 里找 Python
    const backendDir = path.join(__dirname, '..', 'backend');
    const candidates = [
      path.join(backendDir, '.venv',  'Scripts', 'python.exe'),
      path.join(backendDir, 'venv',   'Scripts', 'python.exe'),
      path.join(backendDir, '.venv',  'bin', 'python'),
      path.join(backendDir, 'venv',   'bin', 'python'),
      // Anaconda 全局环境（Windows 常见路径）
      path.join(process.env.USERPROFILE || '', 'anaconda3', 'python.exe'),
      path.join(process.env.USERPROFILE || '', 'miniconda3', 'python.exe'),
      'python',
    ];
    execPath = candidates.find((p) => {
      try { return fs.existsSync(p); } catch { return false; }
    }) || 'python';

    args = ['-m', 'uvicorn', 'api.main:app',
            '--host', '127.0.0.1', '--port', String(BACKEND_PORT)];
    cwd  = backendDir;
  } else {
    // ---- 打包模式：PyInstaller exe 放在 resources/backend/ ----
    const resourcesDir = process.resourcesPath;
    execPath = path.join(resourcesDir, 'backend', 'micro_earth_backend.exe');
    args = [];
    cwd  = path.join(resourcesDir, 'backend');
  }

  console.log('[Electron] Starting backend:', execPath, args.join(' '));

  pyProcess = spawn(execPath, args, {
    cwd,
    stdio: 'pipe',           // 静默：不继承 stdout/stderr 到终端
    windowsHide: true,       // Windows 下不弹出黑色 cmd 窗口
    detached: false,
  });

  pyProcess.stdout.on('data', (d) => console.log('[Backend]', d.toString().trim()));
  pyProcess.stderr.on('data', (d) => console.error('[Backend]', d.toString().trim()));
  pyProcess.on('exit', (code) => console.log('[Backend] exited with code', code));
}

// ── 杀掉 Python 进程（含子进程树） ───────────────────────────────
function killBackend() {
  if (!pyProcess) return;
  try {
    if (process.platform === 'win32') {
      // Windows 上使用 taskkill 递归杀掉整棵进程树
      spawn('taskkill', ['/pid', String(pyProcess.pid), '/f', '/t'],
            { stdio: 'ignore', windowsHide: true });
    } else {
      process.kill(-pyProcess.pid, 'SIGKILL');
    }
  } catch (e) {
    console.warn('[Electron] killBackend error:', e.message);
  }
  pyProcess = null;
}

// ── 创建主窗口 ────────────────────────────────────────────────────
async function createWindow() {
  const win = new BrowserWindow({
    width:  1600,
    height: 960,
    minWidth:  1280,
    minHeight: 720,
    frame:           false,   // 去掉原生标题栏，使用自定义标题栏
    transparent:     false,
    backgroundColor: '#0a0514',
    titleBarStyle:   'hidden',
    webPreferences: {
      nodeIntegration:        false,   // 安全：不允许 renderer 直接用 Node API
      contextIsolation:       true,    // 安全：隔离主/渲染进程上下文
      webSecurity:            false,   // 允许跨域加载 Mapbox/Esri 瓦片
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false,   // 等内容加载完再显示，避免白屏闪烁
  });

  // 最大化（但不全屏，保留自定义标题栏）
  win.maximize();

  // 内容加载完毕后显示
  win.once('ready-to-show', () => win.show());

  // 外部链接在系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 加载前端
  if (IS_DEV) {
    // 开发模式：加载 Vite dev-server
    await win.loadURL(`http://127.0.0.1:${FRONTEND_PORT}`);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // 打包模式：加载 Vite build 产物
    const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    await win.loadFile(indexPath);
  }

  return win;
}

// ── IPC 处理：自定义标题栏按钮 ───────────────────────────────────
ipcMain.on('title-bar:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on('title-bar:maximize', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  w.isMaximized() ? w.unmaximize() : w.maximize();
});
ipcMain.on('title-bar:close',    (e) => BrowserWindow.fromWebContents(e.sender)?.close());

// ── App 生命周期 ──────────────────────────────────────────────────
app.whenReady().then(async () => {
  // 1. 先启动 Python 后端
  startBackend();

  // 2. 等待后端就绪（最多 20 秒）
  console.log('[Electron] Waiting for backend on port', BACKEND_PORT, '...');
  try {
    await waitForPort(BACKEND_PORT);
    console.log('[Electron] Backend ready ✓');
  } catch {
    console.warn('[Electron] Backend did not respond in time; proceeding anyway');
  }

  // 3. 创建主窗口
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  killBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => killBackend());

// 确保进程退出时强制清理
process.on('exit',    killBackend);
process.on('SIGINT',  () => { killBackend(); process.exit(0); });
process.on('SIGTERM', () => { killBackend(); process.exit(0); });

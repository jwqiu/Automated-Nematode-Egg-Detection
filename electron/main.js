const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');

function isDev() {
  return !!process.env.VITE_DEV_SERVER_URL; // 开发期用 dev server
}

let win;
let backendProc; // 生产环境随应用启动的本地后端进程

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'), // 先留空壳
    },
  });

  if (isDev()) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL); // 如 http://localhost:5173
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // 加载打包后的前端静态文件
    // await win.loadFile(path.join(__dirname, '../frontend-dist/index.html'));
    await win.loadFile(path.join(__dirname, 'frontend-dist/index.html'));
  }
}

function startBackendInProd() {
  if (isDev()) return;
  const resources = process.resourcesPath;
  const exeName = process.platform === 'win32' ? 'egg-backend.exe' : 'egg-backend';
  const exePath = path.join(resources, 'backend', exeName);

  // 临时：把日志直接写到桌面，最容易找
  const logFile = path.join(app.getPath('home'), 'Desktop', 'backend.log');
  const log = fs.createWriteStream(logFile, { flags: 'a' });

  backendProc = spawn(exePath, ['--port', '5178'], { stdio: ['ignore', 'pipe', 'pipe'] });
  backendProc.stdout.on('data', d => log.write(d));
  backendProc.stderr.on('data', d => log.write(d));
  backendProc.on('error', err => log.write(`SPAWN ERROR: ${err.message}\n`)); // 关键：捕获启动失败
  backendProc.on('exit', code => { log.write(`\n[exit ${code}]\n`); backendProc = undefined; });
}

// app.whenReady().then(createWindow);
app.whenReady().then(() => { startBackendInProd(); createWindow(); });
// app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => {
  if (backendProc) { try { backendProc.kill(); } catch {} }
});
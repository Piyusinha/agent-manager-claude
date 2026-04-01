'use strict';

const { app, BrowserWindow, Tray, nativeImage, screen, Notification, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DEV_RENDERER_URL   = 'http://localhost:5174';
const PROD_RENDERER_PATH = path.join(__dirname, 'renderer', 'dist', 'index.html');
const SERVER_PORT = 3001;
const API_BASE    = `http://localhost:${SERVER_PORT}`;

let tray = null;
let win  = null;
let serverProcess = null;

// Track sessions we've already notified so we don't spam
const notifiedSessions = new Set();
// Track sessions we've already auto-shown the window for (don't re-open on every poll)
const autoShownSessions = new Set();
let alertPollTimer = null;

// ─── Tray icons ───────────────────────────────────────────────────────────────
function createTrayIcon(alert = false) {
  const iconFile = alert ? 'iconAlertTemplate.png' : 'iconTemplate.png';
  const iconPath = path.join(__dirname, 'assets', iconFile);
  const img = nativeImage.createFromPath(iconPath);
  img.setTemplateImage(!alert);   // alert icon is coloured, not a template
  return img;
}

function setTrayAlert(hasAlert) {
  if (!tray) return;
  tray.setImage(createTrayIcon(hasAlert));
  tray.setToolTip(hasAlert ? '⚠️ Agent needs your attention' : 'Agent Manager');
}

// ─── Express server ───────────────────────────────────────────────────────────
// Common node install locations to search when launched as a GUI app
const NODE_SEARCH_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
];

function resolveNode() {
  const { execSync } = require('child_process');
  try {
    return execSync('which node', { encoding: 'utf8' }).trim();
  } catch {
    for (const dir of NODE_SEARCH_PATHS) {
      const candidate = path.join(dir, 'node');
      try { require('fs').accessSync(candidate); return candidate; } catch {}
    }
    return 'node'; // fall back and hope PATH has it
  }
}

function startExpressServer() {
  const cwd = isDev
    ? path.join(__dirname, '..')
    : path.join(process.resourcesPath);

  const nodeBin = resolveNode();
  const extraPaths = NODE_SEARCH_PATHS.join(':');
  const env = {
    ...process.env,
    PORT: String(SERVER_PORT),
    PATH: `${extraPaths}:${process.env.PATH || ''}`,
  };

  serverProcess = spawn(nodeBin, ['server/index.js'], {
    cwd,
    shell: false,
    env,
  });

  serverProcess.stdout.on('data', (d) => console.log('[server]', d.toString().trim()));
  serverProcess.stderr.on('data', (d) => console.error('[server]', d.toString().trim()));
  serverProcess.on('exit', (code) => console.log('[server] exited with code', code));
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 430,
    height: 580,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    loadWithRetry(DEV_RENDERER_URL);
  } else {
    win.loadFile(PROD_RENDERER_PATH).catch((e) => console.error('[main]', e));
  }

  win.on('blur', () => {
    if (!win.webContents.isDevToolsOpened()) win.hide();
  });
}

function loadWithRetry(url, retriesLeft = 20, delayMs = 800) {
  win.loadURL(url).catch(() => {
    if (retriesLeft > 0) {
      setTimeout(() => loadWithRetry(url, retriesLeft - 1, delayMs), delayMs);
    } else {
      console.error(`[main] Could not load ${url} after all retries`);
    }
  });
}

// ─── Tray positioning ─────────────────────────────────────────────────────────
function positionWindowBelowTray() {
  const trayBounds = tray.getBounds();
  const winBounds  = win.getBounds();
  const display    = screen.getDisplayMatching(trayBounds);

  const rawX = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
  const y    = Math.round(trayBounds.y + trayBounds.height + 4);
  const minX = display.workArea.x;
  const maxX = display.workArea.x + display.workArea.width - winBounds.width;
  const x    = Math.min(Math.max(rawX, minX), maxX);

  win.setPosition(x, y, false);
}

function showWindow() {
  positionWindowBelowTray();
  // Ensure the popover appears above full-screen spaces without switching away
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'floating');
  win.show();
  win.focus();
}

function toggleWindow() {
  if (win.isVisible()) {
    win.hide();
  } else {
    showWindow();
  }
}

// ─── Agent alert polling ──────────────────────────────────────────────────────
const ALERT_STATUSES = new Set(['Waiting for permission']);

async function pollAgentAlerts() {
  try {
    const res  = await fetch(`${API_BASE}/api/agent-status`);
    const json = await res.json();
    if (!json.success) return;

    const agents   = json.data || [];
    const alerting = agents.filter((a) => ALERT_STATUSES.has(a.status));

    // Fire notifications for newly-alerting sessions
    for (const agent of alerting) {
      if (notifiedSessions.has(agent.sessionId)) continue;
      notifiedSessions.add(agent.sessionId);

      const isPermission = agent.status === 'Waiting for permission';
      const notif = new Notification({
        title: isPermission ? '🔐 Permission Required' : '💬 Agent Needs Input',
        body: `${agent.project || agent.sessionId} — ${agent.status}${agent.lastTool ? `\nTool: ${agent.lastTool}` : ''}`,
        silent: false,
      });

      notif.on('click', () => showWindow());
      notif.show();

      console.log(`[alert] ${agent.status} — ${agent.project}`);
    }

    // Clear notified/auto-shown sessions that are no longer alerting
    const alertIds = new Set(alerting.map((a) => a.sessionId));
    for (const id of notifiedSessions) {
      if (!alertIds.has(id)) notifiedSessions.delete(id);
    }
    for (const id of autoShownSessions) {
      if (!alertIds.has(id)) autoShownSessions.delete(id);
    }

    // Update tray icon
    setTrayAlert(alerting.length > 0);

    // Auto-pop window open only for NEW alerts (not ones we've already shown the window for)
    const newAlerts = alerting.filter((a) => !autoShownSessions.has(a.sessionId));
    for (const a of alerting) autoShownSessions.add(a.sessionId);
    if (newAlerts.length > 0 && !win.isVisible()) {
      showWindow();
    }
  } catch {
    // Server not ready yet — ignore silently
  }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  app.dock?.hide();
  startExpressServer();
  createWindow();

  tray = new Tray(createTrayIcon());
  tray.setToolTip('Agent Manager');
  tray.on('click', toggleWindow);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Agent Manager', click: showWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.on('right-click', () => tray.popUpContextMenu(contextMenu));

  // Start polling after a short delay to let the server boot
  setTimeout(() => {
    pollAgentAlerts();
    alertPollTimer = setInterval(pollAgentAlerts, 5000);
  }, 3000);
});

app.on('window-all-closed', (e) => e.preventDefault());

app.on('before-quit', () => {
  if (alertPollTimer) clearInterval(alertPollTimer);
  serverProcess?.kill();
});

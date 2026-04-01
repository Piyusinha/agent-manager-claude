# AGENTS.md — Agent Manager

Guidance for AI agents (Claude, etc.) working on this codebase.

---

## Project overview

Agent Manager is a macOS Electron tray application with two main components:

- **`desktop/`** — Electron + React (Vite) frontend
- **`server/`** — Express API server (spawned as a child process by Electron)

The app monitors Claude AI sessions by reading JSONL conversation logs and provides a live dashboard, permission management, and 3D visualization.

---

## Repository layout

```
agent-manager/
├── desktop/
│   ├── main.js            # Electron main process — single file, keep it that way
│   ├── preload.js         # Context bridge only — no business logic here
│   ├── assets/            # PNG tray icons (iconTemplate.png, iconAlertTemplate.png)
│   ├── package.json
│   └── renderer/
│       └── src/
│           ├── App.jsx
│           ├── hooks/useFetch.js
│           ├── api/client.js
│           ├── styles/
│           │   ├── global.css
│           │   └── tokens.css         ← ALL color/spacing tokens live here
│           └── components/
│               ├── Header/
│               ├── TabBar/
│               ├── SpawnModal/
│               └── tabs/
│                   ├── LiveTab/
│                   ├── PlaygroundTab/ ← Three.js — be careful with scene cleanup
│                   ├── AgentsTab/
│                   ├── CommandsTab/
│                   └── McpTab/
└── server/
    └── index.js           # All Express routes in a single file
```

---

## Coding conventions

### General
- No hardcoded color values anywhere in component files. All colors go through CSS variables in `tokens.css`.
- Desktop `tokens.css` is fixed **light** appearance (`color-scheme: light`); new tokens belong in `:root`, not per-scheme media blocks.
- No inline style objects with color literals (`rgba(28,28,30,...)`) — use `'var(--token-name)'`.
- Component files stay under ~400 lines. Extract helpers aggressively.
- Functions under 50 lines.

### Electron main process (`main.js`)
- Window is frameless, transparent, always-on-top tray popover.
- `vibrancy: 'under-window'` — do not change without understanding macOS compositor behavior.
- `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` must be called in `showWindow()` to avoid exiting full-screen spaces.
- Alert deduplication: `notifiedSessions` (OS notifications) and `autoShownSessions` (auto-open window) are both Sets that track session IDs. Clear entries when alerts resolve. Do NOT auto-show the window for already-seen sessions.
- Poll interval: 5000 ms after a 3000 ms startup delay. Do not increase poll frequency.

### Server (`server/index.js`)
- All routes in a single file — keep it that way unless it grows beyond ~700 lines.
- The JSONL parser reads the last 120 lines of each session file. Do not increase this without measuring performance.
- `MAX_AGE_MS = 60 * 60 * 1000` (1 hour) — sessions older than this are skipped. Agents waiting for permission can be idle for a long time; do not lower this threshold.
- Permission detection threshold: 8000 ms. Tool calls pending longer than 8 s are assumed to be awaiting user approval.
- TTY writes use `writeFileSync('/dev/<tty>', bytes)` — this is intentional; do not replace with shell `echo` (escaping issues).
- The `progress` wrapper entries in JSONL embed subagent messages — the parser intentionally ignores them. Only `type === 'assistant'` and `type === 'user'` direct entries are parsed to avoid stale subagent state leaking into parent status.

### React renderer
- `useFetch` polls at the specified interval. Don't add new `setInterval` calls in components.
- Tab components receive no props — they fetch their own data.
- `PlaygroundTab` owns a Three.js scene. Always clean up in the `useEffect` return (cancel RAF, dispose renderer, remove event listeners). The scene is rebuilt on every `agentData` change — dispose old meshes.
- Permission popup key must be `agent.sessionId` (not `sessionId + index`) so React doesn't remount when the list order changes.

---

## Key data flows

### Session status polling
```
Electron main.js (every 5 s)
  └─ GET /api/agent-status
      └─ server reads ~/.claude/projects/**/*.jsonl
          └─ returns [{ sessionId, project, cwd, status, lastTool, ... }]

React App.jsx (every 5 s)
  └─ GET /api/agent-status
      └─ Header stats + LiveTab rows + PlaygroundTab avatars
```

### Permission alert flow
```
server detects tool pending > 8 s
  └─ status = "Waiting for permission"

main.js poll sees new alerting session
  └─ fires macOS Notification (once per sessionId)
  └─ auto-opens window (once per sessionId)
  └─ sets tray alert icon

App.jsx sees alerting session
  └─ switches to PlaygroundTab (once per sessionId)

PlaygroundTab renders permission popup
  └─ camera animates to agent's desk slot (once per sessionId)

User clicks "Open Terminal"
  └─ POST /api/sessions/focus
      └─ AppleScript focuses Terminal tab
```

### Permission approval
```
User (in Terminal) sees Claude prompt → OR →
App sends POST /api/sessions/permission { cwd, approve: true/false }
  └─ server finds claude PID via ps + lsof
  └─ reads TTY from ps
  └─ writeFileSync('/dev/<tty>', approve ? '\r' : '\x1b[B\r')
  └─ Claude receives keypress and continues
```

---

## Adding a new tab

1. Create `renderer/src/components/tabs/YourTab/YourTab.jsx` and `YourTab.module.css`
2. Register in `App.jsx` TABS map: `yourTab: YourTab`
3. Add to `TabBar.jsx` tabs array with icon + label
4. Add any new server routes to `server/index.js`
5. Add client helper to `renderer/src/api/client.js`

---

## Adding a new agent status

1. Add the tool name → label/color mapping to `TOOL_STATUS` in `server/index.js`
2. Add the label → Three.js animation mapping to `STATUS_VIS` in `PlaygroundTab.jsx`

---

## Running locally

```bash
cd desktop
npm install
npm run dev         # Electron + Vite HMR
```

## Building

```bash
cd desktop
npm run build       # vite build + electron-builder --mac → dist/*.dmg
```

## Testing the server independently

```bash
PORT=3001 node server/index.js
curl http://localhost:3001/api/agent-status
curl http://localhost:3001/api/health
```

---

## Things to avoid

- Do not add `window.__electron` bridges for data — use the REST API instead.
- Do not use `ipcRenderer` / `ipcMain` for agent data — the HTTP API is intentional (decoupled, testable).
- Do not bump `preload.js` with new exposed functions unless absolutely necessary.
- Do not hardcode tray window dimensions in multiple places — `width: 430, height: 580` is set once in `main.js`.
- Do not modify `~/.claude.json` or JSONL files during read operations — the server is read-only except for MCP and skills endpoints.

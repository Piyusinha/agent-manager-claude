# Agent Manager

A macOS menu-bar app for monitoring and managing Claude AI agent sessions in real time. Built with Electron, React, Three.js, and an embedded Express server.

---

## What it does

Agent Manager lives in your macOS menu bar and gives you a live window into every Claude session running on your machine — what each agent is doing right now, when it needs your permission, and a 3D office visualization of all active agents.

### Core capabilities

| Capability | How |
|---|---|
| **Live session status** | Reads `~/.claude/projects/**/*.jsonl` every 5 s and infers agent state from the conversation log |
| **Permission alerts** | Detects when an agent is blocked on a tool call (>8 s with no result) → fires a macOS notification + opens the popup |
| **Approve / deny permissions** | Writes `\r` (approve) or `\x1b[B\r` (deny) directly to the agent's TTY device |
| **Focus terminal** | AppleScript: brings the Terminal tab running that agent to the front |
| **Spawn new session** | Opens `Terminal.app` with `claude` in any project directory |
| **3D office view** | Three.js scene with animated avatars at desks; camera auto-zooms to alerting agents |
| **Agents browser** | Lists all `~/.claude/agents/*.md` agent definitions |
| **Commands browser** | Lists all `~/.claude/commands/*.md` slash commands |
| **MCP manager** | Read / add / delete MCP servers from `~/.claude.json` |

---

## Architecture

```
agent-manager/
├── desktop/               # Electron app
│   ├── main.js            # Main process: window, tray, vibrancy, alert polling
│   ├── preload.js         # Context bridge (contextIsolation)
│   ├── assets/            # Tray icons (template + alert)
│   └── renderer/          # React SPA (Vite)
│       └── src/
│           ├── App.jsx                    # Tab router + permission auto-switch
│           ├── styles/tokens.css          # CSS variables — light/dark via prefers-color-scheme
│           ├── components/
│           │   ├── Header/                # Stats tiles (agents, commands, active count)
│           │   ├── TabBar/                # Tab navigation with badge
│           │   ├── SpawnModal/            # New session dialog
│           │   └── tabs/
│           │       ├── LiveTab/           # Real-time session list
│           │       ├── PlaygroundTab/     # Three.js 3D office
│           │       ├── AgentsTab/         # ~/.claude/agents browser
│           │       ├── CommandsTab/       # ~/.claude/commands browser
│           │       └── McpTab/            # MCP server manager
│           └── api/client.js              # HTTP helpers → Express server
└── server/
    └── index.js           # Express API on :3001
```

### How agent status is detected

The server reads the tail of each session's JSONL file (`~/.claude/projects/**/*.jsonl`) and applies a state machine:

```
assistant message has tool_use + no tool_result yet:
  └─ tool pending < 8 s  →  "<tool name>" (Reading file / Running command / etc.)
  └─ tool pending ≥ 8 s  →  "Waiting for permission"  ← triggers alert

assistant message has no tool_use (text reply):
  └─ "Waiting for input"

user message (tool result) arrived < 3 min ago:
  └─ "Thinking"

otherwise:
  └─ "Idle"
```

Subagents each have their own JSONL files and are tracked independently. The parser intentionally ignores `progress` wrapper entries (which embed subagent messages) to avoid showing stale state from nested agents in the parent's status.

### How permission approval works

When the user clicks "Approve" or "Deny" in the popup, the server:
1. Finds the `claude` process with matching `cwd` using `lsof`
2. Reads its TTY from `ps`
3. Writes bytes directly to `/dev/<tty>`:
   - Approve → `\r` (Enter — confirms the default "Yes" selection)
   - Deny → `\x1b[B\r` (Down arrow + Enter — selects "No")

This works because Claude's permission prompt is a TTY interactive list UI.

### macOS native appearance

The window uses Electron's `vibrancy: 'under-window'` material (the same macOS compositor layer used by native panels). CSS variables switch automatically via `@media (prefers-color-scheme: light/dark)` — no JS theme toggling, zero hardcoded colors.

---

## Prerequisites

- macOS 13+ (Ventura or later)
- Node.js 20+
- `claude` CLI installed and accessible in `PATH`
- Sessions must be running in `Terminal.app` (used for TTY interaction and focus)

---

## Development

```bash
# Install dependencies
cd desktop && npm install

# Start in dev mode (Electron + Vite HMR concurrently)
npm run dev
```

Vite serves the renderer at `http://localhost:5174`. The Electron main process loads from that URL in dev mode and falls back to the built `dist/index.html` in production.

The Express server starts automatically as a child process on port `3001`. In dev mode it runs from `../server/index.js` relative to the `desktop/` directory.

---

## Building the .dmg

```bash
cd desktop

# Build renderer + package into .dmg
npm run build
```

This runs `vite build` (outputs to `renderer/dist/`) then `electron-builder --mac` which produces:

```
desktop/dist/
└── Agent Manager-<version>-arm64.dmg   # Apple Silicon
└── Agent Manager-<version>.dmg         # Intel (if built on Intel)
```

The `.dmg` contains a signed/unsigned `.app` bundle. Drag it to `/Applications` to install.

> **Note:** First launch may require right-clicking → Open to bypass Gatekeeper (unsigned build).

---

## Distribution / install

1. Download `Agent Manager-<version>-arm64.dmg` from the [latest release](../../releases/latest)
2. Open the `.dmg` and drag `Agent Manager.app` to `/Applications`
3. Launch — the app appears in the menu bar only (no Dock icon)
4. Click the menu bar icon to open the panel

---

## API reference (local Express server)

The embedded server runs on `http://localhost:3001` and is only accessible locally.

| Method | Path | Description |
|---|---|---|
| GET | `/api/agent-status` | Live status for all active sessions (parsed from JSONL) |
| GET | `/api/agents` | Agent definitions from `~/.claude/agents/` |
| GET | `/api/commands` | Slash commands from `~/.claude/commands/` |
| GET | `/api/sessions` | Raw `ps aux` Claude processes |
| POST | `/api/sessions/spawn` | Open Terminal with `claude` in a directory |
| POST | `/api/sessions/permission` | Approve or deny a permission prompt via TTY |
| POST | `/api/sessions/focus` | Bring Terminal tab for session to front (AppleScript) |
| GET | `/api/mcp` | MCP servers from `~/.claude.json` |
| POST | `/api/mcp` | Add MCP server |
| DELETE | `/api/mcp/:name` | Remove MCP server |
| GET | `/api/skills` | Skills from `~/.claude/skills/` or `~/everything-claude-code/skills/` |
| GET | `/api/health` | Health check + uptime |

---

## Limitations & known issues

- Permission approve/deny requires the `claude` session to be running in `Terminal.app` (not iTerm2 or other terminals)
- TTY writes require the process to have an attached terminal (background/headless processes return an error)
- The 3D office supports up to 6 concurrent agents (one per desk slot)
- Subagent JSONL files older than 1 hour are skipped to avoid ghost sessions

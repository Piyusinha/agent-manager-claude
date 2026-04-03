import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { writeFileSync, unlinkSync, createReadStream } from 'fs';
import readline from 'readline';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { homedir } from 'os';

const app = express();
const PORT = 3001;
const HOME = homedir();

function npmGlobalNodeModules() {
  try {
    const root = execSync('npm root -g', { encoding: 'utf8', timeout: 5000 }).trim();
    if (root) return root;
  } catch { /* npm not on PATH or failed */ }
  return path.join(HOME, 'node_modules');
}

app.use(cors());
app.use(express.json());

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim().replace(/^"|"$/g, '');
  }
  return { meta, body: content.slice(match[0].length).trim() };
}

async function readMarkdownDir(dir) {
  try {
    const files = await fs.readdir(dir);
    const items = [];
    for (const file of files.filter(f => f.endsWith('.md'))) {
      const content = await fs.readFile(path.join(dir, file), 'utf8');
      const { meta, body } = parseFrontmatter(content);
      items.push({
        id: file.replace('.md', ''),
        name: meta.name || file.replace('.md', ''),
        description: meta.description || body.split('\n').find(l => l.trim()) || '',
        model: meta.model || 'sonnet',
        tools: meta.tools || [],
        body: body.slice(0, 300) + (body.length > 300 ? '…' : ''),
        file,
      });
    }
    return items;
  } catch {
    return [];
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/agents
app.get('/api/agents', async (_req, res) => {
  const agents = await readMarkdownDir(path.join(HOME, '.claude/agents'));
  res.json({ success: true, data: agents, count: agents.length });
});

// GET /api/agents/:id
app.get('/api/agents/:id', async (req, res) => {
  const file = path.join(HOME, '.claude/agents', `${req.params.id}.md`);
  try {
    const content = await fs.readFile(file, 'utf8');
    const { meta, body } = parseFrontmatter(content);
    res.json({ success: true, data: { id: req.params.id, ...meta, body } });
  } catch {
    res.status(404).json({ success: false, error: 'Agent not found' });
  }
});

// GET /api/commands
app.get('/api/commands', async (_req, res) => {
  const commands = await readMarkdownDir(path.join(HOME, '.claude/commands'));
  res.json({ success: true, data: commands, count: commands.length });
});

// GET /api/sessions - running Claude processes
app.get('/api/sessions', (_req, res) => {
  try {
    const raw = execSync(
      "ps aux | grep -E 'claude' | grep -v grep | grep -v 'agent-manager'",
      { encoding: 'utf8', timeout: 5000 }
    );
    const sessions = raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const cols = line.trim().split(/\s+/);
        return {
          pid: cols[1],
          cpu: cols[2],
          mem: cols[3],
          started: cols[8],
          time: cols[9],
          cmd: cols.slice(10).join(' ').slice(0, 120),
        };
      });
    res.json({ success: true, data: sessions, count: sessions.length });
  } catch {
    res.json({ success: true, data: [], count: 0 });
  }
});

// GET /api/skills - from everything-claude-code if it exists
app.get('/api/skills', async (_req, res) => {
  const dirs = [
    path.join(HOME, 'everything-claude-code/skills'),
    path.join(HOME, '.claude/skills'),
  ];
  let skills = [];
  for (const dir of dirs) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skill = { id: entry.name, name: entry.name, source: dir };
          // Try to read a README or index
          for (const f of ['README.md', 'SKILL.md', 'index.md']) {
            try {
              const content = await fs.readFile(path.join(dir, entry.name, f), 'utf8');
              skill.description = content.split('\n').find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || entry.name;
              break;
            } catch { /* skip */ }
          }
          skills.push(skill);
        }
      }
    } catch { /* dir not found */ }
  }
  res.json({ success: true, data: skills, count: skills.length });
});

// GET /api/config - Claude npm package versions (global install, read-only)
app.get('/api/config', async (_req, res) => {
  const info = {};
  const nmBase = npmGlobalNodeModules();
  for (const [key, pkg] of [
    ['claudeVersion', '@anthropic-ai/claude-code'],
    ['agentSdkVersion', '@anthropic-ai/claude-agent-sdk'],
    ['acpVersion', '@agentclientprotocol/sdk'],
  ]) {
    try {
      const p = JSON.parse(await fs.readFile(path.join(nmBase, pkg, 'package.json'), 'utf8'));
      info[key] = p.version || 'unknown';
    } catch { info[key] = 'unknown'; }
  }
  res.json({ success: true, data: info });
});

// GET /api/logs - recent logs from ~/.claude/logs if present
app.get('/api/logs', async (_req, res) => {
  const logDir = path.join(HOME, '.claude', 'logs');
  try {
    const st = await fs.stat(logDir);
    if (!st.isDirectory()) {
      res.json({ success: true, data: [] });
      return;
    }
    const raw = execSync(
      `ls -t "${logDir}"/*.log 2>/dev/null | head -3 | xargs tail -n 50 2>/dev/null || true`,
      { encoding: 'utf8', timeout: 5000 }
    );
    res.json({ success: true, data: raw.split('\n').filter(Boolean).slice(-100) });
  } catch {
    res.json({ success: true, data: [] });
  }
});

// ── Agent Status ─────────────────────────────────────────────────────────────

const TOOL_STATUS = {
  Read:         { label: 'Reading file',      color: '#61afef', icon: '📖' },
  Glob:         { label: 'Searching files',   color: '#61afef', icon: '🔍' },
  Grep:         { label: 'Searching code',    color: '#61afef', icon: '🔍' },
  Edit:         { label: 'Editing code',      color: '#98c379', icon: '✏️' },
  Write:        { label: 'Writing file',      color: '#98c379', icon: '✏️' },
  NotebookEdit: { label: 'Editing notebook',  color: '#98c379', icon: '📓' },
  Bash:         { label: 'Running command',   color: '#e5c07b', icon: '⚙️' },
  WebFetch:     { label: 'Reading docs',      color: '#c678dd', icon: '🌐' },
  WebSearch:    { label: 'Browsing web',      color: '#c678dd', icon: '🌐' },
  Task:         { label: 'Spawning agent',    color: '#e06c75', icon: '🤖' },
  TaskCreate:   { label: 'Planning',          color: '#56b6c2', icon: '📋' },
  TaskUpdate:   { label: 'Planning',          color: '#56b6c2', icon: '📋' },
  TaskList:     { label: 'Planning',          color: '#56b6c2', icon: '📋' },
  TaskGet:      { label: 'Planning',          color: '#56b6c2', icon: '📋' },
  ToolSearch:   { label: 'Loading tool',      color: '#56b6c2', icon: '🔧' },
};

function toolStatus(name) {
  return TOOL_STATUS[name] || { label: name || 'Working', color: '#abb2bf', icon: '⚡' };
}

async function findJsonlFiles(dir, depth = 0) {
  const files = [];
  if (depth > 3) return files;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) files.push(...await findJsonlFiles(full, depth + 1));
      else if (e.isFile() && e.name.endsWith('.jsonl')) files.push(full);
    }
  } catch {}
  return files;
}

function bashSingleQuoted(s) {
  return `'${String(s).replace(/'/g, "'\\''")}'`;
}

function jsonlContentToPlainText(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && typeof part.text === 'string') return part.text;
      return '';
    })
    .join('')
    .trim();
}

function jsonlLineIsUser(obj) {
  if (obj.type === 'user') return true;
  if (obj.role === 'user') return true;
  if (obj.message?.role === 'user') return true;
  return false;
}

async function scanJsonlHeadForMeta(filePath, maxLines = 400) {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNum = 0;
  let cwd = null;
  let title = null;
  try {
    for await (const line of rl) {
      lineNum++;
      if (lineNum > maxLines) break;
      if (!line.trim()) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      if (obj.cwd && !cwd) cwd = obj.cwd;
      if (!title && jsonlLineIsUser(obj)) {
        const raw = jsonlContentToPlainText(obj.message?.content ?? obj.content);
        if (raw) {
          const t = raw.replace(/\s+/g, ' ').trim();
          if (t) title = t.length > 100 ? `${t.slice(0, 100)}…` : t;
        }
      }
      if (cwd && title) break;
    }
  } finally {
    rl.close();
    stream.destroy();
  }
  return { cwd, title };
}

// GET /api/session-past — archived JSONL sessions (title + resume)
app.get('/api/session-past', async (_req, res) => {
  const projectsDir = path.join(HOME, '.claude/projects');
  const sub = `${path.sep}subagents${path.sep}`;
  const allFiles = (await findJsonlFiles(projectsDir)).filter((f) => !f.includes(sub));

  const withStat = await Promise.all(
    allFiles.map(async (filePath) => {
      try {
        const stat = await fs.stat(filePath);
        return { filePath, mtimeMs: stat.mtimeMs };
      } catch {
        return null;
      }
    }),
  );
  const sorted = withStat
    .filter(Boolean)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, 300);

  const BATCH = 12;
  const rows = [];
  for (let i = 0; i < sorted.length; i += BATCH) {
    const chunk = sorted.slice(i, i + BATCH);
    const part = await Promise.all(
      chunk.map(async ({ filePath, mtimeMs }) => {
        const sessionId = path.basename(filePath, '.jsonl');
        const { cwd, title } = await scanJsonlHeadForMeta(filePath);
        return {
          sessionId,
          cwd,
          project: cwd ? path.basename(cwd) : path.basename(path.dirname(filePath)),
          lastActiveMs: mtimeMs,
          title: title || '(No first user message)',
        };
      }),
    );
    rows.push(...part);
  }

  rows.sort((a, b) => b.lastActiveMs - a.lastActiveMs);
  res.json({ success: true, data: rows });
});

// GET /api/agent-status - live status parsed from JSONL logs
app.get('/api/agent-status', async (_req, res) => {
  const projectsDir = path.join(HOME, '.claude/projects');
  const sessions = [];
  const now = Date.now();
  const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour — agent could be waiting for permission/input a long time

  const allFiles = await findJsonlFiles(projectsDir);

  for (const filePath of allFiles) {
    try {
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs > MAX_AGE_MS) continue; // skip very old files

      const raw = await fs.readFile(filePath, 'utf8');
      const lines = raw.trim().split('\n').filter(Boolean).slice(-120);

      let sessionId = null, cwd = null, gitBranch = null;
      let lastEventTime = null;
      // lastAssistant: most recent assistant entry
      let lastAssistant = null; // { hasTools, toolName, time }
      // lastUser: most recent user entry
      let lastUser = null;      // { isToolResult, time }

      function parseAssistantEntry(content, time) {
        const arr = Array.isArray(content) ? content : [];
        const uses = arr.filter(c => c.type === 'tool_use');
        lastAssistant = {
          hasTools: uses.length > 0,
          toolName: uses.length > 0 ? uses[uses.length - 1].name : null,
          time,
        };
      }

      function parseUserEntry(content, time) {
        const arr = Array.isArray(content) ? content : [];
        lastUser = {
          isToolResult: arr.some(c => c.type === 'tool_result'),
          time,
        };
      }

      for (const line of lines) {
        let obj;
        try { obj = JSON.parse(line); } catch { continue; }

        if (obj.sessionId && !sessionId) sessionId = obj.sessionId;
        if (obj.cwd && !cwd) cwd = obj.cwd;
        if (obj.gitBranch && !gitBranch) gitBranch = obj.gitBranch;

        const ts = obj.timestamp || obj.message?.timestamp;
        if (ts) lastEventTime = ts;

        // Only parse direct assistant/user entries — NOT progress entries.
        // Progress entries wrap subagent messages and would corrupt lastAssistant/lastUser
        // with stale subagent state. Subagents have their own JSONL files and are
        // handled separately by findJsonlFiles.
        if (obj.type === 'assistant') {
          parseAssistantEntry(obj.message?.content, obj.timestamp);
        }

        if (obj.type === 'user') {
          parseUserEntry(obj.message?.content, obj.timestamp);
        }
      }

      if (!sessionId) continue;

      const idleMs = lastEventTime ? now - new Date(lastEventTime).getTime() : Infinity;
      let status, statusColor, statusIcon;

      const assistantMs = lastAssistant?.time ? new Date(lastAssistant.time).getTime() : 0;
      const userMs      = lastUser?.time      ? new Date(lastUser.time).getTime()      : 0;

      // IMPORTANT: check conversation state BEFORE idle — an agent waiting for
      // permission or human input can be silent for hours and must NOT show as Idle.
      if (assistantMs >= userMs && lastAssistant?.hasTools) {
        // Agent called a tool, no result yet
        const toolAgeMs = now - assistantMs;
        if (toolAgeMs > 8000) {
          // Still no result after 8s — user hasn't approved the permission prompt yet
          status = 'Waiting for permission'; statusColor = '#e06c75'; statusIcon = '🔐';
        } else {
          const s = toolStatus(lastAssistant.toolName);
          status = s.label; statusColor = s.color; statusIcon = s.icon;
        }
      } else if (assistantMs >= userMs && lastAssistant && !lastAssistant.hasTools) {
        // Agent sent a text-only reply — waiting for human to respond
        status = 'Waiting for input'; statusColor = '#e5c07b'; statusIcon = '⏳';
      } else if (userMs > assistantMs && idleMs < 3 * 60 * 1000) {
        // Human or tool result arrived recently — agent is actively processing
        if (lastUser?.isToolResult) {
          const s = toolStatus(lastAssistant?.toolName);
          status = s.label; statusColor = s.color; statusIcon = s.icon;
        } else {
          status = 'Thinking'; statusColor = '#abb2bf'; statusIcon = '💭';
        }
      } else {
        status = 'Idle'; statusColor = '#5c6370'; statusIcon = '💤';
      }

      sessions.push({
        sessionId: sessionId.slice(0, 8),
        project: cwd ? path.basename(cwd) : path.basename(path.dirname(filePath)),
        cwd,
        branch: gitBranch,
        status,
        statusColor,
        statusIcon,
        lastTool: lastAssistant?.toolName ?? null,
        lastActivity: lastEventTime,
        isSubagent: filePath.includes('/subagents/'),
        idleSec: Math.floor(idleMs / 1000),
      });
    } catch { }
  }

  res.json({ success: true, data: sessions });
});

// POST /api/sessions/permission — approve or deny a waiting permission prompt
app.post('/api/sessions/permission', (req, res) => {
  const { cwd, approve } = req.body;
  if (!cwd) return res.status(400).json({ success: false, error: 'cwd required' });

  try {
    // Find all claude processes
    const psOut = execSync(
      "ps aux | grep -E '[c]laude' | grep -v 'agent-manager'",
      { encoding: 'utf8', timeout: 5000 }
    );

    const pids = psOut.trim().split('\n').filter(Boolean).map(l => l.trim().split(/\s+/)[1]);

    // Match process to cwd using lsof
    let targetPid = null;
    for (const pid of pids) {
      try {
        const procCwd = execSync(
          `lsof -p ${pid} -a -d cwd -F n 2>/dev/null | grep '^n' | head -1`,
          { encoding: 'utf8', timeout: 3000 }
        ).trim().replace(/^n/, '');

        if (procCwd === cwd || procCwd.endsWith(path.basename(cwd))) {
          targetPid = pid;
          break;
        }
      } catch { /* skip */ }
    }

    if (!targetPid) {
      return res.status(404).json({ success: false, error: 'Claude process not found for this project' });
    }

    // Get the TTY of the process
    const tty = execSync(`ps -p ${targetPid} -o tty= 2>/dev/null`, { encoding: 'utf8' }).trim();
    if (!tty || tty === '??') {
      return res.status(400).json({ success: false, error: 'Process has no TTY — cannot send input' });
    }

    // Claude's permission prompt is an interactive list UI.
    // Write bytes directly to the TTY device using Node's fs (avoids shell escaping issues).
    // Yes is the default (option 1) → Enter confirms it.
    // No is option 2 → Down arrow then Enter.
    const bytes = approve
      ? Buffer.from('\r')                   // Enter — confirms highlighted "Yes"
      : Buffer.from('\x1b[B\r');            // Down arrow + Enter → selects "No"
    writeFileSync(`/dev/${tty}`, bytes);

    console.log(`[permission] ${approve ? 'APPROVED' : 'DENIED'} for ${cwd} (pid=${targetPid}, tty=${tty})`);
    res.json({ success: true, pid: targetPid, tty });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/sessions/focus — bring the Terminal window for a given cwd to the front
app.post('/api/sessions/focus', (req, res) => {
  const { cwd } = req.body;
  if (!cwd) return res.status(400).json({ success: false, error: 'cwd required' });

  try {
    // Find the TTY of the Claude process in this cwd
    const psOut = execSync("ps aux | grep -E '[c]laude' | grep -v 'agent-manager'", { encoding: 'utf8' });
    const pids = psOut.trim().split('\n').filter(Boolean).map(l => l.trim().split(/\s+/)[1]);

    let tty = null;
    for (const pid of pids) {
      try {
        const procCwd = execSync(`lsof -p ${pid} -a -d cwd -F n 2>/dev/null | grep '^n' | head -1`, { encoding: 'utf8' }).trim().replace(/^n/, '');
        if (procCwd === cwd || procCwd.endsWith(path.basename(cwd))) {
          tty = execSync(`ps -p ${pid} -o tty= 2>/dev/null`, { encoding: 'utf8' }).trim();
          if (tty && tty !== '??') break;
        }
      } catch { /* skip */ }
    }

    if (!tty) return res.status(404).json({ success: false, error: 'Terminal not found' });

    // Use AppleScript to focus the Terminal tab with this TTY
    // Write to temp file to avoid shell quoting issues
    const script = `tell application "Terminal"
  activate
  repeat with w in windows
    try
      repeat with t in tabs of w
        if tty of t is "/dev/${tty}" then
          set selected tab of w to t
          set frontmost of w to true
          return
        end if
      end repeat
    end try
  end repeat
end tell`;
    const tmpScript = `/tmp/focus-terminal-${Date.now()}.scpt`;
    writeFileSync(tmpScript, script);
    try {
      execSync(`osascript ${tmpScript}`, { timeout: 5000 });
    } finally {
      unlinkSync(tmpScript);
    }
    res.json({ success: true, tty });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/sessions/:pid — kill a Claude process
app.delete('/api/sessions/:pid', (req, res) => {
  const pid = parseInt(req.params.pid, 10);
  if (!pid || isNaN(pid)) return res.status(400).json({ success: false, error: 'Invalid PID' });
  try {
    process.kill(pid, 'SIGTERM');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/sessions/spawn — open Terminal.app with claude in a directory
app.post('/api/sessions/spawn', (req, res) => {
  const { cwd, prompt, resumeSessionId } = req.body;
  if (!cwd) return res.status(400).json({ success: false, error: 'cwd is required' });
  try {
    let claudeCmd;
    if (resumeSessionId) {
      claudeCmd = `cd ${bashSingleQuoted(cwd)} && claude --resume ${bashSingleQuoted(resumeSessionId)}`;
    } else if (prompt) {
      claudeCmd = `cd '${cwd}' && claude --print '${prompt.replace(/'/g, "\\'")}'`;
    } else {
      claudeCmd = `cd '${cwd}' && claude`;
    }
    const child = spawn('osascript', [
      '-e',
      `tell application "Terminal" to do script "${claudeCmd.replace(/"/g, '\\"')}"`,
    ], { detached: true, stdio: 'ignore' });
    child.unref();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── MCP Servers ───────────────────────────────────────────────────────────────

async function readClaudeJson() {
  return JSON.parse(await fs.readFile(path.join(HOME, '.claude.json'), 'utf8'));
}
async function writeClaudeJson(data) {
  await fs.writeFile(path.join(HOME, '.claude.json'), JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/mcp
app.get('/api/mcp', async (_req, res) => {
  try {
    const cfg = await readClaudeJson();
    const servers = cfg.mcpServers || {};
    res.json({ success: true, data: servers });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/mcp/:name — update a server
app.put('/api/mcp/:name', async (req, res) => {
  try {
    const cfg = await readClaudeJson();
    cfg.mcpServers = cfg.mcpServers || {};
    cfg.mcpServers[req.params.name] = req.body;
    await writeClaudeJson(cfg);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/mcp — add new server
app.post('/api/mcp', async (req, res) => {
  const { name, ...serverConfig } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  try {
    const cfg = await readClaudeJson();
    cfg.mcpServers = cfg.mcpServers || {};
    if (cfg.mcpServers[name]) return res.status(409).json({ success: false, error: 'Server already exists' });
    cfg.mcpServers[name] = serverConfig;
    await writeClaudeJson(cfg);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/mcp/:name
app.delete('/api/mcp/:name', async (req, res) => {
  try {
    const cfg = await readClaudeJson();
    delete (cfg.mcpServers || {})[req.params.name];
    await writeClaudeJson(cfg);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Skills CRUD ───────────────────────────────────────────────────────────────

async function getSkillsDir() {
  for (const dir of [
    path.join(HOME, 'everything-claude-code/skills'),
    path.join(HOME, '.claude/skills'),
  ]) {
    try { await fs.access(dir); return dir; } catch {}
  }
  return null;
}

// GET /api/skills/:id — full content
app.get('/api/skills/:id', async (req, res) => {
  const dir = await getSkillsDir();
  if (!dir) return res.status(404).json({ success: false, error: 'Skills directory not found' });
  const skillDir = path.join(dir, req.params.id);
  for (const f of ['SKILL.md', 'README.md', 'index.md']) {
    try {
      const content = await fs.readFile(path.join(skillDir, f), 'utf8');
      res.json({ success: true, data: { id: req.params.id, file: f, content } });
      return;
    } catch {}
  }
  res.status(404).json({ success: false, error: 'Skill file not found' });
});

// PUT /api/skills/:id — update
app.put('/api/skills/:id', async (req, res) => {
  const dir = await getSkillsDir();
  if (!dir) return res.status(404).json({ success: false, error: 'Skills directory not found' });
  const { content, file = 'SKILL.md' } = req.body;
  try {
    await fs.writeFile(path.join(dir, req.params.id, file), content, 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/skills — create
app.post('/api/skills', async (req, res) => {
  const baseDir = (await getSkillsDir()) || path.join(HOME, '.claude/skills');
  const { name, content } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  try {
    const skillDir = path.join(baseDir, name);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), content || `# ${name}\n\n`, 'utf8');
    res.json({ success: true, data: { id: name } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/skills/:id
app.delete('/api/skills/:id', async (req, res) => {
  const dir = await getSkillsDir();
  if (!dir) return res.status(404).json({ success: false, error: 'Skills directory not found' });
  try {
    await fs.rm(path.join(dir, req.params.id), { recursive: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Agent Manager API running at http://localhost:${PORT}`);
});

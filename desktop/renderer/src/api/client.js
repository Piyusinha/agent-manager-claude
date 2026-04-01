const BASE = 'http://localhost:3001';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}

const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const fetchAgents      = () => req('/api/agents');
export const fetchCommands    = () => req('/api/commands');
export const fetchSessions    = () => req('/api/sessions');
export const fetchAgentStatus = () => req('/api/agent-status');
export const fetchMcp         = () => req('/api/mcp');
export const fetchConfig      = () => req('/api/config');

export const spawnSession      = (body)          => req('/api/sessions/spawn', json(body));
export const sendPermission    = (cwd, approve)  => req('/api/sessions/permission', json({ cwd, approve }));
export const focusTerminal     = (cwd)           => req('/api/sessions/focus', json({ cwd }));
export const killSession  = (pid)   => req(`/api/sessions/${pid}`, { method: 'DELETE' });
export const addMcp       = (body)  => req('/api/mcp', json(body));
export const deleteMcp    = (name)  => req(`/api/mcp/${encodeURIComponent(name)}`, { method: 'DELETE' });

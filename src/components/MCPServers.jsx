import React, { useState, useCallback } from 'react';
import { Card, Badge, Spinner, ErrorMsg } from './Card.jsx';
import { useFetch } from '../hooks/useFetch.js';

const TYPE_COLOR = { stdio: 'var(--accent)', http: 'var(--green)', sse: 'var(--yellow)' };

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 28, width: 600, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EnvEditor({ env, onChange }) {
  const pairs = Object.entries(env || {});

  function update(idx, key, val) {
    const next = [...pairs];
    next[idx] = [key, val];
    onChange(Object.fromEntries(next));
  }
  function remove(idx) {
    const next = pairs.filter((_, i) => i !== idx);
    onChange(Object.fromEntries(next));
  }
  function add() {
    onChange({ ...env, '': '' });
  }

  return (
    <div>
      {pairs.map(([k, v], i) => {
        const isSensitive = /token|secret|password|key|api/i.test(k);
        return (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <input
              value={k}
              onChange={e => update(i, e.target.value, v)}
              placeholder="VAR_NAME"
              style={{ flex: '0 0 160px', fontFamily: 'var(--mono)', fontSize: 12 }}
            />
            <input
              value={v}
              onChange={e => update(i, k, e.target.value)}
              type={isSensitive ? 'password' : 'text'}
              placeholder="value"
              style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}
            />
            <button onClick={() => remove(i)} style={{
              background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
            }}>✕</button>
          </div>
        );
      })}
      <button onClick={add} style={{
        background: 'none', border: '1px dashed var(--border)', borderRadius: 6,
        color: 'var(--text3)', padding: '4px 12px', cursor: 'pointer', fontSize: 12, marginTop: 4,
      }}>+ Add variable</button>
    </div>
  );
}

function ServerForm({ initial, onSave, onCancel, isNew }) {
  const [name, setName]     = useState(initial?.name || '');
  const [type, setType]     = useState(initial?.type || 'stdio');
  const [command, setCmd]   = useState(initial?.command || '');
  const [args, setArgs]     = useState((initial?.args || []).join('\n'));
  const [url, setUrl]       = useState(initial?.url || '');
  const [env, setEnv]       = useState(initial?.env || {});
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState(null);

  async function handleSave() {
    if (!name.trim()) return setErr('Name is required');
    setSaving(true); setErr(null);
    const server = {
      type,
      ...(type === 'stdio' ? {
        command,
        args: args.split('\n').map(s => s.trim()).filter(Boolean),
        env,
      } : { url, env }),
    };
    try {
      const method = isNew ? 'POST' : 'PUT';
      const endpoint = isNew ? '/api/mcp' : `/api/mcp/${initial.name}`;
      const body = isNew ? { name: name.trim(), ...server } : server;
      const res = await fetch(endpoint, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      onSave();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const label = s => <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>{s}</label>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {isNew && (
        <div>
          {label('Server Name *')}
          <input value={name} onChange={e => setName(e.target.value)} placeholder="my-server" style={{ width: '100%', boxSizing: 'border-box' }} autoFocus />
        </div>
      )}
      <div>
        {label('Type')}
        <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
          <option value="stdio">stdio</option>
          <option value="http">http</option>
          <option value="sse">sse</option>
        </select>
      </div>
      {type === 'stdio' ? (
        <>
          <div>
            {label('Command')}
            <input value={command} onChange={e => setCmd(e.target.value)} placeholder="/usr/bin/node" style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--mono)' }} />
          </div>
          <div>
            {label('Arguments (one per line)')}
            <textarea value={args} onChange={e => setArgs(e.target.value)} rows={4} placeholder="-y&#10;@some/package" style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical' }} />
          </div>
        </>
      ) : (
        <div>
          {label('URL')}
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--mono)' }} />
        </div>
      )}
      <div>
        {label('Environment Variables')}
        <EnvEditor env={env} onChange={setEnv} />
      </div>
      {err && <div style={{ color: 'var(--red)', fontSize: 12 }}>⚠ {err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
        <button onClick={onCancel} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : isNew ? '✓ Add Server' : '✓ Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default function MCPServers() {
  const { data, loading, error, refetch } = useFetch('/api/mcp');
  const [editing, setEditing]   = useState(null);  // server name being edited
  const [addOpen, setAddOpen]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch]     = useState('');

  const servers = data ? Object.entries(data) : [];
  const filtered = servers.filter(([n]) => n.toLowerCase().includes(search.toLowerCase()));

  async function deleteServer(name) {
    setDeleting(name);
    try {
      const res = await fetch(`/api/mcp/${name}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      refetch();
    } catch (e) {
      alert('Delete failed: ' + e.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 22 }}>
          MCP Servers <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 400 }}>({filtered.length})</span>
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 160 }} />
          <button onClick={() => setAddOpen(true)} style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 7, padding: '7px 16px', fontWeight: 600, cursor: 'pointer',
          }}>＋ Add Server</button>
          <button onClick={refetch} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 14px', cursor: 'pointer' }}>↻</button>
        </div>
      </div>

      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(([name, cfg]) => {
            const envCount = Object.keys(cfg.env || {}).length;
            const argCount = (cfg.args || []).length;
            return (
              <Card key={name} style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{name}</div>
                    <Badge color={TYPE_COLOR[cfg.type] || 'var(--text3)'}>{cfg.type || 'stdio'}</Badge>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditing(name)} style={{
                      background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)',
                      borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer',
                    }}>Edit</button>
                    <button onClick={() => deleteServer(name)} disabled={deleting === name} style={{
                      background: 'none', color: 'var(--red)', border: '1px solid var(--red)',
                      borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                    }}>{deleting === name ? '…' : '✕'}</button>
                  </div>
                </div>

                {cfg.command && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cfg.command}
                  </div>
                )}
                {cfg.url && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cfg.url}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {argCount > 0 && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{argCount} args</span>}
                  {envCount > 0 && <span style={{ fontSize: 10, color: 'var(--yellow)' }}>{envCount} env vars</span>}
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40, gridColumn: '1/-1' }}>
              No MCP servers configured.
            </div>
          )}
        </div>
      )}

      {editing && data?.[editing] && (
        <Modal title={`Edit: ${editing}`} onClose={() => setEditing(null)}>
          <ServerForm
            initial={{ name: editing, ...data[editing] }}
            onSave={() => { setEditing(null); refetch(); }}
            onCancel={() => setEditing(null)}
            isNew={false}
          />
        </Modal>
      )}

      {addOpen && (
        <Modal title="Add MCP Server" onClose={() => setAddOpen(false)}>
          <ServerForm
            initial={null}
            onSave={() => { setAddOpen(false); refetch(); }}
            onCancel={() => setAddOpen(false)}
            isNew
          />
        </Modal>
      )}
    </div>
  );
}

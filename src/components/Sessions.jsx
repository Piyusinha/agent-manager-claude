import React, { useState } from 'react';
import { Card, Spinner, ErrorMsg } from './Card.jsx';
import { useFetch } from '../hooks/useFetch.js';

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 28, minWidth: 440, maxWidth: 580, width: '90%',
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

export default function Sessions() {
  const { data: sessions, loading, error, refetch } = useFetch('/api/sessions', { interval: 5000 });
  const [killing, setKilling]     = useState(null);   // pid being killed
  const [spawnOpen, setSpawnOpen] = useState(false);
  const [spawnCwd, setSpawnCwd]   = useState('');
  const [spawnPrompt, setSpawnPrompt] = useState('');
  const [spawnLoading, setSpawnLoading] = useState(false);
  const [spawnMsg, setSpawnMsg]   = useState(null);
  const [confirmPid, setConfirmPid] = useState(null); // pid awaiting kill confirm

  async function killProcess(pid) {
    setKilling(pid);
    try {
      const res = await fetch(`/api/sessions/${pid}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setTimeout(refetch, 800);
    } catch (e) {
      alert('Kill failed: ' + e.message);
    } finally {
      setKilling(null);
      setConfirmPid(null);
    }
  }

  async function spawnAgent() {
    if (!spawnCwd.trim()) return;
    setSpawnLoading(true);
    setSpawnMsg(null);
    try {
      const res = await fetch('/api/sessions/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd: spawnCwd.trim(), prompt: spawnPrompt.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSpawnMsg({ type: 'ok', text: 'Terminal opened with Claude!' });
      setTimeout(() => { setSpawnOpen(false); setSpawnMsg(null); setSpawnCwd(''); setSpawnPrompt(''); refetch(); }, 1800);
    } catch (e) {
      setSpawnMsg({ type: 'err', text: e.message });
    } finally {
      setSpawnLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 22 }}>
          Sessions
          {sessions && <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>({sessions.length})</span>}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setSpawnOpen(true)} style={{
            background: 'var(--accent)', color: '#fff',
            padding: '7px 16px', border: 'none', borderRadius: 7, fontWeight: 600, cursor: 'pointer',
          }}>
            ＋ New Agent
          </button>
          <button onClick={refetch} style={{
            background: 'var(--surface2)', color: 'var(--text2)',
            padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer',
          }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <Card>
        {loading ? <Spinner /> : error ? <ErrorMsg msg={error} /> : sessions?.length === 0 ? (
          <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40, fontSize: 15 }}>
            No active Claude / devbox processes found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--text3)' }}>
                  {['PID', 'CPU%', 'MEM%', 'Started', 'Time', 'Command', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '8px 10px',
                      borderBottom: '1px solid var(--border)',
                      fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 11,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions?.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', color: 'var(--yellow)' }}>{s.pid}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', color: parseFloat(s.cpu) > 50 ? 'var(--red)' : 'var(--text2)' }}>{s.cpu}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)' }}>{s.mem}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{s.started}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{s.time}</td>
                    <td style={{ padding: '8px 10px', maxWidth: 440, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                      {s.cmd}
                    </td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      {confirmPid === s.pid ? (
                        <span style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => killProcess(s.pid)} disabled={killing === s.pid} style={{
                            background: 'var(--red)', color: '#fff', border: 'none',
                            borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
                          }}>
                            {killing === s.pid ? '…' : 'Confirm'}
                          </button>
                          <button onClick={() => setConfirmPid(null)} style={{
                            background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)',
                            borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                          }}>Cancel</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmPid(s.pid)} style={{
                          background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)',
                          borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                        }}>
                          ✕ Kill
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {spawnOpen && (
        <Modal title="🚀 Spawn New Agent" onClose={() => { setSpawnOpen(false); setSpawnMsg(null); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Project Directory *</label>
              <input
                value={spawnCwd}
                onChange={e => setSpawnCwd(e.target.value)}
                placeholder="/Users/you/projects/my-app"
                style={{ width: '100%', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Initial Prompt (optional)</label>
              <textarea
                value={spawnPrompt}
                onChange={e => setSpawnPrompt(e.target.value)}
                placeholder="e.g. Review the codebase and suggest improvements…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', borderRadius: 6, padding: '8px 12px' }}>
              Opens Terminal.app with <code style={{ fontFamily: 'var(--mono)' }}>claude</code> running in the given directory.
            </div>
            {spawnMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: 6, fontSize: 12,
                background: spawnMsg.type === 'ok' ? 'var(--green)22' : 'var(--red)22',
                color: spawnMsg.type === 'ok' ? 'var(--green)' : 'var(--red)',
                border: `1px solid ${spawnMsg.type === 'ok' ? 'var(--green)' : 'var(--red)'}`,
              }}>
                {spawnMsg.type === 'ok' ? '✓ ' : '⚠ '}{spawnMsg.text}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setSpawnOpen(false); setSpawnMsg(null); }} style={{
                background: 'var(--surface2)', color: 'var(--text2)',
                border: '1px solid var(--border)', borderRadius: 7, padding: '8px 16px', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={spawnAgent} disabled={!spawnCwd.trim() || spawnLoading} style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 7, padding: '8px 18px', fontWeight: 600, cursor: 'pointer',
                opacity: !spawnCwd.trim() || spawnLoading ? 0.6 : 1,
              }}>
                {spawnLoading ? 'Opening…' : '🚀 Launch'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

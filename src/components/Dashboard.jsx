import React from 'react';
import { StatCard, Card, Spinner, ErrorMsg } from './Card.jsx';
import { useFetch } from '../hooks/useFetch.js';
import LiveStatus from './LiveStatus.jsx';

export default function Dashboard() {
  const agents = useFetch('/api/agents');
  const commands = useFetch('/api/commands');
  const sessions = useFetch('/api/sessions');
  const config = useFetch('/api/config');

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 22 }}>Dashboard</h2>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon="🤖" label="Agents" value={agents.loading ? '…' : (agents.data?.length ?? '—')} color="var(--accent)" />
        <StatCard icon="⚡" label="Commands" value={commands.loading ? '…' : (commands.data?.length ?? '—')} color="var(--green)" />
        <StatCard icon="⬡" label="Sessions" value={sessions.loading ? '…' : (sessions.data?.length ?? '—')} color="var(--yellow)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Agents */}
        <Card>
          <h3 style={{ marginBottom: 14, fontSize: 15, fontWeight: 600 }}>Agents</h3>
          {agents.loading ? <Spinner /> : agents.error ? <ErrorMsg msg={agents.error} /> : (
            <div>
              {agents.data?.slice(0, 6).map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid var(--border)', fontSize: 13,
                }}>
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🤖</span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{a.name}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>
                      {a.description?.slice(0, 80)}{a.description?.length > 80 ? '…' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Config */}
        <Card>
          <h3 style={{ marginBottom: 14, fontSize: 15, fontWeight: 600 }}>Environment</h3>
          {config.loading ? <Spinner /> : config.error ? <ErrorMsg msg={config.error} /> : (
            <div>
              {Object.entries(config.data || {}).filter(([k]) => k !== 'devboxConfig').map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)', fontSize: 12 }}>{String(v)}</span>
                </div>
              ))}

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>devbox config</div>
                <pre style={{
                  background: 'var(--surface2)', padding: 10, borderRadius: 6,
                  fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)',
                  whiteSpace: 'pre-wrap', overflowX: 'auto',
                }}>
                  {config.data?.devboxConfig || 'N/A'}
                </pre>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Live Agent Status */}
      <LiveStatus />

      {/* Active Sessions */}
      <Card style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 14, fontSize: 15, fontWeight: 600 }}>Active Claude Processes</h3>
        {sessions.loading ? <Spinner /> : sessions.error ? <ErrorMsg msg={sessions.error} /> : sessions.data?.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>No active Claude processes found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--mono)' }}>
            <thead>
              <tr style={{ color: 'var(--text3)' }}>
                {['PID', 'CPU%', 'MEM%', 'Started', 'Command'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.data?.map((s, i) => (
                <tr key={i} style={{ color: 'var(--text2)' }}>
                  <td style={{ padding: '5px 8px', color: 'var(--yellow)' }}>{s.pid}</td>
                  <td style={{ padding: '5px 8px' }}>{s.cpu}%</td>
                  <td style={{ padding: '5px 8px' }}>{s.mem}%</td>
                  <td style={{ padding: '5px 8px' }}>{s.started}</td>
                  <td style={{ padding: '5px 8px', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.cmd}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

import React from 'react';
import { Card, Spinner, ErrorMsg } from './Card.jsx';
import { useFetch } from '../hooks/useFetch.js';

export default function Config() {
  const { data: config, loading, error } = useFetch('/api/config');

  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 20 }}>Configuration</h2>
      <div style={{ background: '#ecc94b22', border: '1px solid var(--yellow)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--yellow)' }}>
        ⚠ Read-only view. No settings are modified by Agent Manager.
      </div>

      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 style={{ marginBottom: 14, fontSize: 15, fontWeight: 600 }}>Claude package versions</h3>
            {Object.entries(config || {}).map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                borderBottom: '1px solid var(--border)', fontSize: 13,
              }}>
                <span style={{ color: 'var(--text3)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{String(v)}</span>
              </div>
            ))}
          </Card>

          <Card>
            <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>Key Paths</h3>
            {[
              ['Agents', '~/.claude/agents/'],
              ['Commands', '~/.claude/commands/'],
              ['Rules', '~/.claude/rules/'],
              ['Projects / sessions', '~/.claude/projects/'],
              ['Skills', '~/.claude/skills/'],
            ].map(([label, p]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                borderBottom: '1px solid var(--border)', fontSize: 13,
              }}>
                <span style={{ color: 'var(--text3)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text2)', fontSize: 12 }}>{p}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

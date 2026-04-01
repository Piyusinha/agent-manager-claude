import React, { useState } from 'react';
import { Card, Spinner, ErrorMsg } from './Card.jsx';
import { useFetch } from '../hooks/useFetch.js';

export default function CommandList() {
  const { data: commands, loading, error } = useFetch('/api/commands');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = (commands || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 22 }}>
          Commands <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 400 }}>({filtered.length})</span>
        </h2>
        <input
          placeholder="Search commands…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(cmd => (
          <Card
            key={cmd.id}
            style={{ cursor: 'pointer', padding: '14px 18px' }}
            onClick={() => setExpanded(expanded === cmd.id ? null : cmd.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                color: 'var(--accent)', background: 'var(--surface2)',
                padding: '3px 8px', borderRadius: 4, flexShrink: 0,
              }}>
                /{cmd.name}
              </span>
              <span style={{ color: 'var(--text2)', fontSize: 13, flex: 1 }}>
                {cmd.description?.slice(0, 100)}{cmd.description?.length > 100 ? '…' : ''}
              </span>
              <span style={{ color: 'var(--text3)', fontSize: 18, flexShrink: 0 }}>
                {expanded === cmd.id ? '▾' : '▸'}
              </span>
            </div>

            {expanded === cmd.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <pre style={{
                  background: 'var(--surface2)', padding: 12, borderRadius: 6,
                  fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)',
                  whiteSpace: 'pre-wrap', maxHeight: 250, overflowY: 'auto',
                }}>
                  {cmd.body}
                </pre>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

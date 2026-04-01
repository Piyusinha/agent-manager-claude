import React, { useState } from 'react';
import { Card, Badge, Spinner, ErrorMsg } from './Card.jsx';
import { useFetch } from '../hooks/useFetch.js';

const MODEL_COLOR = {
  opus: 'var(--yellow)',
  sonnet: 'var(--accent)',
  haiku: 'var(--green)',
};

export default function AgentList() {
  const { data: agents, loading, error } = useFetch('/api/agents');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = (agents || []).filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 22 }}>Agents <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 400 }}>({filtered.length})</span></h2>
        <input
          placeholder="Search agents…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map(agent => (
          <Card
            key={agent.id}
            style={{
              cursor: 'pointer',
              borderColor: selected?.id === agent.id ? 'var(--accent)' : 'var(--border)',
              transition: 'border-color 0.15s',
            }}
            onClick={() => setSelected(selected?.id === agent.id ? null : agent)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>🤖 {agent.name}</div>
              <Badge color={MODEL_COLOR[agent.model] || 'var(--accent)'}>{agent.model}</Badge>
            </div>
            <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
              {agent.description?.slice(0, 120)}{agent.description?.length > 120 ? '…' : ''}
            </div>

            {selected?.id === agent.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Preview</div>
                <pre style={{
                  background: 'var(--surface2)', padding: 10, borderRadius: 6,
                  fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)',
                  whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto',
                }}>
                  {agent.body}
                </pre>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Tools: {
                    Array.isArray(agent.tools) ? agent.tools.join(', ') || 'all' : String(agent.tools) || 'all'
                  }</div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 60 }}>
          No agents found matching "{search}"
        </div>
      )}
    </div>
  );
}

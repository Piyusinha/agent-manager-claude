import React from 'react';
import { Card, Spinner, ErrorMsg } from './Card.jsx';
import { useFetch } from '../hooks/useFetch.js';

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const sec = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function PulseDot({ color }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 6px ${color}`,
      flexShrink: 0,
      animation: color === '#5c6370' ? 'none' : 'pulse 2s infinite',
    }} />
  );
}

function AgentCard({ agent }) {
  const { project, branch, status, statusColor, statusIcon, sessionId, isSubagent, lastActivity, lastTool } = agent;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Pulse dot */}
      <PulseDot color={statusColor} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
            {project}
          </span>
          {isSubagent && (
            <span style={{
              fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)',
              background: '#c678dd22', color: '#c678dd',
              borderRadius: 3, padding: '1px 5px',
            }}>
              subagent
            </span>
          )}
          {branch && (
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
              {branch.length > 30 ? branch.slice(0, 30) + '…' : branch}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>
          {sessionId} · {timeAgo(lastActivity)}
        </div>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: `${statusColor}18`,
        border: `1px solid ${statusColor}44`,
        borderRadius: 6,
        padding: '4px 10px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 14 }}>{statusIcon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, whiteSpace: 'nowrap' }}>
          {status}
        </span>
      </div>
    </div>
  );
}

export default function LiveStatus() {
  const { data, loading, error } = useFetch('/api/agent-status', { interval: 3000 });

  const active = (data ?? []).filter(a => a.status !== 'Idle');
  const idle   = (data ?? []).filter(a => a.status === 'Idle');

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Live Agent Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#98c379',
            display: 'inline-block',
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            live · 3s
          </span>
        </div>
      </div>

      {loading && !data ? <Spinner /> : error ? <ErrorMsg msg={error} /> : (
        <>
          {active.length === 0 && idle.length === 0 && (
            <div style={{ color: 'var(--text3)', fontSize: 13, padding: '8px 0' }}>
              No active Claude sessions in the last 10 minutes.
            </div>
          )}

          {active.map(a => (
            <AgentCard key={`${a.sessionId}-${a.isSubagent}`} agent={a} />
          ))}

          {idle.length > 0 && (
            <details style={{ marginTop: active.length ? 10 : 0 }}>
              <summary style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer', userSelect: 'none' }}>
                {idle.length} idle session{idle.length > 1 ? 's' : ''}
              </summary>
              {idle.map(a => (
                <AgentCard key={`${a.sessionId}-${a.isSubagent}`} agent={a} />
              ))}
            </details>
          )}
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Card>
  );
}

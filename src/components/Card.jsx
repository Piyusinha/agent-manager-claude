import React from 'react';

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon, color = 'var(--accent)' }) {
  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: 12,
        background: `${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{label}</div>
      </div>
    </Card>
  );
}

export function Badge({ children, color = 'var(--accent)' }) {
  return (
    <span style={{
      background: `${color}22`,
      color,
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'var(--mono)',
    }}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--text3)' }}>
      Loading...
    </div>
  );
}

export function ErrorMsg({ msg }) {
  return (
    <div style={{
      background: '#f5656522',
      border: '1px solid var(--red)',
      borderRadius: 8,
      padding: 16,
      color: 'var(--red)',
      fontSize: 13,
    }}>
      ⚠ {msg}
    </div>
  );
}

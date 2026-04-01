import React from 'react';

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',   icon: '◈'  },
  { id: 'playground',  label: 'Playground',  icon: '🏢' },
  { id: 'agents',      label: 'Agents',      icon: '🤖' },
  { id: 'commands',    label: 'Commands',    icon: '⚡' },
  { id: 'sessions',    label: 'Sessions',    icon: '⬡'  },
  { id: 'mcp',         label: 'MCP Servers', icon: '🔌' },
  { id: 'skills',      label: 'Skills',      icon: '✦'  },
  { id: 'config',      label: 'Config',      icon: '⚙'  },
];

export default function Sidebar({ active, onNav }) {
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
          🤖 Agent Manager
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Claude Code</div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '9px 12px',
              marginBottom: 2,
              borderRadius: 6,
              background: active === item.id ? 'var(--accent)' : 'transparent',
              color: active === item.id ? '#fff' : 'var(--text2)',
              fontWeight: active === item.id ? 600 : 400,
              fontSize: 14,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)' }}>
        v1.0.0 · read-only
      </div>
    </aside>
  );
}

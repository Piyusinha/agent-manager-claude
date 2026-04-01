import { useState, useEffect } from 'react';
import PulseDot from '../ui/PulseDot.jsx';
import { getThemePreference, setThemePreference } from '../../theme.js';
import styles from './Header.module.css';

export default function Header({ agentCount, commandCount, activeCount, hasActive, onStatClick }) {
  const [themePref, setThemePref] = useState(getThemePreference);

  useEffect(() => {
    const onTheme = () => setThemePref(getThemePreference());
    window.addEventListener('agent-manager-theme', onTheme);
    return () => window.removeEventListener('agent-manager-theme', onTheme);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.branding}>
          <span className={styles.title}>🤖 Agent Manager</span>
          <span className={styles.subtitle}>Claude Code</span>
        </div>
        <div className={styles.topActions}>
          <div className={styles.themeToggle} role="group" aria-label="Appearance">
            {[
              { id: 'system', label: 'Auto' },
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`${styles.themeBtn} ${themePref === id ? styles.themeBtnActive : ''}`}
                onClick={() => {
                  setThemePreference(id);
                  setThemePref(id);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.liveRow}>
            <PulseDot
              color={hasActive ? 'var(--green)' : 'var(--text3)'}
              animate={hasActive}
            />
            <span className={styles.liveLabel}>{hasActive ? 'LIVE' : 'IDLE'}</span>
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <StatTile
          value={agentCount}
          label="Agents"
          color="var(--accent)"
          onClick={() => onStatClick('agents')}
        />
        <StatTile
          value={commandCount}
          label="Commands"
          color="var(--green)"
          onClick={() => onStatClick('commands')}
        />
        <StatTile
          value={activeCount}
          label="Active"
          color="var(--yellow)"
          onClick={() => onStatClick('live')}
        />
      </div>
    </header>
  );
}

function StatTile({ value, label, color, onClick }) {
  return (
    <button className={styles.tile} onClick={onClick}>
      <div className={styles.tileValue} style={{ color }}>{value ?? '—'}</div>
      <div className={styles.tileLabel}>{label}</div>
    </button>
  );
}

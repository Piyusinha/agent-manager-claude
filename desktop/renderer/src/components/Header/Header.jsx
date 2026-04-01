import PulseDot from '../ui/PulseDot.jsx';
import styles from './Header.module.css';

const MODEL_COLORS = { opus: '#e5c07b', sonnet: '#528bff', haiku: '#98c379' };

export default function Header({ agentCount, commandCount, activeCount, hasActive, onStatClick }) {
  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.branding}>
          <span className={styles.title}>🤖 Agent Manager</span>
          <span className={styles.subtitle}>devbox ai · claude</span>
        </div>
        <div className={styles.liveRow}>
          <PulseDot
            color={hasActive ? 'var(--green)' : 'var(--text3)'}
            animate={hasActive}
          />
          <span className={styles.liveLabel}>{hasActive ? 'LIVE' : 'IDLE'}</span>
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

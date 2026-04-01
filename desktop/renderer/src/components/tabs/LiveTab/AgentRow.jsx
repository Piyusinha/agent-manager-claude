import { useState } from 'react';
import PulseDot from '../../ui/PulseDot.jsx';
import styles from './LiveTab.module.css';

function timeAgo(iso) {
  if (!iso) return '—';
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h`;
}

export default function AgentRow({ agent }) {
  const [open, setOpen] = useState(false);
  const isActive = agent.status !== 'Idle';

  return (
    <div className={`${styles.agentRow} ${open ? styles.expanded : ''}`}>
      <button className={styles.rowMain} onClick={() => setOpen((v) => !v)}>
        <PulseDot color={agent.statusColor} animate={isActive} />
        <span className={styles.project}>{agent.project}</span>
        {agent.branch && <span className={styles.branch}>{agent.branch}</span>}
        <span className={styles.sessionId}>{agent.sessionId}</span>
        <span className={styles.time}>{timeAgo(agent.lastActivity)}</span>
        <span className={styles.status} style={{ color: agent.statusColor }}>
          {agent.statusIcon} {agent.status}
        </span>
      </button>

      {open && (
        <div className={styles.rowDetail}>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>cwd</span>
            <span className={styles.detailVal}>{agent.cwd || '—'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>idle</span>
            <span className={styles.detailVal}>{agent.idleSec}s</span>
          </div>
          {agent.isSubagent && (
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>type</span>
              <span className={styles.detailVal} style={{ color: 'var(--purple)' }}>subagent</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

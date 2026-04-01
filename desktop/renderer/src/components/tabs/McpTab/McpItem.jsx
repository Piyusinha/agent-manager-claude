import { useState } from 'react';
import Badge from '../../ui/Badge.jsx';
import styles from './McpTab.module.css';

function serverSummary(cfg) {
  if (cfg.url)     return cfg.url;
  if (cfg.command) return `${cfg.command} ${(cfg.args || []).slice(0, 2).join(' ')}`;
  return '—';
}

export default function McpItem({ name, config, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const envCount = Object.keys(config.env || {}).length;
  const type = config.type || (config.url ? 'http' : 'stdio');
  const typeColor = type === 'http' ? 'var(--purple)' : 'var(--teal)';

  return (
    <div className={styles.item}>
      <div className={styles.itemRow}>
        <div className={styles.itemMain}>
          <span className={styles.serverName}>{name}</span>
          <Badge color={typeColor}>{type}</Badge>
          <span className={styles.serverCmd}>{serverSummary(config)}</span>
          {envCount > 0 && (
            <span className={styles.envTag}>{envCount} env</span>
          )}
        </div>

        {confirming ? (
          <div className={styles.confirmRow}>
            <button className={styles.confirmBtn} onClick={() => { onDelete(name); setConfirming(false); }}>
              Delete
            </button>
            <button className={styles.cancelBtn} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className={styles.deleteBtn} onClick={() => setConfirming(true)} title="Delete server">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

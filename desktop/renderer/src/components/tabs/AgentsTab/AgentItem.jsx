import { useState } from 'react';
import Badge from '../../ui/Badge.jsx';
import styles from './AgentsTab.module.css';

const MODEL_COLOR = { opus: 'var(--yellow)', sonnet: 'var(--accent)', haiku: 'var(--green)' };

export default function AgentItem({ agent }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.item}>
      <button className={styles.itemRow} onClick={() => setOpen((v) => !v)}>
        <div className={styles.itemLeft}>
          <span className={styles.itemName}>🤖 {agent.name}</span>
          <span className={styles.itemDesc}>
            {agent.description?.slice(0, 72)}{agent.description?.length > 72 ? '…' : ''}
          </span>
        </div>
        <div className={styles.itemRight}>
          <Badge color={MODEL_COLOR[agent.model] ?? 'var(--accent)'}>{agent.model}</Badge>
          <span className={styles.chevron}>{open ? '▾' : '›'}</span>
        </div>
      </button>

      {open && (
        <div className={styles.detail}>
          {agent.tools?.length > 0 && (
            <div className={styles.tools}>
              Tools: {Array.isArray(agent.tools) ? agent.tools.join(', ') : agent.tools}
            </div>
          )}
          <pre className={styles.body}>{agent.body}</pre>
        </div>
      )}
    </div>
  );
}

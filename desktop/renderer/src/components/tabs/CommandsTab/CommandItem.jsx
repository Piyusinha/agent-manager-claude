import { useState } from 'react';
import styles from './CommandsTab.module.css';

export default function CommandItem({ cmd }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.item}>
      <button className={styles.itemRow} onClick={() => setOpen((v) => !v)}>
        <div className={styles.itemLeft}>
          <span className={styles.cmdName}>/{cmd.name}</span>
          <span className={styles.cmdDesc}>
            {cmd.description?.slice(0, 72)}{cmd.description?.length > 72 ? '…' : ''}
          </span>
        </div>
        <span className={styles.chevron}>{open ? '▾' : '›'}</span>
      </button>

      {open && (
        <pre className={styles.body}>{cmd.body}</pre>
      )}
    </div>
  );
}

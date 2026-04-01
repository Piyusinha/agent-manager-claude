import { useState, useRef, useEffect } from 'react';
import { spawnSession } from '../../api/client.js';
import styles from './SpawnModal.module.css';

export default function SpawnModal({ onClose }) {
  const [cwd, setCwd]       = useState('');
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'done' | string (error)
  const cwdRef = useRef(null);

  useEffect(() => { cwdRef.current?.focus(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!cwd.trim()) return;
    setStatus('loading');
    try {
      await spawnSession({ cwd: cwd.trim(), prompt: prompt.trim() || undefined });
      setStatus('done');
      setTimeout(onClose, 1200);
    } catch (ex) {
      setStatus(ex.message);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>New Session</span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        {status === 'done' ? (
          <div className={styles.success}>✓ Terminal opened</div>
        ) : (
          <form onSubmit={submit} className={styles.form}>
            <label className={styles.label}>Working directory</label>
            <input
              ref={cwdRef}
              placeholder="~/projects/my-app"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
            />
            <label className={styles.label}>Initial prompt (optional)</label>
            <textarea
              placeholder="Describe what you want Claude to do…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
            {typeof status === 'string' && status !== 'loading' && (
              <div className={styles.error}>{status}</div>
            )}
            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className={styles.launchBtn}
                disabled={!cwd.trim() || status === 'loading'}
              >
                {status === 'loading' ? 'Launching…' : 'Launch in Terminal'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

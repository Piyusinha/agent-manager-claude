import { useState } from 'react';
import { useFetch } from '../../../hooks/useFetch.js';
import { fetchSessionPast, spawnSession } from '../../../api/client.js';
import Spinner from '../../ui/Spinner.jsx';
import EmptyState, { ErrorState } from '../../ui/EmptyState.jsx';
import styles from './PastTab.module.css';

function timeAgo(ms) {
  if (ms == null) return '—';
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function PastTab() {
  const { data, loading, error, refetch } = useFetch(fetchSessionPast, { interval: 0 });
  const [resumingId, setResumingId] = useState(null);
  const [resumeError, setResumeError] = useState(null);

  const onResume = async (row) => {
    if (!row.cwd) return;
    setResumeError(null);
    setResumingId(row.sessionId);
    try {
      await spawnSession({ cwd: row.cwd, resumeSessionId: row.sessionId });
    } catch (e) {
      setResumeError(e.message);
    } finally {
      setResumingId(null);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  const rows = data || [];

  return (
    <div className={`${styles.tab} pastTab`}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => refetch()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {typeof resumeError === 'string' && (
        <div className={styles.errorBanner}>{resumeError}</div>
      )}

      <div className={styles.scroll}>
        {rows.length === 0 && (
          <EmptyState icon="📂" message="No Claude session logs under ~/.claude/projects" />
        )}

        {rows.map((row) => (
          <div key={row.sessionId} className={styles.row}>
            <div className={styles.body}>
              <p className={styles.title} title={row.title}>{row.title}</p>
              <div className={styles.meta}>
                <span className={styles.project}>{row.project}</span>
                <span>{timeAgo(row.lastActiveMs)}</span>
                <span className={styles.sessionId}>{row.sessionId.slice(0, 8)}</span>
                {!row.cwd && (
                  <span className={styles.hint}>cwd unknown — cannot resume from here</span>
                )}
              </div>
            </div>
            <button
              type="button"
              className={styles.resumeBtn}
              disabled={!row.cwd || resumingId === row.sessionId}
              onClick={() => onResume(row)}
            >
              {resumingId === row.sessionId ? '…' : 'Resume'}
            </button>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        Opens Terminal with <span className={styles.sessionId}>claude --resume &lt;uuid&gt;</span>
        {' '}in the session's working directory (300 most recently modified logs).
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useFetch } from '../../../hooks/useFetch.js';
import { fetchAgentStatus } from '../../../api/client.js';
import AgentRow from './AgentRow.jsx';
import Spinner from '../../ui/Spinner.jsx';
import EmptyState, { ErrorState } from '../../ui/EmptyState.jsx';
import SpawnModal from '../../SpawnModal/SpawnModal.jsx';
import styles from './LiveTab.module.css';

export default function LiveTab() {
  const { data, loading, error } = useFetch(fetchAgentStatus, { interval: 3000 });
  const [showSpawn, setShowSpawn] = useState(false);

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} />;

  // Deduplicate by sessionId — API can return the same session more than once
  const seen = new Set();
  const unique = (data || []).filter((a) => {
    if (seen.has(a.sessionId)) return false;
    seen.add(a.sessionId);
    return true;
  });
  const active = unique.filter((a) => a.status !== 'Idle');
  const idle   = unique.filter((a) => a.status === 'Idle');

  return (
    <div className={styles.tab}>
      {data?.length === 0 && (
        <EmptyState icon="💤" message="No agent sessions in the last hour" />
      )}

      {active.map((a) => <AgentRow key={`active-${a.sessionId}`} agent={a} />)}

      {idle.length > 0 && (
        <details className={styles.idleGroup}>
          <summary className={styles.idleSummary}>
            {idle.length} idle session{idle.length !== 1 ? 's' : ''}
          </summary>
          {idle.map((a) => <AgentRow key={`idle-${a.sessionId}`} agent={a} />)}
        </details>
      )}

      <div className={styles.footer}>
        <button className={styles.spawnBtn} onClick={() => setShowSpawn(true)}>
          + New Session
        </button>
      </div>

      {showSpawn && <SpawnModal onClose={() => setShowSpawn(false)} />}
    </div>
  );
}

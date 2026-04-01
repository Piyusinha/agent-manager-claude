import { useState } from 'react';
import { useFetch } from '../../../hooks/useFetch.js';
import { fetchAgents } from '../../../api/client.js';
import AgentItem from './AgentItem.jsx';
import Spinner from '../../ui/Spinner.jsx';
import EmptyState, { ErrorState } from '../../ui/EmptyState.jsx';
import styles from './AgentsTab.module.css';

export default function AgentsTab() {
  const { data, loading, error } = useFetch(fetchAgents);
  const [q, setQ] = useState('');

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} />;

  const filtered = (data || []).filter((a) =>
    !q || a.name.toLowerCase().includes(q.toLowerCase()) ||
    a.description?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className={styles.searchBar}>
        <input
          placeholder="Search agents…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      {filtered.length === 0
        ? <EmptyState icon="🤖" message={q ? `No results for "${q}"` : 'No agents found'} />
        : filtered.map((a) => <AgentItem key={a.id} agent={a} />)
      }
    </div>
  );
}

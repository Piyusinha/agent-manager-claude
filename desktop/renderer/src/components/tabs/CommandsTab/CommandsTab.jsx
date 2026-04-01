import { useState } from 'react';
import { useFetch } from '../../../hooks/useFetch.js';
import { fetchCommands } from '../../../api/client.js';
import CommandItem from './CommandItem.jsx';
import Spinner from '../../ui/Spinner.jsx';
import EmptyState, { ErrorState } from '../../ui/EmptyState.jsx';
import styles from './CommandsTab.module.css';

export default function CommandsTab() {
  const { data, loading, error } = useFetch(fetchCommands);
  const [q, setQ] = useState('');

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} />;

  const filtered = (data || []).filter((c) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.description?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className={styles.searchBar}>
        <input placeholder="Search commands…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtered.length === 0
        ? <EmptyState icon="⚡" message={q ? `No results for "${q}"` : 'No commands found'} />
        : filtered.map((c) => <CommandItem key={c.id} cmd={c} />)
      }
    </div>
  );
}

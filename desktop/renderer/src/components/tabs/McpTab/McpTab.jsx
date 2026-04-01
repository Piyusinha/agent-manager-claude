import { useState } from 'react';
import { useFetch } from '../../../hooks/useFetch.js';
import { fetchMcp, addMcp, deleteMcp } from '../../../api/client.js';
import McpItem from './McpItem.jsx';
import Spinner from '../../ui/Spinner.jsx';
import EmptyState, { ErrorState } from '../../ui/EmptyState.jsx';
import styles from './McpTab.module.css';

function AddForm({ onAdd, onCancel }) {
  const [name, setName]     = useState('');
  const [command, setCommand] = useState('');
  const [err, setErr]       = useState('');
  const [busy, setBusy]     = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !command.trim()) { setErr('Name and command are required'); return; }
    setBusy(true);
    try {
      const [cmd, ...args] = command.trim().split(/\s+/);
      await addMcp({ name: name.trim(), type: 'stdio', command: cmd, args });
      onAdd();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.addForm} onSubmit={submit}>
      <input placeholder="Server name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <input placeholder="Command (e.g. node /path/to/server.js)" value={command} onChange={(e) => setCommand(e.target.value)} />
      {err && <span className={styles.formErr}>{err}</span>}
      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.addBtn} disabled={busy}>{busy ? '…' : 'Add'}</button>
      </div>
    </form>
  );
}

export default function McpTab() {
  const { data, loading, error, refetch } = useFetch(fetchMcp);
  const [adding, setAdding] = useState(false);

  const handleDelete = async (name) => {
    try { await deleteMcp(name); refetch(); } catch (e) { alert(e.message); }
  };

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} />;

  const entries = Object.entries(data || {});

  return (
    <div>
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>MCP Servers</span>
        {!adding && (
          <button className={styles.addServerBtn} onClick={() => setAdding(true)}>+ Add</button>
        )}
      </div>

      {adding && (
        <AddForm onAdd={() => { setAdding(false); refetch(); }} onCancel={() => setAdding(false)} />
      )}

      {entries.length === 0 && !adding
        ? <EmptyState icon="🔌" message="No MCP servers configured" />
        : entries.map(([name, cfg]) => (
            <McpItem key={name} name={name} config={cfg} onDelete={handleDelete} />
          ))
      }
    </div>
  );
}

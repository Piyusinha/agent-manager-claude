export default function EmptyState({ icon = '◌', message = 'Nothing here' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 20px', gap: 8,
      color: 'var(--text3)',
    }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontSize: 12 }}>{message}</span>
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div style={{
      margin: '12px 14px', padding: '8px 12px', borderRadius: 'var(--radius-md)',
      background: 'var(--red-dim)', color: 'var(--red)', fontSize: 12,
      border: '1px solid rgba(224,108,117,0.25)',
    }}>
      ⚠ {message}
    </div>
  );
}

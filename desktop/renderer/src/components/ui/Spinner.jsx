export default function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
      <span style={{
        display: 'block',
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: '2px solid var(--border-hover)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.65s linear infinite',
      }} />
    </div>
  );
}

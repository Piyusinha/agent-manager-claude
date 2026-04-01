export default function Badge({ children, color = 'var(--accent)' }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: 'var(--mono)',
      fontSize: 10,
      padding: '2px 6px',
      borderRadius: 'var(--radius-sm)',
      background: `${color}20`,
      color,
      border: `1px solid ${color}40`,
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

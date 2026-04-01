export default function PulseDot({ color = 'var(--text3)', animate = false, size = 7 }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
      animation: animate ? 'pulse 2s ease-in-out infinite' : 'none',
    }} />
  );
}

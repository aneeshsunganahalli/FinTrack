export default function Spinner({ size = 20 }) {
  return (
    <div
      style={{
        width: size, height: size,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

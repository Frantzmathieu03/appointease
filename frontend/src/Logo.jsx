export default function Logo({ size = 'md', dark = false }) {
  const sizes = { sm: 28, md: 36, lg: 48 }
  const s = sizes[size]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg width={s} height={s} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="60" rx="14" fill="#6366f1"/>
        <rect y="0" width="60" height="14" rx="14" fill="#4f46e5"/>
        <rect y="7" width="60" height="7" fill="#4f46e5"/>
        <circle cx="15" cy="7" r="2.5" fill="white" opacity="0.8"/>
        <circle cx="30" cy="7" r="2.5" fill="white" opacity="0.8"/>
        <circle cx="45" cy="7" r="2.5" fill="white" opacity="0.8"/>
        <rect x="12" y="20" width="10" height="10" rx="2.5" fill="white" opacity="0.9"/>
        <rect x="26" y="20" width="10" height="10" rx="2.5" fill="white" opacity="0.9"/>
        <rect x="40" y="20" width="10" height="10" rx="2.5" fill="white" opacity="0.4"/>
        <rect x="12" y="35" width="10" height="10" rx="2.5" fill="white" opacity="0.4"/>
        <rect x="26" y="35" width="10" height="10" rx="2.5" fill="white" opacity="0.9"/>
        <rect x="40" y="35" width="10" height="10" rx="2.5" fill="white" opacity="0.9"/>
      </svg>
      <span style={{
        fontWeight: 800,
        fontSize: size === 'sm' ? '16px' : size === 'md' ? '20px' : '26px',
        letterSpacing: '-0.5px',
        color: dark ? 'white' : '#1e1b4b'
      }}>
        Appoint<span style={{ color: dark ? '#a5b4fc' : '#4f46e5' }}>Ease</span>
      </span>
    </div>
  )
}

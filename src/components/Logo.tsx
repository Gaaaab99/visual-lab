export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="vl-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#06B6D4" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#vl-logo)" opacity="0.15" />
      <path d="M8 32s9-14 24-14 24 14 24 14-9 14-24 14S8 32 8 32z" fill="none" stroke="url(#vl-logo)" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="8.5" fill="url(#vl-logo)" />
      <circle cx="35" cy="29" r="2.6" fill="#E0F2FE" />
    </svg>
  );
}

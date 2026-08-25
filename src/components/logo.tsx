export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="logo-mark"
      >
        <rect width="32" height="32" rx="9" fill="url(#sc-mark)" />
        <rect x="1" y="1" width="30" height="30" rx="8" stroke="white" strokeOpacity="0.22" />
        <circle cx="16" cy="16" r="7.2" stroke="var(--on-gold)" strokeWidth="1.7" opacity="0.95" />
        <path
          d="M16 11.2V16.1l3.1 1.85"
          stroke="var(--on-gold)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="1.35" fill="var(--on-gold)" />
        <defs>
          <linearGradient id="sc-mark" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--gold-2)" />
            <stop offset="1" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-display text-[1.12rem] leading-none tracking-tight">
        Softify<span className="text-gold">Cron</span>
      </span>
    </span>
  );
}

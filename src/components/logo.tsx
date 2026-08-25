export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="9" fill="#7dffce" />
        <path
          d="M16 8.5a7.5 7.5 0 1 1 0 15"
          stroke="#04140e"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M16 12.2V16l2.4 1.6"
          stroke="#04140e"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="23.2" cy="10.2" r="1.5" fill="#04140e" />
      </svg>
      <span className="font-display text-lg tracking-tight">
        Softify<span className="italic text-gold">Cron</span>
      </span>
    </span>
  );
}

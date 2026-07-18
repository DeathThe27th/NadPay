/**
 * NadPay mark: two interlocked rings — one claim link paying a linked team.
 * The masks hide a sliver of each ring at opposite crossings so the links
 * genuinely weave over/under instead of just overlapping.
 */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="NadPay logo"
    >
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <defs>
        <mask id="np-ring-a">
          <rect width="32" height="32" fill="white" />
          <circle cx="16" cy="20.24" r="2.7" fill="black" />
        </mask>
        <mask id="np-ring-b">
          <rect width="32" height="32" fill="white" />
          <circle cx="16" cy="11.76" r="2.7" fill="black" />
        </mask>
      </defs>
      <circle
        cx="12.5"
        cy="16"
        r="5.5"
        fill="none"
        stroke="white"
        strokeWidth="3"
        mask="url(#np-ring-a)"
      />
      <circle
        cx="19.5"
        cy="16"
        r="5.5"
        fill="none"
        stroke="white"
        strokeWidth="3"
        mask="url(#np-ring-b)"
      />
    </svg>
  );
}

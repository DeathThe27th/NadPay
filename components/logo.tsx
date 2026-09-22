export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={`naday-logo ${className}`} aria-hidden="true">
      <img src="/naday-logo.png" alt="" />
    </span>
  );
}

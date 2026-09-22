export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={`nads2pay-logo ${className}`} aria-hidden="true">
      <img src="/nads2pay-logo.png" alt="" />
    </span>
  );
}

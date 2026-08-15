import Image from "next/image";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} role="img" aria-label="Nads2Pay mascot logo">
      <Image src="/brand/nads2pay-mascot-v1.webp" alt="" fill sizes="64px" className="object-contain" />
    </span>
  );
}

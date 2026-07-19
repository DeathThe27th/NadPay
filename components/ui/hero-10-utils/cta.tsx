"use client";

import * as React from "react";
import Link from "next/link";

import { Button, type ButtonProps } from "@/components/ui/button";

export interface CtaProps {
  ctaEnabled?: boolean;
  text: string;
  link?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

export function Cta({ cta }: Readonly<{ cta: CtaProps }>) {
  const { text, link, onClick, disabled, variant, size, className } = cta;

  if (link && !onClick) {
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <Link href={link}>{text}</Link>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </Button>
  );
}

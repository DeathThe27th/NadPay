"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthForm } from "@/components/auth-control";
import { LogoMark } from "@/components/logo";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-back"><ArrowLeft size={16} /> Back to NadPay</Link>
      <div className="auth-page-inner">
        <LogoMark className="size-12" />
        <p className="onboarding-kicker">NadPay workspace</p>
        <h1>Start with your account.</h1>
        <p className="auth-page-lede">Sign in first. We’ll help you choose the right workspace before asking for a wallet.</p>
        <AuthForm />
      </div>
    </main>
  );
}

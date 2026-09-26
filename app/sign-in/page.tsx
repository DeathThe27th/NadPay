"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthForm } from "@/components/auth-control";
import { LogoMark } from "@/components/logo";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-back"><ArrowLeft size={16} /> Back to Nads2Pay</Link>
      <div className="auth-page-inner">
        <LogoMark className="size-12" />
        <p className="onboarding-kicker">Nads2Pay workspace</p>
        <h1>Run the money side of your team.</h1>
        <p className="auth-page-lede">One workspace for payroll, contributor payouts, and the onchain operations behind them.</p>
        <AuthForm />
      </div>
    </main>
  );
}

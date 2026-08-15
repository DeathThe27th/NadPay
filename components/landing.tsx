"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ArrowUpRight, Check, Copy, Menu, X } from "lucide-react";
import { useConnect } from "wagmi";
import { LogoMark } from "@/components/logo";
import { NADPAY_ADDRESS } from "@/lib/nadpay";
import { ACTIVE_NETWORK } from "@/lib/network";

const TEAM = [
  ["0x71A...2FD", "2.40 MON"],
  ["0x18B...C91", "1.60 MON"],
  ["0x92D...1AA", "2.00 MON"],
  ["0x42F...AC8", "2.40 MON"],
] as const;

function Brand() {
  return (
    <a href="#top" className="brand-lockup" aria-label="Nads2Pay home">
      <LogoMark className="size-8" />
      <span>Nads2Pay</span>
    </a>
  );
}

function PayToken() {
  return (
    <motion.div
      className="pay-token"
      animate={{ y: [0, -10, 0], rotate: [0, 4, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <img src="/brand/nads2pay-mascot-v1.webp" alt="" className="size-full object-contain" />
      <span className="token-ring" />
    </motion.div>
  );
}

function DemoWindow() {
  const [copied, setCopied] = useState(false);
  return (
    <motion.div
      className="hero-demo product-panel"
      initial={{ y: 36, rotateX: 8 }}
      animate={{ y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="panel-topline">
        <span>Payday #07</span>
        <span className="live-dot">Live</span>
      </div>
      <div className="demo-amount">8.40 <small>MON</small></div>
      <p className="demo-meta">Funded for 4 recipients</p>
      <div className="claim-url">
        <span>nads2pay.xyz/claim/7</span>
        <button
          type="button"
          aria-label="Copy demo claim link"
          onClick={() => {
            void navigator.clipboard?.writeText("nads2pay.xyz/claim/7");
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </motion.div>
  );
}

function StoryCard({ type }: { type: "team" | "fund" | "share" | "claim" | "return" }) {
  if (type === "team") {
    return (
      <div className="product-panel story-card">
        <div className="panel-topline"><span>Team preset</span><span className="status-chip">Saved on-chain</span></div>
        <div className="team-list">
          {TEAM.map(([address, amount]) => <div key={address}><code>{address}</code><strong>{amount}</strong></div>)}
        </div>
        <div className="panel-total"><span>Total</span><strong>8.40 MON</strong></div>
      </div>
    );
  }
  if (type === "fund") {
    return (
      <div className="product-panel story-card night-card">
        <div className="panel-topline"><span>Payroll #07</span><span>4 recipients</span></div>
        <div className="demo-amount">8.40 <small>MON</small></div>
        <div className="confirm-row"><span className="confirm-icon"><Check size={18} /></span><div><strong>Transaction confirmed</strong><small>Payroll is ready to claim</small></div></div>
      </div>
    );
  }
  if (type === "share") {
    return (
      <div className="product-panel story-card share-card">
        <span className="signal"><i /><i /><i /></span>
        <h3>Payday #07 is live</h3>
        <div className="claim-url"><span>nads2pay.xyz/claim/7</span><button type="button"><Copy size={16} /> Copy</button></div>
        <p>Ready to drop into the team chat.</p>
      </div>
    );
  }
  if (type === "claim") {
    return (
      <div className="product-panel story-card claim-card">
        <p>You have a payment</p><div className="demo-amount">1.60 <small>MON</small></div>
        <div className="sender-row"><LogoMark className="size-8" /><span>From<strong>Nads2Pay Payroll #07</strong></span></div>
        <button type="button" className="demo-button"><Check size={17} /> Payment claimed</button>
      </div>
    );
  }
  return (
    <div className="return-visual">
      <div className="return-orbit"><span>0.80</span><small>MON</small></div>
      <div className="product-panel return-note"><span className="confirm-icon"><ArrowDown size={18} /></span><div><strong>Funds returned</strong><small>Round #07 closed</small></div></div>
    </div>
  );
}

const STORIES = [
  { id: "team", title: "Set the team once.", body: "Save wallet addresses and payroll amounts ahead of payday. No weekly copy-paste.", type: "team" as const },
  { id: "fund", title: "Fund payday once.", body: "One transaction funds the whole payroll round in native MON.", type: "fund" as const },
  { id: "link", title: "One link. Everyone gets paid.", body: "Drop one claim link in your team chat. Each teammate claims directly to their wallet.", type: "share" as const },
  { id: "claim", title: "Their wallet. Their claim.", body: "Nobody needs your spreadsheet, admin dashboard, or manual transfer. They claim their own allocation.", type: "claim" as const },
  { id: "return", title: "Nothing gets stranded.", body: "When a payroll round closes, unclaimed funds can return to the payer.", type: "return" as const },
];

export function Landing() {
  const { connect, connectors, isPending } = useConnect();
  const [menuOpen, setMenuOpen] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: storyRef, offset: ["start 70%", "end 50%"] });
  const trailLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const tokenY = useTransform(scrollYProgress, [0, 1], [0, 820]);
  const noWallet = connectors.length === 0;
  const connectWallet = () => connectors[0] && connect({ connector: connectors[0] });

  return (
    <div id="top" className="landing-world">
      <header className="floating-nav">
        <Brand />
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a><a href="#why">Why Nads2Pay</a><a href="#monad">Monad</a>
        </nav>
        <button className="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        {menuOpen && <nav className="mobile-menu"><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#why" onClick={() => setMenuOpen(false)}>Why Nads2Pay</a><a href="#monad" onClick={() => setMenuOpen(false)}>Monad</a></nav>}
      </header>

      <main>
        <section className="cinematic-hero" aria-labelledby="hero-title">
          <div className="hero-haze" aria-hidden="true" /><div className="hero-geometry" aria-hidden="true"><i /><i /><i /><i /></div>
          <PayToken />
          <div className="hero-copy">
            <motion.h1 id="hero-title" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, ease: [0.16, 1, 0.3, 1] }}>The whole payroll,<br /><span>in one link.</span></motion.h1>
            <motion.p className="hero-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .18 }}>Preset your team, fund payday once, and drop one claim link. Everyone pulls their own pay — on Monad.</motion.p>
            <motion.div className="hero-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .3 }}>
              <button type="button" className="primary-cta" disabled={isPending || noWallet} onClick={connectWallet}>{isPending ? "Connecting…" : "Connect wallet to start"}<ArrowUpRight size={18} /></button>
              <a className="secondary-cta" href="#how-it-works">See how it works <ArrowDown size={16} /></a>
            </motion.div>
            {noWallet && <p className="wallet-note">Install an injected wallet such as MetaMask to continue.</p>}
          </div>
          <DemoWindow />
        </section>

        <div id="how-it-works" ref={storyRef} className="story-world">
          <div className="story-sky" aria-hidden="true" />
          <svg className="payment-trail" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
            <path className="trail-glow" d="M50 0 C92 100 10 190 54 290 S90 445 42 540 S12 710 62 805 S82 930 50 1000" />
            <motion.path style={{ pathLength: trailLength }} d="M50 0 C92 100 10 190 54 290 S90 445 42 540 S12 710 62 805 S82 930 50 1000" />
          </svg>
          <motion.div className="trail-token" style={{ y: tokenY }} aria-hidden="true"><LogoMark className="size-9" /></motion.div>
          {STORIES.map((story, index) => (
            <section id={story.id === "team" ? "why" : story.id} className={`story-chapter ${index % 2 ? "reverse" : ""}`} key={story.id}>
              <motion.div className="story-copy" initial={{ opacity: .35, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: .45 }} transition={{ duration: .7, ease: [0.16, 1, 0.3, 1] }}>
                <span className="chapter-dot" aria-hidden="true" />
                <h2>{story.title}</h2><p>{story.body}</p>
              </motion.div>
              <motion.div className="story-visual" initial={{ opacity: .45, scale: .94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ amount: .4 }} transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}><StoryCard type={story.type} /></motion.div>
            </section>
          ))}
        </div>

        <section id="monad" className="monad-chapter">
          <div className="monad-orbit" aria-hidden="true"><span>MON</span></div>
          <div><h2>Payroll,<br />at Monad speed.</h2><p>Nads2Pay runs on Monad and settles payouts in native MON.</p><div className="text-links"><a href={`${ACTIVE_NETWORK.explorerUrl}/address/${NADPAY_ADDRESS}`} target="_blank" rel="noreferrer">View contract <ArrowUpRight size={16} /></a><a href="https://www.monad.xyz" target="_blank" rel="noreferrer">Learn about Monad <ArrowUpRight size={16} /></a></div></div>
        </section>

        <section className="final-cta">
          <PayToken /><h2>Your team.<br />One payday link.</h2><p>Preset your team and run the next payday on Nads2Pay.</p><button type="button" className="primary-cta" disabled={isPending || noWallet} onClick={connectWallet}>{isPending ? "Connecting…" : "Connect wallet"}<ArrowUpRight size={18} /></button>
        </section>
      </main>

      <footer className="landing-footer"><div><Brand /></div><nav aria-label="Footer"><a href="#how-it-works">How it works</a><a href={`${ACTIVE_NETWORK.explorerUrl}/address/${NADPAY_ADDRESS}`} target="_blank" rel="noreferrer">Contract</a><a href="https://www.monad.xyz" target="_blank" rel="noreferrer">Monad</a></nav><div className="footer-base"><span>Runs on Monad · payouts settle in native MON</span><span>© {new Date().getFullYear()} Nads2Pay</span></div></footer>
    </div>
  );
}

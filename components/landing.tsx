"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ArrowUpRight, Check, Copy, Menu, X } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { VoxelTopographyGrid } from "@/components/ui/voxel-topography-grid";
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
      <svg className="brand-cube" viewBox="0 0 32 32" aria-hidden="true">
        <path d="m16 3 12 7-12 7L4 10 16 3Z" />
        <path d="m4 10 12 7v12L4 22V10Z" />
        <path d="m28 10-12 7v12l12-7V10Z" />
      </svg>
      <span>Nads2Pay</span>
    </a>
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
        <div className="sender-row"><span>From<strong>Nads2Pay Operations #07</strong></span></div>
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
  { id: "team", title: "Build your operating roster.", body: "Keep teammates, contributors, and payout rules ready for the work ahead.", type: "team" as const },
  { id: "fund", title: "Move money with intent.", body: "Review one clear total and authorize the next operation from your wallet.", type: "fund" as const },
  { id: "link", title: "Give every payment a path.", body: "Share a clear claim experience while every allocation stays verifiable onchain.", type: "share" as const },
  { id: "claim", title: "Their wallet. Their claim.", body: "Nobody needs your spreadsheet, admin dashboard, or manual transfer. They claim their own allocation.", type: "claim" as const },
  { id: "return", title: "Nothing gets stranded.", body: "When a payroll round closes, unclaimed funds can return to the payer.", type: "return" as const },
];

export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { login, ready, authenticated } = usePrivy();
  const storyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: storyRef, offset: ["start 70%", "end 50%"] });
  const trailLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  function startWorkspace() {
    if (authenticated) {
      window.location.assign("/");
      return;
    }
    login();
  }

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
          <VoxelTopographyGrid className="hero-voxel-field" />
          <div className="hero-voxel-shade" aria-hidden="true" />
          <div className="hero-copy">
            <motion.p className="hero-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .08 }}>Money operations for modern teams</motion.p>
            <motion.h1 id="hero-title" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, ease: [0.16, 1, 0.3, 1] }}>The calm way to<br /><span>run payroll.</span></motion.h1>
            <motion.p className="hero-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .18 }}>Bring people, payroll, approvals, and the money behind your work into one clear operating workspace.</motion.p>
            <motion.div className="hero-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .3 }}>
              <button type="button" className="primary-cta" onClick={startWorkspace} disabled={!ready}>{authenticated ? "Open your workspace" : "Create your workspace"} <ArrowUpRight size={18} /></button>
              <a className="secondary-cta" href="#how-it-works">See how it works <ArrowDown size={16} /></a>
            </motion.div>
          </div>
          <div className="hero-ledger" aria-label="Nads2Pay payroll workspace preview">
            <div className="ledger-topline"><span>Nads2Pay / April</span><span className="ledger-status"><i /> Workspace live</span></div>
            <div className="ledger-balance"><span>Committed this month</span><strong>$48,240</strong></div>
            <div className="ledger-rows"><div><span>Payroll run 04</span><strong>$32,800</strong><small>Ready for review</small></div><div><span>Contractors</span><strong>$9,440</strong><small>12 scheduled</small></div><div><span>Operating reserve</span><strong>$6,000</strong><small>Healthy</small></div></div>
            <div className="ledger-footer"><span>Next payroll run</span><strong>Friday · 09:00 UTC</strong></div>
          </div>
        </section>

        <div id="how-it-works" ref={storyRef} className="story-world">
          <div className="story-sky" aria-hidden="true" />
          <svg className="payment-trail" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
            <path className="trail-glow" d="M50 0 C92 100 10 190 54 290 S90 445 42 540 S12 710 62 805 S82 930 50 1000" />
            <motion.path style={{ pathLength: trailLength }} d="M50 0 C92 100 10 190 54 290 S90 445 42 540 S12 710 62 805 S82 930 50 1000" />
          </svg>
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
          <div className="monad-lines" aria-hidden="true"><i /><i /><i /></div>
          <div><h2>Built for<br />real operations.</h2><p>Nads2Pay brings payroll, payouts, and verifiable settlement together on Monad.</p><div className="text-links"><a href={`${ACTIVE_NETWORK.explorerUrl}/address/${NADPAY_ADDRESS}`} target="_blank" rel="noreferrer">View contract <ArrowUpRight size={16} /></a><a href="https://www.monad.xyz" target="_blank" rel="noreferrer">Learn about Monad <ArrowUpRight size={16} /></a></div></div>
        </section>

        <section className="final-cta">
          <h2>Make payroll<br />feel organized.</h2><p>Bring your team, policies, and next operation into Nads2Pay.</p><button type="button" className="primary-cta" onClick={startWorkspace} disabled={!ready}>{authenticated ? "Open your workspace" : "Create your workspace"} <ArrowUpRight size={18} /></button>
        </section>
      </main>

      <footer className="landing-footer"><nav aria-label="Footer"><a href="#how-it-works">How it works</a><a href={`${ACTIVE_NETWORK.explorerUrl}/address/${NADPAY_ADDRESS}`} target="_blank" rel="noreferrer">Contract</a><a href="https://www.monad.xyz" target="_blank" rel="noreferrer">Monad</a></nav><div className="footer-base"><span>Runs on Monad · verifiable money movement</span><span>© {new Date().getFullYear()} Nads2Pay</span></div></footer>
    </div>
  );
}

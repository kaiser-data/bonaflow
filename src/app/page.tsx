import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";

const modes = [
  {
    href: "/guest",
    label: "Guest",
    description: "Find suitable food with the shortest queue",
    number: "01",
  },
  {
    href: "/staff",
    label: "Staff",
    description: "Report availability, queues and replenishment",
    number: "02",
  },
  {
    href: "/ops",
    label: "Operations",
    description: "See stations, alerts and open tasks",
    number: "03",
  },
] as const;

export default function HomePage() {
  return (
    <main className="app-shell home-page">
      <header className="home-hero">
        <div className="brand-mark">B</div>
        <span className="eyebrow">8X × BELLA &amp; BONA · BERLIN</span>
        <h1>BonaFlow</h1>
        <p>RATE FOOD. GET REWARDS.</p>
      </header>
      <Link className="reward-cta" href="/feedback">
        <span>
          <strong>Rate your meal</strong>
          <small>Stars + real voice feedback → instant demo voucher</small>
        </span>
        <span className="direction-arrow" aria-hidden="true">→</span>
      </Link>
      <section className="mode-grid" aria-label="Choose a mode">
        {modes.map((mode) => (
          <Link href={mode.href} className="mode-card" key={mode.href}>
            <span className="mode-number">{mode.number}</span>
            <span>
              <strong>{mode.label}</strong>
              <small>{mode.description}</small>
            </span>
            <span className="direction-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>
      <section className="projector-qr" aria-label="Scan to rate food and get a demo reward">
        <span className="eyebrow">SCAN TO JOIN</span>
        {/* Generated for https://bonaflow.vercel.app/feedback and stored locally. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/feedback-qr.png" alt="QR code for the BonaFlow rated feedback and demo reward flow" />
        <h2>Rate food. Get your demo reward.</h2>
        <a href="https://bonaflow.vercel.app/feedback">bonaflow.vercel.app/feedback</a>
      </section>
      <Disclaimer />
    </main>
  );
}

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
        <p>Find food faster. Keep every station flowing.</p>
      </header>
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
      <Link className="feedback-link" href="/feedback">
        Share meal feedback
      </Link>
      <section className="qr-placeholder" aria-label="Guest QR coming after deployment">
        <span>GUEST QR</span>
        <p>Production QR appears here after the first deployment.</p>
      </section>
      <Disclaimer />
    </main>
  );
}

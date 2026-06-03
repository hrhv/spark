import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LandingNav, LandingFooter } from "./LandingShared";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "✦",
    title: "Template-based invitations",
    description:
      "Define event details once. Use {variables} to personalize the title, description, location, and timing for every recipient individually.",
  },
  {
    icon: "⌖",
    title: "Google Workspace directory",
    description:
      "Auto-complete recipients directly from your organization's directory. No CSV uploads, no copy-pasting email lists.",
  },
  {
    icon: "↗",
    title: "Live delivery tracking",
    description:
      "See exactly which invitations were created in real time. Each success links directly to the event in Google Calendar.",
  },
  {
    icon: "⬡",
    title: "Privacy-first by design",
    description:
      "No servers, no databases. All templates, campaigns, and recipient data live exclusively in your browser and your Google account.",
  },
];

const FAQS = [
  {
    q: "Is Spark free?",
    a: "Yes — completely. Spark is a privacy-first, open source platform that is free to use forever.",
  },
  {
    q: "What Google permissions does Spark request?",
    a: "Spark requests permission to create Google Calendar events on your behalf, and optionally to search your Google Workspace directory for recipient auto-complete. These permissions are required for Spark to function properly.",
  },
  {
    q: "Does Spark store any of my data?",
    a: "No. Spark has no backend servers or databases. All templates, campaigns, and recipient data are stored exclusively in your browser's localStorage and never leave your device.",
  },
  {
    q: "Can I use Spark with a personal Gmail account?",
    a: "Yes. You can create and send calendar invitations with any Google account. However, the Workspace directory auto-complete is only available on Google Workspace (formerly G Suite) accounts.",
  },
  {
    q: "How many invitations can I send at once?",
    a: "There's no limit in Spark. Google Calendar API rate limits apply at the API level — Spark includes a pacing delay between requests to stay within them automatically.",
  },
  {
    q: "What happens if a send fails for one recipient?",
    a: "Spark continues sending to the remaining recipients and reports exactly which addresses failed and why. Successful sends are never rolled back.",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Hero() {
  const navigate = useNavigate();
  return (
    <section className="lp-hero">
      <div className="lp-container">
        {/* <div className="lp-badge">Powered by Google Calendar API</div> */}
        <h1 className="lp-hero-h1">
          Send calendar invitations<br />at scale
        </h1>
        <p className="lp-hero-sub">
          Create personalized Google calendar invites for your entire team, clients,
          or community — using templates and variables — in minutes, not hours.
        </p>
        <div className="lp-hero-actions">
          <button
            className="lp-btn-primary lp-btn-lg"
            onClick={() => navigate("/login")}
          >
            Get started free
          </button>
          <a href="#features" className="lp-btn-ghost lp-btn-lg">
            Why Spark?
          </a>
        </div>
        <p className="lp-hero-note">Free forever · Open source · No setup required</p>

        {/* Template → personalized invitations visual */}
        <div className="lp-hero-visual" aria-hidden="true">

          {/* Row 1: the template (source) */}
          <div className="lp-tpl-card">
            <div className="lp-tpl-label">Template</div>

            <div className="lp-tpl-title">
              Q3 Kickoff with{" "}
              <span className="lp-var">{"{firstName}"}</span>
              {" "}<span className="lp-var">{"{lastName}"}</span>
            </div>

            <div className="lp-tpl-meta">
              📅{" "}<span className="lp-var">{"{eventDate}"}</span>
              {" · "}<span className="lp-var">{"{startTime}"}</span>
              {" – "}<span className="lp-var">{"{endTime}"}</span>
            </div>

            <div className="lp-tpl-meta">🎥 Google Meet video conferencing</div>

            <div className="lp-mock-divider" style={{ margin: "10px 0" }} />

            <div className="lp-tpl-body">
              Hi <span className="lp-var">{"{firstName}"}</span>, we're kicking off
              Q3 and would love to align on <span className="lp-var">{"{teamGoal}"}</span>{" "}
              together. Come prepared with your priorities for the quarter.
            </div>
          </div>

          {/* Arrow connector */}
          <div className="lp-arrow-row">
            <div className="lp-arrow-line" />
            <div className="lp-arrow-label">3 recipients → 3 personalized invitations</div>
            <div className="lp-arrow-line" />
          </div>

          {/* Row 2: personalized results */}
          <div className="lp-results-row">
            <div className="lp-result-card">
              <div className="lp-result-title">Q3 Kickoff with Alice Chen</div>
              <div className="lp-result-meta">📅 Mon, Sep 15 · 9:00 – 9:30 AM</div>
              <div className="lp-result-body">Hi Alice, we're kicking off Q3 and would love to align on <em>product roadmap</em>…</div>
              <div className="lp-result-footer">
                <span className="lp-mock-chip lp-mock-chip-green">✓ Sent</span>
                <a className="lp-result-link">Open ↗</a>
              </div>
            </div>

            <div className="lp-result-card">
              <div className="lp-result-title">Q3 Kickoff with Ben Park</div>
              <div className="lp-result-meta">📅 Tue, Sep 16 · 10:00 – 10:30 AM</div>
              <div className="lp-result-body">Hi Ben, we're kicking off Q3 and would love to align on <em>growth targets</em>…</div>
              <div className="lp-result-footer">
                <span className="lp-mock-chip lp-mock-chip-green">✓ Sent</span>
                <a className="lp-result-link">Open ↗</a>
              </div>
            </div>

            <div className="lp-result-card">
              <div className="lp-result-title">Q3 Kickoff with Carol Singh</div>
              <div className="lp-result-meta">📅 Wed, Sep 17 · 2:00 – 2:30 PM</div>
              <div className="lp-result-body">Hi Carol, we're kicking off Q3 and would love to align on <em>hiring plan</em>…</div>
              <div className="lp-result-footer">
                <span className="lp-mock-chip lp-mock-chip-green">✓ Sent</span>
                <a className="lp-result-link">Open ↗</a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="lp-features" id="features">
      <div className="lp-container">
        <div className="lp-section-eyebrow">Why Spark</div>
        <h2 className="lp-section-h2">Everything you need, nothing you don't</h2>
        <div className="lp-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-icon">{f.icon}</div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-faq-item${open ? " open" : ""}`}>
      <button className="lp-faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className="lp-faq-chevron">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="lp-faq-a">{a}</div>}
    </div>
  );
}

function FAQ() {
  return (
    <section className="lp-faq" id="faq">
      <div className="lp-container lp-container-sm">
        <div className="lp-section-eyebrow">FAQ</div>
        <h2 className="lp-section-h2">Frequently asked questions</h2>
        <div className="lp-faq-list">
          {FAQS.map(item => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="lp-root">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <FAQ />
      </main>
      <LandingFooter />
    </div>
  );
}

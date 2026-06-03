import { LandingNav, LandingFooter } from "./LandingShared";

export function PrivacyPolicy() {
  return (
    <div className="lp-root">
      <LandingNav />
      <main className="legal-main">
        <div className="legal-container">
          <p className="legal-back"><a href="/">← Back to home</a></p>

          <h1 className="legal-h1">Privacy Policy</h1>
          <p className="legal-date">Effective date: June 3, 2026</p>

          <p className="legal-p">
            Spark is built with privacy as a first principle. This policy explains what information we
            handle, how we handle it, and — importantly — what we deliberately do <em>not</em> do with it.
          </p>

          <section className="legal-section">
            <h2 className="legal-h2">1. The Short Version</h2>
            <p className="legal-p">
              Spark has <strong>no backend servers and no databases</strong>. We cannot read, access, or
              sell your data because we never receive it. All templates, campaigns, and recipient lists
              live exclusively in your browser's localStorage on your own device. The only external
              communication Spark performs is directly between your browser and Google's APIs, using
              credentials you explicitly grant.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">2. Information We Access</h2>

            <h3 className="legal-h3">2.1 Google Account Information</h3>
            <p className="legal-p">
              When you sign in with Google, Spark receives your basic profile from Google's OAuth service:
              your name, email address, and profile photo. This information is stored in your browser's
              localStorage so Spark can display your name in the interface and know you are authenticated.
              It is never transmitted to any Spark server.
            </p>

            <h3 className="legal-h3">2.2 Google Calendar</h3>
            <p className="legal-p">
              Spark requests permission to create Google Calendar events on your behalf. When you run a
              campaign, your browser communicates directly with the Google Calendar API to create events.
              Spark does not receive, log, or store any information about the events created. The events
              live solely in your Google Calendar and those of your recipients.
            </p>

            <h3 className="legal-h3">2.3 Google Workspace Directory</h3>
            <p className="legal-p">
              If you are on a Google Workspace account, Spark may request permission to search your
              organisation's directory to auto-complete recipient email addresses. Directory search queries
              are made directly from your browser to Google's People API. No directory data is retained
              beyond your current browser session.
            </p>

            <h3 className="legal-h3">2.4 Data You Enter</h3>
            <p className="legal-p">
              Templates, variable mappings, campaign records, and recipient email addresses are stored
              exclusively in your browser's localStorage. This data never leaves your device. You can
              delete it at any time by clearing your browser data or using Spark's built-in export and
              delete tools.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">3. What We Do Not Collect</h2>
            <ul className="legal-ul">
              <li>We do not set any cookies — Spark has no backend session management</li>
              <li>We do not receive or store the content of calendar invitations you send</li>
              <li>We do not share any information with third parties, because we have no information to share</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">4. Third-Party Services</h2>
            <p className="legal-p">
              Spark relies solely on Google's services (OAuth, Calendar API, People API). Your use of
              these services is subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.
              Spark has no relationship with any other third-party service providers.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">5. Data Retention and Deletion</h2>
            <p className="legal-p">
              Because all data is stored in your browser's localStorage, you are in complete control of
              its retention. You can:
            </p>
            <ul className="legal-ul">
              <li>Export your data at any time using Spark's built-in export feature</li>
              <li>Delete individual campaigns or templates from within the app</li>
              <li>Clear all Spark data by clearing your browser's site data for the Spark domain</li>
              <li>Revoke Spark's Google permissions at any time via <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account settings</a></li>
            </ul>
            <p className="legal-p">
              Revoking Google permissions and clearing your browser data completely removes all traces of
              Spark from your device. There is no account to delete on our end.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">6. Security</h2>
            <p className="legal-p">
              Because Spark operates without a backend, there is no central server that could be
              compromised to expose your data. Your information is as secure as your own device and your
              Google account. We recommend:
            </p>
            <ul className="legal-ul">
              <li>Using a strong, unique password for your Google account</li>
              <li>Enabling two-factor authentication on your Google account</li>
              <li>Not using Spark on shared or public computers</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">7. Children's Privacy</h2>
            <p className="legal-p">
              Spark is not intended for users under the age of 13. We do not knowingly collect or process
              information from children under 13. If you believe a child has used Spark, they can simply
              revoke Google permissions and clear browser data — no further action is needed on our end.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">8. Changes to This Policy</h2>
            <p className="legal-p">
              If we update this Privacy Policy, we will post the revised version here with an updated
              effective date. Since we collect no contact information, we cannot notify you directly.
              We recommend checking this page periodically.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">9. Contact</h2>
            <p className="legal-p">
              If you have questions or concerns about this Privacy Policy, please reach out via the
              project's GitHub repository or the contact information on the Spark homepage.
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

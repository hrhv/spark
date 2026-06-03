import { LandingNav, LandingFooter } from "./LandingShared";

export function TermsOfService() {
  return (
    <div className="lp-root">
      <LandingNav />
      <main className="legal-main">
        <div className="legal-container">
          <p className="legal-back"><a href="/">← Back to home</a></p>

          <h1 className="legal-h1">Terms of Service</h1>
          <p className="legal-date">Effective date: June 3, 2026</p>

          <p className="legal-p">
            Welcome to Spark. By accessing or using Spark (the "Service"), you agree to be bound by these
            Terms of Service ("Terms"). Please read them carefully before using the Service.
          </p>

          <section className="legal-section">
            <h2 className="legal-h2">1. Scope of Service</h2>
            <p className="legal-p">
              Spark is a free, open source platform that enables users to send bulk, personalized Google
              Calendar invitations using templates and variables. The Service operates entirely within your
              browser and communicates directly with Google's APIs on your behalf. Spark does not operate
              any backend servers, store your data, or retain any information beyond what your browser's
              local storage holds locally on your device.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">2. Eligibility</h2>
            <p className="legal-p">To use Spark, you must:</p>
            <ul className="legal-ul">
              <li>Be at least 13 years old, or the minimum legal age in your jurisdiction</li>
              <li>Hold a valid Google account and agree to Google's Terms of Service</li>
              <li>Have the legal authority to enter into this agreement</li>
              <li>Comply with all applicable laws and regulations in your jurisdiction</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">3. Google Account and Permissions</h2>
            <p className="legal-p">
              Spark uses Google OAuth 2.0 to authenticate you. By signing in, you grant Spark permission to:
            </p>
            <ul className="legal-ul">
              <li>Read your basic Google profile (name, email, profile photo)</li>
              <li>Create and manage Google Calendar events on your behalf</li>
              <li>Search your Google Workspace directory (if applicable and permitted)</li>
            </ul>
            <p className="legal-p">
              These permissions are used solely to provide the Service. You may revoke access at any time
              via your Google Account settings at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">4. User Responsibilities</h2>
            <p className="legal-p">You agree to use Spark only for lawful purposes. Specifically, you agree to:</p>
            <ul className="legal-ul">
              <li>Send calendar invitations only to recipients who have consented to receive them</li>
              <li>Comply with anti-spam laws in your jurisdiction (including CAN-SPAM, GDPR, and similar)</li>
              <li>Respect the privacy and rights of your recipients</li>
              <li>Not use the Service to harass, deceive, or harm others</li>
              <li>Not use the Service to send unsolicited bulk communications</li>
              <li>Ensure the content of your invitations complies with all applicable laws</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">5. Prohibited Activities</h2>
            <p className="legal-p">You may not:</p>
            <ul className="legal-ul">
              <li>Use the Service for illegal, fraudulent, or unauthorized purposes</li>
              <li>Attempt to circumvent or abuse Google's API rate limits or Terms of Service</li>
              <li>Use Spark to distribute spam, phishing content, or malicious links</li>
              <li>Reverse engineer, copy, or redistribute the Spark codebase in violation of its open-source license</li>
              <li>Engage in any activity that harms or disrupts the Service or other users</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">6. Intellectual Property</h2>
            <p className="legal-p">
              The Spark interface, design, and source code are the intellectual property of their respective
              owners. Spark is provided as open-source software. Your templates, recipient lists, and
              campaign data belong entirely to you and remain on your device — Spark claims no ownership
              over your content.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">7. No Warranties — Service Provided "As Is"</h2>
            <p className="legal-p">
              The Service is provided "as is" and "as available" without warranties of any kind, express or
              implied. We do not guarantee that the Service will be uninterrupted, error-free, or that
              calendar invitations will be successfully delivered to all recipients. Delivery depends on
              Google's Calendar API, which is subject to Google's own availability and rate limits.
            </p>
            <p className="legal-p">
              Spark does not review, endorse, or take responsibility for the content of invitations you
              create and send. You are solely responsible for your use of the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">8. Limitation of Liability</h2>
            <p className="legal-p">
              To the fullest extent permitted by applicable law, Spark and its contributors shall not be
              liable for any indirect, incidental, special, consequential, or punitive damages arising from
              your use of the Service, including but not limited to loss of data, failed invitations, or
              unauthorized access to your Google account.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">9. Termination</h2>
            <p className="legal-p">
              Because Spark stores no data on servers, you can stop using the Service at any time by
              revoking its Google permissions and clearing your browser's local storage. There is nothing to
              "delete" on our end, as we hold no data about you.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">10. Changes to These Terms</h2>
            <p className="legal-p">
              We may update these Terms from time to time. Changes will be posted on this page with a
              revised effective date. Continued use of the Service after changes are posted constitutes
              your acceptance of the updated Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">11. Governing Law</h2>
            <p className="legal-p">
              These Terms are governed by applicable law. Any disputes arising from use of the Service
              shall be resolved in accordance with the laws of the jurisdiction in which the user resides,
              to the extent permitted by law.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-h2">12. Contact</h2>
            <p className="legal-p">
              If you have questions about these Terms, please reach out via the project's GitHub repository
              or the contact information provided on the Spark homepage.
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

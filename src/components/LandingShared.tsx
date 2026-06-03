import { useNavigate } from "react-router-dom";
import sparkLogo from "../assets/spark-logo.svg";
import { useAuth } from "../context/AuthContext";

export function LandingNav() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <header className="lp-nav">
      <div className="lp-nav-inner">
        <a href="/" className="lp-brand" aria-label="Spark home">
          <img src={sparkLogo} alt="" className="lp-brand-logo" />
          <span className="lp-brand-name">Spark</span>
        </a>

        <nav className="lp-nav-links" aria-label="Main">
          <a href="/#features" className="lp-nav-link">Features</a>
          <a href="/#faq"      className="lp-nav-link">FAQ</a>
        </nav>

        <div className="lp-nav-actions">
          {user
            ? <button className="lp-btn-primary" onClick={() => navigate("/dashboard/campaigns")}>Dashboard →</button>
            : <button className="lp-btn-primary" onClick={() => navigate("/login")}>Login</button>
          }
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand-col">
          <a href="/" className="lp-brand" aria-label="Spark home">
            <img src={sparkLogo} alt="" className="lp-brand-logo" />
            <span className="lp-brand-name">Spark</span>
          </a>
          <p className="lp-footer-desc">
            Bulk calendar invitations — personalized, tracked, and
            delivered directly from your existing Google accounts.
          </p>
          <p className="lp-footer-copy">Copyright © {new Date().getFullYear()} Spark. All rights reserved.</p>
        </div>

        <div className="lp-footer-cols">
          <div className="lp-footer-col">
            <div className="lp-footer-col-heading">Product</div>
            <a href="/#features" className="lp-footer-link">Features</a>
            <a href="/#faq"      className="lp-footer-link">FAQ</a>
          </div>
          <div className="lp-footer-col">
            <div className="lp-footer-col-heading">Company</div>
            <a href="/terms-of-service" className="lp-footer-link">Terms of Service</a>
            <a href="/privacy-policy"   className="lp-footer-link">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

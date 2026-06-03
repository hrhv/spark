/**
 * Header Component
 */

import { useGoogleAuth } from "@hooks/index";

export default function Header() {
  const { isAuthenticated, logout } = useGoogleAuth();

  return (
    <header className="header">
      <div className="container header-content">
        <div className="header-brand">
          <h1>📅 Spark | Bulk Calendar Invitations. Personalized for each recipient. Privacy-first.</h1>
          <p className="tagline">Privacy-first, open-source bulk calendar invites</p>
        </div>

        {isAuthenticated && (
          <button className="btn btn-secondary" onClick={logout}>
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}

const styles = `
  .header {
    background-color: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    padding: var(--spacing-xl) 0;
    margin-bottom: var(--spacing-2xl);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-brand {
    flex: 1;
  }

  .header-brand h1 {
    margin-bottom: var(--spacing-xs);
  }

  .tagline {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      gap: var(--spacing-lg);
      text-align: center;
    }
  }
`;

const styleElement = document.createElement("style");
styleElement.textContent = styles;
document.head.appendChild(styleElement);

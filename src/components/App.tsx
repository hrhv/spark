/**
 * Main App Component
 * Orchestrates the entire bulk invite workflow
 */

import { useState, useEffect } from "react";
import { useGoogleAuth, useCampaign } from "@hooks/index";
import {
  validateGoogleConfig,
  getGoogleAuthURL,
  handleOAuthCallback,
} from "@utils/googleCalendar";
import Header from "@components/Header";
import CSVUploader from "@components/CSVUploader";
import TemplateEditor from "@components/TemplateEditor";
import InvitePreview from "@components/InvitePreview";
import BulkSendForm from "@components/BulkSendForm";
import "@styles/global.css";

type AppStep = "auth" | "import" | "template" | "preview" | "send" | "done";

export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>("auth");
  const { isAuthenticated: isAuth, error: authError, login } = useGoogleAuth();
  const { invitees, template, campaign, setInvitees, setTemplate } =
    useCampaign();

  // Handle OAuth callback on mount
  useEffect(() => {
    const token = handleOAuthCallback();
    if (token) {
      login(token);
    }
  }, [login]);

  // Check Google config on mount
  const googleConfig = validateGoogleConfig();

  const canProceedFromAuth = isAuth && googleConfig.isValid;
  const canProceedFromImport = invitees.length > 0;
  const canProceedFromTemplate = template !== null;

  const handleStepChange = (step: AppStep) => {
    setCurrentStep(step);
  };

  const handleAuthSuccess = () => {
    handleStepChange("import");
  };

  const handleCSVImport = (importedInvitees: any[]) => {
    setInvitees(importedInvitees);
    handleStepChange("template");
  };

  const handleTemplateCreate = (newTemplate: any) => {
    setTemplate(newTemplate);
    handleStepChange("preview");
  };

  const handlePreviewNext = () => {
    handleStepChange("send");
  };

  const handleSendComplete = () => {
    handleStepChange("done");
  };

  return (
    <div className="app">
      <Header />

      <main className="container">
        {/* Configuration errors */}
        {googleConfig.errors.length > 0 && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <div>
              <strong>Configuration Error:</strong>
              <p>{googleConfig.errors.join(", ")}</p>
              <p style={{ fontSize: "0.85rem", marginBottom: 0 }}>
                Please set up your Google OAuth credentials in the environment
                variables.
              </p>
            </div>
          </div>
        )}

        {/* Auth errors */}
        {authError && (
          <div className="alert alert-error">
            <span>❌</span>
            <div>
              <strong>Authentication Error:</strong>
              <p>{authError}</p>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="step-indicator">
          <StepIndicatorDot
            step={1}
            label="Sign In"
            active={currentStep === "auth"}
            completed={isAuth}
            onClick={() => handleStepChange("auth")}
          />
          <StepIndicatorLine completed={isAuth} />

          <StepIndicatorDot
            step={2}
            label="Import CSV"
            active={currentStep === "import"}
            completed={invitees.length > 0}
            disabled={!canProceedFromAuth}
            onClick={() => canProceedFromAuth && handleStepChange("import")}
          />
          <StepIndicatorLine completed={invitees.length > 0} />

          <StepIndicatorDot
            step={3}
            label="Create Template"
            active={currentStep === "template"}
            completed={template !== null}
            disabled={!canProceedFromImport}
            onClick={() => canProceedFromImport && handleStepChange("template")}
          />
          <StepIndicatorLine completed={template !== null} />

          <StepIndicatorDot
            step={4}
            label="Preview & Send"
            active={currentStep === "preview" || currentStep === "send"}
            completed={campaign?.status === "completed"}
            disabled={!canProceedFromTemplate}
            onClick={() =>
              canProceedFromTemplate && handleStepChange("preview")
            }
          />
        </div>

        {/* Content sections */}
        <div className="step-content">
          {currentStep === "auth" && (
            <AuthSection
              isAuthenticated={isAuth}
              onSuccess={handleAuthSuccess}
            />
          )}

          {currentStep === "import" && (
            <CSVUploader onImport={handleCSVImport} />
          )}

          {currentStep === "template" && (
            <TemplateEditor
              invitees={invitees}
              onTemplateCreate={handleTemplateCreate}
            />
          )}

          {currentStep === "preview" && (
            <InvitePreview
              template={template!}
              invitees={invitees}
              onNext={handlePreviewNext}
            />
          )}

          {currentStep === "send" && (
            <BulkSendForm
              template={template!}
              invitees={invitees}
              onComplete={handleSendComplete}
            />
          )}

          {currentStep === "done" && (
            <CompletionSection
              campaign={campaign}
              onStartOver={() => handleStepChange("auth")}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Sub-components

function AuthSection({
  isAuthenticated,
  onSuccess,
}: {
  isAuthenticated: boolean;
  onSuccess: () => void;
}) {
  if (isAuthenticated) {
    return (
      <div className="card">
        <h2>✓ Signed in with Google</h2>
        <p>Your calendar is ready to receive invitations.</p>
        <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
          <strong>Privacy note:</strong> Your data stays on your device. We
          never store your calendar or invitee information.
        </p>
        <button className="btn btn-primary" onClick={onSuccess}>
          Continue to Import CSV →
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Sign in with Google</h2>
      <p>
        Connect your Google Calendar to send bulk invitations. Your data never
        leaves your device.
      </p>
      <a href={getGoogleAuthURL(window.location.origin)} className="btn btn-primary">
        Sign in with Google
      </a>
    </div>
  );
}

function StepIndicatorDot({
  step,
  label,
  active,
  completed,
  disabled,
  onClick,
}: {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`step-dot ${active ? "active" : ""} ${
        completed ? "completed" : ""
      } ${disabled ? "disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      {completed ? "✓" : step}
      <span className="step-label">{label}</span>
    </button>
  );
}

function StepIndicatorLine({ completed }: { completed: boolean }) {
  return (
    <div
      className={`step-line ${completed ? "completed" : ""}`}
      style={{ flexGrow: 1 }}
    ></div>
  );
}

function CompletionSection({
  campaign,
  onStartOver,
}: {
  campaign: any;
  onStartOver: () => void;
}) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <h2>✓ Campaign Completed</h2>
      {campaign && (
        <div className="campaign-summary">
          <div className="summary-stat">
            <span className="stat-value" style={{ color: "#10b981" }}>
              {campaign.successCount}
            </span>
            <span className="stat-label">Invitations Sent</span>
          </div>
          {campaign.failureCount > 0 && (
            <div className="summary-stat">
              <span className="stat-value" style={{ color: "#ef4444" }}>
                {campaign.failureCount}
              </span>
              <span className="stat-label">Failed</span>
            </div>
          )}
        </div>
      )}
      <button className="btn btn-primary" onClick={onStartOver}>
        Send Another Campaign
      </button>
    </div>
  );
}

// Styles for this component
const styles = `
  .app {
    min-height: 100vh;
    padding-bottom: 2rem;
  }

  .step-indicator {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 2rem 0 3rem;
    padding: 1.5rem;
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
  }

  .step-dot {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: var(--color-bg-tertiary);
    border: 2px solid var(--color-border);
    color: var(--color-text-secondary);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all var(--transition-normal);
  }

  .step-dot.active {
    border-color: var(--color-accent);
    color: var(--color-accent);
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
  }

  .step-dot.completed {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
  }

  .step-dot.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .step-label {
    position: absolute;
    top: 100%;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
    margin-top: 0.5rem;
  }

  .step-line {
    height: 2px;
    background-color: var(--color-border);
    transition: background-color var(--transition-normal);
  }

  .step-line.completed {
    background-color: var(--color-accent);
  }

  .step-content {
    animation: fadeIn 300ms ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .campaign-summary {
    display: flex;
    justify-content: center;
    gap: 3rem;
    margin: 2rem 0;
  }

  .summary-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: 700;
  }

  .stat-label {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin-top: 0.5rem;
  }
`;

// Inject styles
const styleElement = document.createElement("style");
styleElement.textContent = styles;
document.head.appendChild(styleElement);

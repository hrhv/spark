/**
 * Bulk Send Form Component
 */

import { useState, useEffect } from "react";
import { renderTemplate } from "@utils/templateEngine";
import { buildCalendarEvent, createCalendarEvent } from "@utils/googleCalendar";
import { InviteTemplate, Invitee, CampaignError } from "@/types";

interface BulkSendFormProps {
  template: InviteTemplate;
  invitees: Invitee[];
  onComplete: () => void;
}

interface SendProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  currentEmail?: string;
  errors: CampaignError[];
}

export default function BulkSendForm({
  template,
  invitees,
  onComplete,
}: BulkSendFormProps) {
  const [progress, setProgress] = useState<SendProgress>({
    total: invitees.length,
    completed: 0,
    successful: 0,
    failed: 0,
    errors: [],
  });
  const [isSending, setIsSending] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const progressPercent = Math.round(
    (progress.completed / progress.total) * 100
  );

  const handleSendAll = async () => {
    setHasStarted(true);
    setIsSending(true);

    const newErrors: CampaignError[] = [];
    let successful = 0;
    let completed = 0;

    for (const invitee of invitees) {
      try {
        setProgress((prev) => ({
          ...prev,
          currentEmail: invitee.email,
        }));

        // Render template for this invitee
        const { rendered } = renderTemplate(template.body, invitee);

        // Build calendar event
        const event = buildCalendarEvent(
          invitee,
          template.title,
          rendered,
          template.startTime,
          template.endTime,
          template.location,
          template.meetingLink
        );

        // Create event
        const result = await createCalendarEvent(event);

        if (result.success) {
          successful++;
        } else {
          newErrors.push({
            email: invitee.email,
            error: result.error || "Unknown error",
            timestamp: new Date(),
          });
        }
      } catch (error) {
        newErrors.push({
          email: invitee.email,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date(),
        });
      }

      completed++;

      setProgress({
        total: invitees.length,
        completed,
        successful,
        failed: newErrors.length,
        currentEmail: invitee.email,
        errors: newErrors,
      });

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setIsSending(false);
  };

  return (
    <div className="card">
      <h2>Send Invitations</h2>
      <p>
        {invitees.length} invitations will be created in your Google Calendar
        and sent to the recipients.
      </p>

      {/* Pre-send checklist */}
      {!hasStarted && (
        <div className="checklist">
          <h3>Before you send:</h3>
          <div className="check-item">
            <span className="check-mark">✓</span>
            <span>Reviewed invitation template and preview</span>
          </div>
          <div className="check-item">
            <span className="check-mark">✓</span>
            <span>Verified all {invitees.length} recipient emails</span>
          </div>
          <div className="check-item">
            <span className="check-mark">✓</span>
            <span>Google Calendar is authenticated and ready</span>
          </div>
        </div>
      )}

      {/* Progress section */}
      {hasStarted && (
        <div className="progress-section">
          <div className="progress-header">
            <div>
              <h3>Sending in progress...</h3>
              {progress.currentEmail && (
                <p className="current-email">Current: {progress.currentEmail}</p>
              )}
            </div>
            <div className="progress-stats">
              <div className="stat">
                <span className="stat-num" style={{ color: "#10b981" }}>
                  {progress.successful}
                </span>
                <span className="stat-label">Sent</span>
              </div>
              <div className="stat">
                <span className="stat-num" style={{ color: "#ef4444" }}>
                  {progress.failed}
                </span>
                <span className="stat-label">Failed</span>
              </div>
              <div className="stat">
                <span className="stat-num">{progress.completed}</span>
                <span className="stat-label">of {progress.total}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="progress-percent">{progressPercent}%</p>

          {/* Error log */}
          {progress.errors.length > 0 && (
            <div className="errors-section">
              <h4>Errors ({progress.errors.length})</h4>
              <div className="error-list">
                {progress.errors.slice(0, 10).map((err, i) => (
                  <div key={i} className="error-item">
                    <strong>{err.email}:</strong> {err.error}
                  </div>
                ))}
                {progress.errors.length > 10 && (
                  <p className="more-errors">
                    ... and {progress.errors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="actions" style={{ marginTop: "2rem" }}>
        <button
          className="btn btn-primary"
          onClick={handleSendAll}
          disabled={isSending || (hasStarted && !isSending)}
        >
          {!hasStarted && "Send All Invitations"}
          {isSending && "Sending..."}
          {hasStarted && !isSending && "✓ Complete"}
        </button>

        {!hasStarted && (
          <button
            className="btn btn-secondary"
            onClick={() => window.history.back()}
          >
            Back
          </button>
        )}

        {hasStarted && !isSending && (
          <button className="btn btn-secondary" onClick={onComplete}>
            View Results
          </button>
        )}
      </div>

      {/* Privacy notice */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "var(--color-bg-tertiary)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.9rem",
          color: "var(--color-text-secondary)",
        }}
      >
        <strong>🔒 Privacy:</strong> All invitations are created directly from
        your browser to your Google Calendar. No data is sent to any server.
      </div>
    </div>
  );
}

const styles = `
  .checklist {
    padding: 1.5rem;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-lg);
    margin: 2rem 0;
  }

  .checklist h3 {
    margin-top: 0;
  }

  .check-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 0;
    font-size: 0.95rem;
  }

  .check-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background-color: var(--color-accent);
    color: white;
    border-radius: 50%;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .progress-section {
    padding: 2rem;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-lg);
    margin: 2rem 0;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .progress-header h3 {
    margin-top: 0;
  }

  .current-email {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin: 0.5rem 0 0 0;
    word-break: break-all;
  }

  .progress-stats {
    display: flex;
    gap: 1.5rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .stat-num {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin-top: 0.25rem;
  }

  .progress-bar-container {
    width: 100%;
    height: 8px;
    background-color: var(--color-bg-secondary);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent), var(--color-accent-hover));
    transition: width 300ms ease-out;
  }

  .progress-percent {
    text-align: right;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-accent);
  }

  .errors-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
  }

  .errors-section h4 {
    margin-top: 0;
  }

  .error-list {
    max-height: 200px;
    overflow-y: auto;
    font-size: 0.85rem;
  }

  .error-item {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    background-color: rgba(239, 68, 68, 0.1);
    border-left: 3px solid var(--color-error);
    border-radius: 2px;
  }

  .more-errors {
    text-align: center;
    color: var(--color-text-secondary);
    margin: 0.5rem 0 0 0;
  }

  .actions {
    display: flex;
    gap: 1rem;
  }
`;

const styleElement = document.createElement("style");
styleElement.textContent = styles;
document.head.appendChild(styleElement);

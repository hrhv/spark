/**
 * Invite Preview Component
 */

import { useState } from "react";
import { renderTemplate } from "@utils/templateEngine";
import { InviteTemplate, Invitee } from "@/types";

interface InvitePreviewProps {
  template: InviteTemplate;
  invitees: Invitee[];
  onNext: () => void;
}

export default function InvitePreview({
  template,
  invitees,
  onNext,
}: InvitePreviewProps) {
  const [selectedInviteeIndex, setSelectedInviteeIndex] = useState(0);

  const selectedInvitee = invitees[selectedInviteeIndex];
  const { rendered } = renderTemplate(template.body, selectedInvitee);

  return (
    <div className="card">
      <h2>Preview Invitations</h2>
      <p>Review how your invitations will look for each recipient.</p>

      {/* Invitee selector */}
      <div className="preview-selector">
        <label>Select invitee to preview:</label>
        <select
          value={selectedInviteeIndex}
          onChange={(e) => setSelectedInviteeIndex(Number(e.target.value))}
        >
          {invitees.map((inv, i) => (
            <option key={i} value={i}>
              {inv.firstName} {inv.lastName} ({inv.email})
            </option>
          ))}
        </select>
      </div>

      {/* Preview card */}
      <div className="preview-container">
        <div className="preview-header">
          <div>
            <h3>{template.title}</h3>
            {template.description && <p className="description">{template.description}</p>}
          </div>
        </div>

        <div className="preview-details">
          {template.startTime && (
            <div className="detail-row">
              <span className="detail-label">📅 When:</span>
              <span className="detail-value">
                {new Date(template.startTime).toLocaleString()}
              </span>
            </div>
          )}

          {template.location && (
            <div className="detail-row">
              <span className="detail-label">📍 Where:</span>
              <span className="detail-value">{template.location}</span>
            </div>
          )}

          {template.meetingLink && (
            <div className="detail-row">
              <span className="detail-label">🔗 Link:</span>
              <a href={template.meetingLink} target="_blank" rel="noopener noreferrer">
                {template.meetingLink}
              </a>
            </div>
          )}
        </div>

        <div className="preview-body">
          <h4>Message:</h4>
          <div className="message-box">
            <pre>{rendered}</pre>
          </div>
        </div>

        <div className="preview-footer">
          <strong>To:</strong> {selectedInvitee.email}
        </div>
      </div>

      {/* Summary */}
      <div className="preview-summary">
        <h3>Summary</h3>
        <div className="summary-items">
          <div className="summary-item">
            <span className="summary-label">Recipients:</span>
            <span className="summary-value">{invitees.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Variables:</span>
            <span className="summary-value">
              {template.body.match(/\{[^}]+\}/g)?.length || 0}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Template:</span>
            <span className="summary-value">{template.title}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button className="btn btn-secondary" onClick={() => window.history.back()}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={onNext}>
          Send Invitations →
        </button>
      </div>
    </div>
  );
}

const styles = `
  .preview-selector {
    margin: 1.5rem 0;
    padding: 1rem;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .preview-selector label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .preview-selector select {
    width: 100%;
  }

  .preview-container {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin: 2rem 0;
    background-color: var(--color-bg-tertiary);
  }

  .preview-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
  }

  .preview-header h3 {
    margin: 0 0 0.25rem 0;
  }

  .preview-header .description {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .preview-details {
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
  }

  .detail-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
    font-size: 0.95rem;
  }

  .detail-row:last-child {
    margin-bottom: 0;
  }

  .detail-label {
    font-weight: 500;
    color: var(--color-text-secondary);
    min-width: 100px;
  }

  .detail-value {
    color: var(--color-text-primary);
  }

  .preview-body {
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .preview-body h4 {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
  }

  .message-box {
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    padding: 1rem;
    overflow-x: auto;
  }

  .message-box pre {
    margin: 0;
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    font-size: 0.9rem;
    white-space: pre-wrap;
    word-wrap: break-word;
    line-height: 1.6;
  }

  .preview-footer {
    padding: 1rem 1.5rem;
    background-color: var(--color-bg-secondary);
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }

  .preview-summary {
    padding: 1.5rem;
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    margin: 2rem 0;
  }

  .preview-summary h3 {
    margin-top: 0;
  }

  .summary-items {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .summary-label {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .summary-value {
    font-weight: 600;
    color: var(--color-accent);
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }
`;

const styleElement = document.createElement("style");
styleElement.textContent = styles;
document.head.appendChild(styleElement);

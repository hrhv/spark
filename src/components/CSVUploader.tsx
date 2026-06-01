/**
 * CSV Uploader Component
 */

import { useState, useRef } from "react";
import {
  parseCSV,
  csvToInvitees,
  validateInvitees,
  inviteesToCSV,
} from "@utils/csvParser";
import { Invitee, ValidationResult } from "@/types";

interface CSVUploaderProps {
  onImport: (invitees: Invitee[]) => void;
}

export default function CSVUploader({ onImport }: CSVUploaderProps) {
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const text = await file.text();
      const parsed = parseCSV(text);
      const newInvitees = csvToInvitees(parsed);
      const validationResult = validateInvitees(newInvitees);

      setInvitees(newInvitees);
      setValidation(validationResult);

      if (!validationResult.isValid) {
        setError("Please fix the validation errors before proceeding.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
      setInvitees([]);
      setValidation(null);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `email,firstName,lastName,department
john@example.com,John,Doe,Engineering
jane@example.com,Jane,Smith,Marketing`;

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(template)
    );
    element.setAttribute("download", "invitees_template.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadCurrentData = () => {
    if (invitees.length === 0) return;

    const csv = inviteesToCSV(invitees);
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    );
    element.setAttribute("download", "invitees.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const canProceed = invitees.length > 0 && validation?.isValid;

  return (
    <div className="card">
      <h2>Import Invitees</h2>
      <p>Upload a CSV file with email, firstName, and lastName columns.</p>

      {/* File upload */}
      <div className="upload-area">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />
        <button
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          📂 Choose CSV File
        </button>
        <p style={{ fontSize: "0.9rem" }}>
          or drag and drop a CSV file here
        </p>
      </div>

      {/* Template download */}
      <div style={{ marginTop: "1rem" }}>
        <button className="btn btn-secondary" onClick={handleDownloadTemplate}>
          📥 Download Template
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-error">
          <span>❌</span>
          <div>{error}</div>
        </div>
      )}

      {/* Validation results */}
      {validation && invitees.length > 0 && (
        <div className="validation-results">
          <div className="result-row">
            <span>✓ Invitees loaded:</span>
            <strong>{invitees.length}</strong>
          </div>

          {validation.errors.length > 0 && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <div>
                <strong>Errors ({validation.errors.length}):</strong>
                <ul style={{ margin: "0.5rem 0 0 1.5rem" }}>
                  {validation.errors.slice(0, 5).map((err, i) => (
                    <li key={i} style={{ fontSize: "0.9rem" }}>
                      {err}
                    </li>
                  ))}
                  {validation.errors.length > 5 && (
                    <li>
                      ... and {validation.errors.length - 5} more errors
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="alert alert-warning">
              <span>⚠️</span>
              <div>
                <strong>Warnings ({validation.warnings.length}):</strong>
                <ul style={{ margin: "0.5rem 0 0 1.5rem" }}>
                  {validation.warnings.slice(0, 5).map((warn, i) => (
                    <li key={i} style={{ fontSize: "0.9rem" }}>
                      {warn}
                    </li>
                  ))}
                  {validation.warnings.length > 5 && (
                    <li>
                      ... and {validation.warnings.length - 5} more warnings
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data preview table */}
      {invitees.length > 0 && (
        <div className="data-preview">
          <h3>Preview ({invitees.length} rows)</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Custom Fields</th>
                </tr>
              </thead>
              <tbody>
                {invitees.slice(0, 5).map((inv, i) => (
                  <tr key={i}>
                    <td>{inv.email}</td>
                    <td>{inv.firstName}</td>
                    <td>{inv.lastName}</td>
                    <td>
                      {Object.keys(inv.customFields).length > 0
                        ? `${Object.keys(inv.customFields).length} field(s)`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invitees.length > 5 && (
            <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
              Showing 5 of {invitees.length} rows
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="actions" style={{ marginTop: "2rem" }}>
        {invitees.length > 0 && (
          <button className="btn btn-secondary" onClick={handleDownloadCurrentData}>
            📥 Download as CSV
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={() => canProceed && onImport(invitees)}
          disabled={!canProceed}
        >
          Continue to Template →
        </button>
      </div>
    </div>
  );
}

const styles = `
  .upload-area {
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
    padding: 3rem 2rem;
    text-align: center;
    margin: 2rem 0;
    transition: all var(--transition-normal);
  }

  .upload-area:hover {
    border-color: var(--color-accent);
    background-color: rgba(16, 185, 129, 0.05);
  }

  .validation-results {
    margin: 2rem 0;
    padding: 1rem;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .result-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    font-size: 0.95rem;
  }

  .data-preview {
    margin: 2rem 0;
  }

  .table-container {
    overflow-x: auto;
    margin: 1rem 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  thead {
    background-color: var(--color-bg-tertiary);
  }

  th {
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--color-border);
  }

  tbody tr:hover {
    background-color: rgba(16, 185, 129, 0.05);
  }

  .actions {
    display: flex;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .upload-area {
      padding: 2rem 1rem;
    }

    .table-container {
      font-size: 0.8rem;
    }

    th, td {
      padding: 0.5rem;
    }
  }
`;

const styleElement = document.createElement("style");
styleElement.textContent = styles;
document.head.appendChild(styleElement);

/**
 * Template Editor Component
 */

import { useState } from "react";
import {
  extractVariables,
  validateTemplate,
  suggestVariables,
} from "@utils/templateEngine";
import { InviteTemplate, Invitee } from "@/types";

interface TemplateEditorProps {
  invitees: Invitee[];
  onTemplateCreate: (template: InviteTemplate) => void;
}

export default function TemplateEditor({
  invitees,
  onTemplateCreate,
}: TemplateEditorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState(
    "Hello {firstName},\n\nI'd like to invite you to a meeting.\n\nBest regards"
  );
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  const suggestedVars = suggestVariables(invitees);
  const variables = extractVariables(body);
  const validation = validateTemplate(body, invitees);

  const handleInsertVariable = (varName: string) => {
    const textarea = document.querySelector(
      "textarea[name='body']"
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = body.substring(0, start) + `{${varName}}` + body.substring(end);
      setBody(newBody);
    }
  };

  const handleCreate = () => {
    if (!title.trim()) {
      alert("Please enter a template title");
      return;
    }

    if (!validation.isValid) {
      alert("Please fix template validation errors");
      return;
    }

    const template: InviteTemplate = {
      id: Date.now().toString(),
      title,
      description,
      body,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : new Date(),
      location,
      meetingLink,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onTemplateCreate(template);
  };

  return (
    <div className="card">
      <h2>Create Invitation Template</h2>

      <div className="form-group">
        <label htmlFor="title">Template Title *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Q4 Planning Session"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label htmlFor="startTime">Start Time</label>
          <input
            id="startTime"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="endTime">End Time</label>
          <input
            id="endTime"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Conference Room A"
          />
        </div>

        <div className="form-group">
          <label htmlFor="meetingLink">Meeting Link</label>
          <input
            id="meetingLink"
            type="url"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="e.g., https://zoom.us/..."
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="body">Invitation Body *</label>
        <textarea
          id="body"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Use {variableName} for personalization"
        />
      </div>

      {/* Variable suggestions */}
      <div className="variable-suggestions">
        <strong>Available variables:</strong>
        <div className="variable-list">
          {suggestedVars.map((varName) => (
            <button
              key={varName}
              className="variable-btn"
              onClick={() => handleInsertVariable(varName)}
              title={`Insert {${varName}}`}
            >
              {varName}
            </button>
          ))}
        </div>
      </div>

      {/* Validation */}
      {variables.length > 0 && (
        <div className="validation-box">
          <h4>Variables Used</h4>
          <div className="variable-list">
            {variables.map((v) => (
              <span key={v.name} className="variable-tag">
                {v.name}
                {v.isRequired && <span className="required">*</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {!validation.isValid && (
        <div className="alert alert-error">
          <span>❌</span>
          <div>
            <strong>Template Issues:</strong>
            <ul style={{ margin: "0.5rem 0 0 1.5rem" }}>
              {validation.errors.map((err, i) => (
                <li key={i} style={{ fontSize: "0.9rem" }}>
                  {err}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {validation.isValid && (
        <div className="alert alert-success">
          <span>✓</span>
          <div>
            Template is valid! Variable coverage: <strong>{validation.coverage}%</strong>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="template-preview">
        <h4>Preview (using first invitee)</h4>
        <div className="preview-box">
          <pre>{body}</pre>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleCreate}
        disabled={!validation.isValid}
      >
        Continue to Preview →
      </button>
    </div>
  );
}

const styles = `
  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.95rem;
  }

  textarea {
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    min-height: 150px;
  }

  .variable-suggestions {
    padding: 1rem;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    margin: 1.5rem 0;
  }

  .variable-suggestions strong {
    display: block;
    margin-bottom: 0.75rem;
    font-size: 0.95rem;
  }

  .variable-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .variable-btn {
    padding: 0.5rem 0.75rem;
    background-color: var(--color-accent);
    color: white;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .variable-btn:hover {
    background-color: var(--color-accent-hover);
  }

  .variable-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    background-color: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
  }

  .variable-tag .required {
    color: var(--color-error);
  }

  .validation-box {
    padding: 1rem;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    margin: 1.5rem 0;
  }

  .validation-box h4 {
    margin: 0 0 0.75rem 0;
  }

  .template-preview {
    margin: 2rem 0;
  }

  .preview-box {
    background-color: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1rem;
    overflow-x: auto;
  }

  .preview-box pre {
    margin: 0;
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    font-size: 0.9rem;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
`;

const styleElement = document.createElement("style");
styleElement.textContent = styles;
document.head.appendChild(styleElement);

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "./App";
import { EventPreview } from "./EventPreview";
import type { Variable } from "./TemplatesSection";

export interface Campaign {
  id: string;
  templateName: string;
  templateId: string;
  recipientCount: number;
  recipients: string[];
  variables: Variable[];
  sentAt: string;
  timestamp: number;
}

type Mappings = Record<number, Record<string, string>>;

// ─── Campaign list ───────────────────────────────────────────────────────────

const PER_PAGE = 10;

function CampaignDetailModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  return (
    <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{campaign.templateName}</div>
          <div className="modal-desc">Sent {campaign.sentAt}</div>
        </div>
        <div className="modal-body">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Recipients</div>
              <div className="stat-value">{campaign.recipientCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Variables</div>
              <div className="stat-value">{campaign.variables.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Status</div>
              <div className="stat-value" style={{ color: "var(--green)", fontSize: 18 }}>Sent</div>
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--tx2)", marginBottom: 10 }}>Recipients</div>
          <div style={{ fontSize: 14, color: "var(--tx2)", lineHeight: 1.9 }}>
            {campaign.recipients.map((r, i) => <div key={i}>{r}</div>)}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function CampaignsList() {
  const { campaigns } = useAppContext();
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Campaign | null>(null);

  const sorted = [...campaigns].reverse();
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageItems = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          {sorted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No campaigns yet</div>
              <div className="empty-state-desc">
                Click <strong>+ New Campaign</strong> in the top bar to send your first batch of calendar invites.
              </div>
            </div>
          ) : (
            <>
              {pageItems.map(c => (
                <div key={c.id} className="list-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="list-item-title">{c.templateName}</div>
                    <div className="list-item-meta">
                      {c.recipientCount} recipient{c.recipientCount !== 1 ? "s" : ""} · {c.sentAt}
                    </div>
                  </div>
                  <button className="btn btn-sm" onClick={() => setDetail(c)}>View</button>
                </div>
              ))}
              {totalPages > 1 && (
                <div className="pagination">
                  <span className="pagination-info">
                    Page {page} of {totalPages} · {sorted.length} campaigns
                  </span>
                  <div className="pagination-controls">
                    <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <button className="btn btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {detail && <CampaignDetailModal campaign={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  const steps = ["Template", "Recipients", "Map variables", "Review"];
  return (
    <div className="step-indicator">
      {steps.map((label, i) => {
        const num = i + 1;
        const isDone = num < step;
        const isActive = num === step;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {i > 0 && <div className="step-connector" />}
            <div className={`step-dot${isActive ? " active" : ""}${isDone ? " done" : ""}`}>
              {isDone ? "✓" : num}
            </div>
            <div className={`step-label${isActive ? " active" : ""}`}>{label}</div>
          </div>
        );
      })}
      <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--tx3)", flexShrink: 0 }}>
        Step {Math.min(step, 4)} of 4
      </div>
    </div>
  );
}

// ─── Campaign creation flow ──────────────────────────────────────────────────

export function CampaignFlow() {
  const { savedTemplates, addCampaign } = useAppContext();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [mappings, setMappings] = useState<Mappings>({});
  const [previewIdx, setPreviewIdx] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sentCampaign, setSentCampaign] = useState<Campaign | null>(null);

  const templateEntries = Object.entries(savedTemplates);
  const selectedTemplate = selectedTemplateId ? savedTemplates[selectedTemplateId] : null;

  function addRecipient() {
    const email = emailInput.trim();
    if (!email || !email.includes("@")) { alert("Valid email required"); return; }
    if (recipients.includes(email)) { alert("Recipient already added"); return; }
    setRecipients(prev => [...prev, email]);
    setEmailInput("");
  }

  function removeRecipient(idx: number) {
    setRecipients(prev => prev.filter((_, i) => i !== idx));
    setMappings(prev => {
      const updated: Mappings = {};
      Object.keys(prev).forEach(k => {
        const ki = parseInt(k);
        if (ki < idx) updated[ki] = prev[ki];
        else if (ki > idx) updated[ki - 1] = prev[ki];
      });
      return updated;
    });
  }

  function setMapping(ri: number, varName: string, value: string) {
    setMappings(prev => ({ ...prev, [ri]: { ...(prev[ri] ?? {}), [varName]: value } }));
  }

  function startCampaign() {
    if (!selectedTemplate) return;
    const c: Campaign = {
      id: uuidv4(),
      templateName: selectedTemplate.name,
      templateId: selectedTemplateId,
      recipientCount: recipients.length,
      recipients,
      variables: selectedTemplate.variables,
      sentAt: new Date().toLocaleString(),
      timestamp: Date.now(),
    };
    addCampaign(c);
    setSentCampaign(c);
    setShowConfirm(false);
    setStep(5);
  }

  // ── Step 1: Select template ──
  if (step === 1) {
    return (
      <div className="step-content">
        <div className="panel">
          <StepDots step={1} />
          <div className="panel-body">
            {templateEntries.length === 0 ? (
              <div className="alert alert-warning">
                No templates yet. Go to <strong>Templates</strong> in the sidebar to create one first.
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Template</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} style={{ flex: 1 }}>
                      <option value="">— Select a template —</option>
                      {templateEntries.map(([id, tpl]) => (
                        <option key={id} value={id}>{tpl.name}</option>
                      ))}
                    </select>
                    <button className="btn btn-sm" style={{ flexShrink: 0 }} onClick={() => navigate("/templates/new")}>+ New Template</button>
                  </div>
                </div>
                {selectedTemplate && (
                  <div style={{ marginTop: 8 }}>
                    <EventPreview template={selectedTemplate} />
                  </div>
                )}
              </>
            )}
            <div className="button-group">
              <button className="btn btn-primary" disabled={!selectedTemplateId} onClick={() => setStep(2)}>
                Next →
              </button>
              <button className="btn" onClick={() => navigate("/campaigns")}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Add recipients ──
  if (step === 2) {
    return (
      <div className="step-content">
        <div className="panel">
          <StepDots step={2} />
          <div className="panel-body">
            <div className="form-group">
              <label>Email address</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addRecipient()}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={addRecipient} style={{ flexShrink: 0 }}>Add</button>
              </div>
            </div>
            {recipients.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {recipients.map((email, i) => (
                  <span key={i} className="email-chip">
                    {email}
                    <button className="email-chip-x" onClick={() => removeRecipient(i)}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="button-group">
              <button className="btn" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" disabled={recipients.length === 0} onClick={() => setStep(3)}>
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Map variables ──
  if (step === 3) {
    if (!selectedTemplate) return null;
    return (
      <div className="step-content">
        <div className="panel">
          <StepDots step={3} />
          <div className="panel-body">
            {selectedTemplate.variables.length === 0 ? (
              <div className="alert alert-info">This template has no variables. Click Next to continue.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      {selectedTemplate.variables.map((v, i) => <th key={i}>{"{" + v.name + "}"}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((email, ri) => (
                      <tr key={ri}>
                        <td style={{ fontWeight: 500 }}>{email}</td>
                        {selectedTemplate.variables.map((v, vi) => (
                          <td key={vi}>
                            <input
                              className="mapping-input"
                              type="text"
                              placeholder={v.default || "—"}
                              value={mappings[ri]?.[v.name] ?? ""}
                              onChange={e => setMapping(ri, v.name, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="button-group">
              <button className="btn" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)}>Next →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4: Review ──
  if (step === 4) {
    if (!selectedTemplate) return null;
    return (
      <div className="step-content">
        <div className="panel">
          <StepDots step={4} />
          <div className="panel-body">
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Recipients</div>
                <div className="stat-value">{recipients.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Template</div>
                <div className="stat-value" style={{ fontSize: 16 }}>{selectedTemplate.name}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Variables</div>
                <div className="stat-value">{selectedTemplate.variables.length}</div>
              </div>
            </div>

            <div className="form-group">
              <label>Preview for</label>
              <select value={previewIdx} onChange={e => setPreviewIdx(e.target.value)}>
                <option value="">— Select recipient —</option>
                {recipients.map((email, i) => <option key={i} value={String(i)}>{email}</option>)}
              </select>
            </div>

            {previewIdx !== "" && (() => {
              const ri = parseInt(previewIdx);
              const values = Object.fromEntries(
                selectedTemplate.variables.map(v => [
                  v.name,
                  mappings[ri]?.[v.name] || v.default || "",
                ])
              );
              return (
                <div>
                  <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 12 }}>
                    To: <strong style={{ color: "var(--tx)" }}>{recipients[ri]}</strong>
                  </div>
                  <EventPreview template={selectedTemplate} values={values} />
                </div>
              );
            })()}

            <div className="button-group">
              <button className="btn" onClick={() => setStep(3)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setShowConfirm(true)}>Start campaign →</button>
            </div>
          </div>
        </div>

        {showConfirm && (
          <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && setShowConfirm(false)}>
            <div className="modal">
              <div className="modal-header">
                <div className="modal-title">Start campaign?</div>
                <div className="modal-desc">This action cannot be undone.</div>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  You're about to send <strong>{recipients.length}</strong> calendar invitation{recipients.length !== 1 ? "s" : ""}.
                  Once started, campaigns cannot be paused or stopped.
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={startCampaign}>Start campaign</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Step 5: Complete ──
  return (
    <div className="step-content">
      <div className="panel">
        <div className="panel-body" style={{ textAlign: "center", padding: "64px 24px" }}>
          <div style={{ fontSize: 44, marginBottom: 16, color: "var(--green)" }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Campaign sent successfully</div>
          <div style={{ fontSize: 15, color: "var(--tx2)", marginBottom: 32 }}>
            {sentCampaign?.recipientCount ?? recipients.length} invitation{(sentCampaign?.recipientCount ?? recipients.length) !== 1 ? "s" : ""} queued for <strong>{selectedTemplate?.name}</strong>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => navigate("/campaigns")}>Back to Campaigns</button>
          </div>
        </div>
      </div>
    </div>
  );
}

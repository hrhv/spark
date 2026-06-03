import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "./App";
import { EventPreview } from "./EventPreview";
import { useAuth } from "../context/AuthContext";
import { searchDirectoryPeople } from "../utils/directorySearch";
import type { DirectoryPerson } from "../utils/directorySearch";
import type { Variable, Template } from "./TemplatesSection";
import { getEffectiveVariables, RESERVED_VARIABLE_NAMES } from "./TemplatesSection";

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

// ─── Directory field helpers ─────────────────────────────────────────────────

type DirectoryField = "fullName" | "firstName" | "lastName" | "email";

const DIRECTORY_FIELD_LABELS: Record<DirectoryField, string> = {
  fullName:  "Full name",
  firstName: "First name",
  lastName:  "Last name",
  email:     "Email",
};

function resolveDirectoryField(person: DirectoryPerson, field: DirectoryField): string {
  switch (field) {
    case "fullName":  return person.name;
    case "firstName": return person.name.split(" ")[0] ?? "";
    case "lastName":  return person.name.split(" ").slice(1).join(" ");
    case "email":     return person.email;
  }
}

// ─── Template token scanner ─────────────────────────────────────────────────

/** Extracts every {varName} token that appears in a template's text fields. */
function extractTemplateTokens(template: Template): string[] {
  const plain = (template.content ?? "").replace(/<[^>]*>/g, " ");
  const sources = [template.eventTitle ?? "", template.location ?? "", plain];
  const tokens = new Set<string>();
  sources.forEach(s => {
    (s.match(/\{([^}]+)\}/g) ?? []).forEach(m => tokens.add(m.slice(1, -1)));
  });
  return Array.from(tokens);
}

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
  const { savedTemplates, addCampaign, addKnownEmails } = useAppContext();
  const { user, accessToken, grantedScopes } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [mappings, setMappings] = useState<Mappings>({});
  const [previewIdx, setPreviewIdx] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sentCampaign, setSentCampaign] = useState<Campaign | null>(null);

  // Directory autocomplete
  const [suggestions, setSuggestions] = useState<DirectoryPerson[]>([]);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Directory person data keyed by email (populated when user selects from autocomplete)
  const [recipientDetails, setRecipientDetails] = useState<Record<string, DirectoryPerson>>({});

  // Advanced rules: variable name → directory field (empty string = no rule)
  const [variableRules, setVariableRules] = useState<Record<string, DirectoryField | "">>({});

  const canSearchDirectory =
    Boolean(user?.hd) &&
    Boolean(accessToken) &&
    grantedScopes.includes("https://www.googleapis.com/auth/directory.readonly");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!canSearchDirectory || emailInput.length < 2) {
      setSuggestions([]);
      setSuggestionIdx(-1);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const results = await searchDirectoryPeople(emailInput, accessToken!);
      const filtered = results.filter(p => !recipients.includes(p.email));
      setSuggestions(filtered);
      setSuggestionIdx(-1);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [emailInput, canSearchDirectory]); // eslint-disable-line react-hooks/exhaustive-deps

  // When rules change, recompute auto-filled cells for every recipient with known person data.
  useEffect(() => {
    setMappings(prev => {
      const next = { ...prev };
      recipients.forEach((email, ri) => {
        const person = recipientDetails[email];
        if (!person) return;
        Object.entries(variableRules).forEach(([varName, field]) => {
          if (!field) return;
          next[ri] = { ...(next[ri] ?? {}), [varName]: resolveDirectoryField(person, field) };
        });
      });
      return next;
    });
  }, [variableRules]); // eslint-disable-line react-hooks/exhaustive-deps

  const templateEntries = Object.entries(savedTemplates);
  const selectedTemplate = selectedTemplateId ? savedTemplates[selectedTemplateId] : null;

  function addRecipient(emailOverride?: string) {
    const email = (emailOverride ?? emailInput).trim();
    if (!email || !email.includes("@")) { alert("Valid email required"); return; }
    if (recipients.includes(email)) { alert("Recipient already added"); return; }
    setRecipients(prev => [...prev, email]);
    setEmailInput("");
    setSuggestions([]);
    setSuggestionIdx(-1);
  }

  function selectSuggestion(person: DirectoryPerson) {
    const email = person.email.trim();
    if (!email || recipients.includes(email)) return;
    const newIdx = recipients.length;
    setRecipients(prev => [...prev, email]);
    setRecipientDetails(prev => ({ ...prev, [email]: person }));
    setEmailInput("");
    setSuggestions([]);
    setSuggestionIdx(-1);
    // Apply any already-configured rules for this new recipient immediately
    const activeRules = Object.entries(variableRules).filter(([, f]) => f);
    if (activeRules.length > 0) {
      setMappings(prev => {
        const row = { ...(prev[newIdx] ?? {}) };
        activeRules.forEach(([varName, field]) => {
          row[varName] = resolveDirectoryField(person, field as DirectoryField);
        });
        return { ...prev, [newIdx]: row };
      });
    }
  }

  function removeRecipient(idx: number) {
    const email = recipients[idx];
    setRecipients(prev => prev.filter((_, i) => i !== idx));
    setRecipientDetails(prev => { const n = { ...prev }; delete n[email]; return n; });
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
    addKnownEmails(recipients);
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
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setSuggestionIdx(i => Math.min(i + 1, suggestions.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSuggestionIdx(i => Math.max(i - 1, -1));
                      } else if (e.key === "Escape") {
                        setSuggestions([]);
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        if (suggestionIdx >= 0 && suggestions[suggestionIdx]) {
                          selectSuggestion(suggestions[suggestionIdx]);
                        } else {
                          addRecipient();
                        }
                      }
                    }}
                    onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                    style={{ flex: 1 }}
                    autoComplete="off"
                  />
                  <button className="btn btn-primary" onClick={() => addRecipient()} style={{ flexShrink: 0 }}>Add</button>
                </div>

                {suggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {suggestions.map((person, i) => (
                      <div
                        key={person.email}
                        className={`autocomplete-item${i === suggestionIdx ? " active" : ""}`}
                        onMouseDown={e => { e.preventDefault(); selectSuggestion(person); }}
                      >
                        {person.photo
                          ? <img src={person.photo} alt="" className="autocomplete-avatar" referrerPolicy="no-referrer" />
                          : <div className="autocomplete-avatar autocomplete-avatar-fallback">{person.name.charAt(0)}</div>
                        }
                        <div className="autocomplete-info">
                          <div className="autocomplete-name">{person.name}</div>
                          <div className="autocomplete-email">{person.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

    const hasDirectoryData = Object.keys(recipientDetails).length > 0;
    const vars = getEffectiveVariables(selectedTemplate);

    return (
      <div className="step-content">
        <div className="panel">
          <StepDots step={3} />
          <div className="panel-body">
            {vars.length === 0 ? (
              <div className="alert alert-info">This template has no variables. Click Next to continue.</div>
            ) : (
              <>
                {/* Advanced Rules */}
                <div className="advanced-rules">
                  <div className="advanced-rules-header">
                    <div className="advanced-rules-title">Auto-fill rules</div>
                    <div className="advanced-rules-desc">
                      Map variables to directory fields. Rows are filled automatically for recipients matched from your organisation's directory.
                    </div>
                  </div>
                  <div className="advanced-rules-body">
                    {vars.filter(v => !(RESERVED_VARIABLE_NAMES as readonly string[]).includes(v.name)).map(v => (
                      <div key={v.name} className="rule-row">
                        <span className="var-pill" style={{ cursor: "default" }}>{"{" + v.name + "}"}</span>
                        <span className="rule-arrow">→</span>
                        <select
                          className="rule-select"
                          value={variableRules[v.name] ?? ""}
                          onChange={e => setVariableRules(prev => ({ ...prev, [v.name]: e.target.value as DirectoryField | "" }))}
                        >
                          <option value="">— No rule —</option>
                          {(Object.entries(DIRECTORY_FIELD_LABELS) as [DirectoryField, string][]).map(([field, label]) => (
                            <option key={field} value={field}>{label}</option>
                          ))}
                        </select>
                        {variableRules[v.name] && !hasDirectoryData && (
                          <span className="rule-hint">No directory data yet — add recipients via search</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mapping table */}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Email</th>
                        {vars.map((v, i) => (
                          <th key={i}>
                            {"{" + v.name + "}"}
                            {variableRules[v.name] && (
                              <span className="rule-badge">{DIRECTORY_FIELD_LABELS[variableRules[v.name] as DirectoryField]}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((email, ri) => {
                        const person = recipientDetails[email];
                        return (
                          <tr key={ri}>
                            <td style={{ fontWeight: 500 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {person?.photo && (
                                  <img src={person.photo} alt="" className="autocomplete-avatar" style={{ width: 24, height: 24 }} referrerPolicy="no-referrer" />
                                )}
                                {email}
                              </div>
                            </td>
                            {vars.map((v, vi) => {
                              const autoVal = variableRules[v.name] && person
                                ? resolveDirectoryField(person, variableRules[v.name] as DirectoryField)
                                : null;
                              const cellVal = mappings[ri]?.[v.name] ?? "";
                              const isAutoFilled = autoVal !== null && cellVal === autoVal;
                              const inputType =
                                v.name === "eventDate" ? "date" :
                                (v.name === "startTime" || v.name === "endTime") ? "time" :
                                "text";
                              return (
                                <td key={vi}>
                                  <input
                                    className={`mapping-input${isAutoFilled ? " mapping-input-auto" : ""}`}
                                    type={inputType}
                                    placeholder={v.default || "—"}
                                    value={cellVal}
                                    onChange={e => setMapping(ri, v.name, e.target.value)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
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

    // Ground truth: tokens actually present in the template's variable fields
    // (eventTitle, location, description). Default values come from the declared
    // variables list; any token with no mapping and no default is unresolved.
    const varDefaults = Object.fromEntries(
      getEffectiveVariables(selectedTemplate).map(v => [v.name, v.default ?? ""])
    );
    const usedTokens = extractTemplateTokens(selectedTemplate);

    const missingByVar: Record<string, number> = {};
    recipients.forEach((_, ri) => {
      usedTokens.forEach(name => {
        const val = mappings[ri]?.[name] || varDefaults[name] || "";
        if (!val) missingByVar[name] = (missingByVar[name] ?? 0) + 1;
      });
    });
    const hasUnresolved = Object.keys(missingByVar).length > 0;
    const unresolvedError = hasUnresolved
      ? "Missing values: " + Object.entries(missingByVar)
          .map(([name, count]) => `{${name}} for ${count} recipient${count !== 1 ? "s" : ""}`)
          .join(", ") + ". Go back and fill them in."
      : "";

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
                <div className="stat-value">{getEffectiveVariables(selectedTemplate).length}</div>
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
                getEffectiveVariables(selectedTemplate).map(v => [
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

            {unresolvedError && (
              <div style={{ fontSize: 13, color: "var(--red)", marginTop: 16, marginBottom: 10 }}>
                {unresolvedError}
              </div>
            )}
            <div className="button-group">
              <button className="btn" onClick={() => setStep(3)}>← Back</button>
              <button className="btn btn-primary" disabled={hasUnresolved} onClick={() => setShowConfirm(true)}>Start campaign →</button>
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

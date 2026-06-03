import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { EventPreview } from "./EventPreview";
import { useAuth } from "../context/AuthContext";
import { searchDirectoryPeople } from "../utils/directorySearch";
import type { Variable, Template, DirectoryPerson, Campaign, CampaignSendError, CampaignEventRecord, SparkCalendarEventPayload } from "@/types";
import { RESERVED_VARIABLE_NAMES } from "@/types";
import { getEffectiveVariables, resolveDirectoryField, DIRECTORY_FIELD_LABELS } from "@utils/templateUtils";
import type { DirectoryField } from "@utils/templateUtils";
import { buildRecipientValues } from "@utils/campaignUtils";
import { toGoogleCalendarEvent } from "../utils/templateToCalendarEvent";
import { createEventForRecipient } from "../utils/googleCalendar";

// Re-export so App.tsx and other callers continue to work.
export type { Campaign, CampaignSendError };

type Mappings = Record<number, Record<string, string>>;

// ─── Campaign export ─────────────────────────────────────────────────────────

function exportCampaign(campaign: Campaign) {
  const { id: _id, ...data } = campaign; // strip ID — new one assigned on import
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = (campaign.templateName || "campaign").replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".spark-campaign.json";
  a.click();
  URL.revokeObjectURL(url);
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
  const { savedTemplates } = useAppContext();
  const [previewIdx, setPreviewIdx] = useState(0);

  const template = savedTemplates[campaign.templateId] ?? null;

  // Reconstruct numeric-keyed mappings from the string-keyed stored form.
  const numericMappings: Record<number, Record<string, string>> = Object.fromEntries(
    Object.entries(campaign.mappings ?? {}).map(([k, v]) => [Number(k), v])
  );

  const values = template ? buildRecipientValues(template, previewIdx, numericMappings) : {};
  const recipientEmail = campaign.recipients[previewIdx] ?? "";
  const sentEvent = campaign.sentEvents?.find(ev => ev.email === recipientEmail);

  return (
    <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{campaign.templateName || "Untitled campaign"}</div>
          <div className="modal-desc">{campaign.sentAt ? `Sent ${campaign.sentAt}` : `Draft · Step ${campaign.step ?? 1} of 4`}</div>
        </div>
        <div className="modal-body">
          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Recipients</div>
              <div className="stat-value">{campaign.recipientCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Sent</div>
              <div className="stat-value" style={{ color: "var(--green)" }}>
                {campaign.successCount ?? campaign.recipientCount}
              </div>
            </div>
            {(campaign.failureCount ?? 0) > 0 && (
              <div className="stat-card">
                <div className="stat-label">Failed</div>
                <div className="stat-value" style={{ color: "var(--red)" }}>{campaign.failureCount}</div>
              </div>
            )}
          </div>

          {/* Failed invitations */}
          {campaign.errors && campaign.errors.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--red)", marginBottom: 8 }}>Failed invitations</div>
              {campaign.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 13, color: "var(--tx2)", marginBottom: 4 }}>
                  <strong>{e.email}</strong>: {e.error}
                </div>
              ))}
            </div>
          )}

          {/* Recipient selector — same as review step */}
          <div className="form-group">
            <label>Preview for</label>
            <select
              value={previewIdx}
              onChange={e => setPreviewIdx(parseInt(e.target.value))}
            >
              {campaign.recipients.map((email, i) => (
                <option key={i} value={i}>{email}</option>
              ))}
            </select>
          </div>

          {/* Per-recipient header: email + Open in Google Calendar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "var(--tx3)" }}>
              To: <strong style={{ color: "var(--tx)" }}>{recipientEmail}</strong>
            </div>
            {sentEvent ? (
              <a
                href={sentEvent.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-primary"
                style={{ textDecoration: "none" }}
              >
                Open in Google Calendar ↗
              </a>
            ) : (campaign.failureCount ?? 0) > 0 && campaign.errors?.some(e => e.email === recipientEmail) ? (
              <span style={{ fontSize: 12, color: "var(--red)" }}>Failed to send</span>
            ) : null}
          </div>

          {/* Event preview — same component as review step */}
          {template
            ? <EventPreview template={template} values={values} />
            : (
              <div className="alert alert-warning">
                The template <strong>{campaign.templateName}</strong> has been deleted and the preview is unavailable.
              </div>
            )
          }
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

type StatusFilter = "all" | "draft" | "sent";

export function CampaignsList() {
  const { campaigns, deleteCampaign } = useAppContext();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [detail, setDetail] = useState<Campaign | null>(null);

  function handleDelete(c: Campaign) {
    if (!confirm(`Delete this campaign? This cannot be undone.`)) return;
    deleteCampaign(c.id);
  }

  const sorted   = [...campaigns].reverse();
  const filtered = filter === "all" ? sorted : sorted.filter(c => c.status === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const draftCount = sorted.filter(c => c.status === "draft").length;
  const sentCount  = sorted.filter(c => c.status === "sent").length;

  return (
    <>
      <div className="panel">
        {/* Status filter bar */}
        {sorted.length > 0 && (
          <div className="campaign-filter-bar">
            {(["all", "draft", "sent"] as StatusFilter[]).map(f => (
              <button
                key={f}
                className={`campaign-filter-btn${filter === f ? " active" : ""}`}
                onClick={() => { setFilter(f); setPage(1); }}
              >
                {f === "all" ? "All" : f === "draft" ? "Drafts" : "Sent"}
                <span className="campaign-filter-count">
                  {f === "all" ? sorted.length : f === "draft" ? draftCount : sentCount}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="panel-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">
                {sorted.length === 0 ? "No campaigns yet" : `No ${filter} campaigns`}
              </div>
              <div className="empty-state-desc">
                {sorted.length === 0
                  ? <>Click <strong>+ New Campaign</strong> in the top bar to send your first batch of calendar invites.</>
                  : `Switch the filter to see other campaigns.`}
              </div>
            </div>
          ) : (
            <>
              {pageItems.map(c => (
                <div key={c.id} className="list-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="list-item-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {c.templateName || "Untitled campaign"}
                      {c.status === "draft" && <span className="draft-badge">Draft</span>}
                    </div>
                    <div className="list-item-meta">
                      {c.recipientCount} recipient{c.recipientCount !== 1 ? "s" : ""}
                      {c.status === "sent" && c.sentAt && ` · ${c.sentAt}`}
                      {c.status === "draft" && ` · Step ${c.step ?? 1} of 4`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {c.status === "draft"
                      ? <button className="btn btn-sm btn-primary" onClick={() => navigate(`/campaigns/${c.id}/edit`)}>Edit</button>
                      : <button className="btn btn-sm" onClick={() => setDetail(c)}>View</button>
                    }
                    <button className="btn btn-sm" onClick={() => exportCampaign(c)}>Export</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c)}>Delete</button>
                  </div>
                </div>
              ))}
              {totalPages > 1 && (
                <div className="pagination">
                  <span className="pagination-info">
                    Page {safePage} of {totalPages} · {filtered.length} campaign{filtered.length !== 1 ? "s" : ""}
                  </span>
                  <div className="pagination-controls">
                    <button className="btn btn-sm" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <button className="btn btn-sm" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
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
  const { savedTemplates, campaigns, saveCampaign, addKnownEmails } = useAppContext();
  const { user, accessToken, grantedScopes } = useAuth();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();

  // Load existing draft if editing
  const existingDraft = editId ? campaigns.find(c => c.id === editId && c.status === "draft") : null;

  // Stable draft ID for the lifetime of this component instance
  const [draftId] = useState(() => editId ?? uuidv4());

  // State initialised from draft (or defaults for new campaigns)
  const [step, setStep] = useState(existingDraft?.step ?? 1);
  const [selectedTemplateId, setSelectedTemplateId] = useState(existingDraft?.templateId ?? "");
  const [recipients, setRecipients] = useState<string[]>(existingDraft?.recipients ?? []);
  const [mappings, setMappings] = useState<Mappings>(() => {
    const m = existingDraft?.mappings;
    if (!m) return {};
    return Object.fromEntries(Object.entries(m).map(([k, v]) => [Number(k), v]));
  });
  const [recipientDetails, setRecipientDetails] = useState<Record<string, DirectoryPerson>>(
    existingDraft?.recipientDetails ?? {}
  );
  const [variableRules, setVariableRules] = useState<Record<string, DirectoryField | "">>(
    (existingDraft?.variableRules ?? {}) as Record<string, DirectoryField | "">
  );

  const [emailInput, setEmailInput] = useState("");
  const [previewIdx, setPreviewIdx] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sentCampaign, setSentCampaign] = useState<Campaign | null>(null);

  // Sending progress state
  const [isSending, setIsSending] = useState(false);
  const [sendDone, setSendDone] = useState(0);
  const [sendSuccess, setSendSuccess] = useState(0);
  const [sendFailed, setSendFailed] = useState(0);
  const [sendErrors, setSendErrors] = useState<CampaignSendError[]>([]);

  // Directory autocomplete
  const [suggestions, setSuggestions] = useState<DirectoryPerson[]>([]);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSearchDirectory =
    Boolean(user?.hd) &&
    Boolean(accessToken) &&
    grantedScopes.includes("https://www.googleapis.com/auth/directory.readonly");

  // Autosave draft on any meaningful state change (debounced for mapping keystrokes).
  useEffect(() => {
    if (step > 4) return;
    if (!selectedTemplateId) return; // don't create a draft until a template is chosen
    if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current);
    saveDraftTimer.current = setTimeout(() => {
      saveCampaign({
        id: draftId,
        status: "draft",
        step,
        templateId: selectedTemplateId,
        templateName: savedTemplates[selectedTemplateId]?.name ?? "",
        recipients,
        recipientCount: recipients.length,
        variables: savedTemplates[selectedTemplateId]?.variables ?? [],
        mappings: mappings as Record<string, Record<string, string>>,
        variableRules: variableRules as Record<string, string>,
        recipientDetails,
        timestamp: Date.now(),
      });
    }, 300);
    return () => { if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current); };
  }, [step, selectedTemplateId, recipients, mappings, variableRules, recipientDetails, saveCampaign, draftId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!canSearchDirectory || emailInput.length < 2) {
      setSuggestions([]);
      setSuggestionIdx(-1);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      const results = await searchDirectoryPeople(emailInput, accessToken!);
      const filtered = results.filter(p => !recipients.includes(p.email));
      setSuggestions(filtered);
      setSuggestionIdx(-1);
      setSearchLoading(false);
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

  async function startCampaign() {
    if (!selectedTemplate || !accessToken) return;
    setShowConfirm(false);
    setIsSending(true);
    setSendDone(0);
    setSendSuccess(0);
    setSendFailed(0);
    setSendErrors([]);

    let successCount = 0;
    let failureCount = 0;
    const errors: CampaignSendError[] = [];
    const sentEvents: CampaignEventRecord[] = [];

    for (let ri = 0; ri < recipients.length; ri++) {
      const email = recipients[ri];
      const person = recipientDetails[email];

      const values = buildRecipientValues(selectedTemplate, ri, mappings);
      const conferenceRequestId = `${draftId}-${ri}`;
      const eventPayload = toGoogleCalendarEvent(selectedTemplate, values, conferenceRequestId);

      const result = await createEventForRecipient(
        accessToken,
        eventPayload,
        email,
        person?.name
      );

      if (result.success) {
        successCount++;
        setSendSuccess(s => s + 1);
        if (result.eventId && result.htmlLink) {
          sentEvents.push({ email, eventId: result.eventId, htmlLink: result.htmlLink });
        }
      } else {
        failureCount++;
        const err: CampaignSendError = { email, error: result.error ?? "Unknown error" };
        errors.push(err);
        setSendErrors(prev => [...prev, err]);
        setSendFailed(f => f + 1);
      }
      setSendDone(ri + 1);

      // Brief pause between requests to respect Google Calendar API rate limits.
      if (ri < recipients.length - 1) {
        await new Promise<void>(resolve => setTimeout(resolve, 150));
      }
    }

    const c: Campaign = {
      id: draftId,
      status: "sent",
      templateName: selectedTemplate.name,
      templateId: selectedTemplateId,
      recipientCount: recipients.length,
      recipients,
      variables: selectedTemplate.variables,
      mappings: mappings as Record<string, Record<string, string>>,
      sentAt: new Date().toLocaleString(),
      timestamp: Date.now(),
      successCount,
      failureCount,
      errors,
      sentEvents,
    };
    saveCampaign(c);
    addKnownEmails(recipients);
    setSentCampaign(c);
    setIsSending(false);
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

                {(searchLoading || suggestions.length > 0) && (
                  <div className="autocomplete-dropdown">
                    {searchLoading ? (
                      <div className="autocomplete-loading">
                        <div className="autocomplete-spinner" />
                        Searching directory…
                      </div>
                    ) : suggestions.map((person, i) => (
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
            {!accessToken && (
              <div className="alert alert-warning" style={{ marginTop: 12 }}>
                Your session has expired. Please sign out and sign back in to send invitations.
              </div>
            )}
            <div className="button-group">
              <button className="btn" onClick={() => setStep(3)}>← Back</button>
              <button
                className="btn btn-primary"
                disabled={hasUnresolved || !accessToken}
                onClick={() => setShowConfirm(true)}
              >
                Start campaign →
              </button>
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

        {isSending && (
          <div className="modal-backdrop open">
            <div className="modal">
              <div className="modal-header">
                <div className="modal-title">Sending invitations…</div>
                <div className="modal-desc">{sendDone} of {recipients.length} processed</div>
              </div>
              <div className="modal-body">
                <div style={{
                  height: 6,
                  background: "var(--bd)",
                  borderRadius: 3,
                  overflow: "hidden",
                  marginBottom: 20,
                }}>
                  <div style={{
                    height: "100%",
                    background: "var(--accent)",
                    borderRadius: 3,
                    width: `${recipients.length ? (sendDone / recipients.length) * 100 : 0}%`,
                    transition: "width 0.2s ease",
                  }} />
                </div>
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-label">Sent</div>
                    <div className="stat-value" style={{ color: "var(--green)" }}>{sendSuccess}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Failed</div>
                    <div className="stat-value" style={{ color: sendFailed > 0 ? "var(--red)" : "var(--tx3)" }}>
                      {sendFailed}
                    </div>
                  </div>
                </div>
                {sendErrors.length > 0 && (
                  <div style={{ marginTop: 12, fontSize: 12, color: "var(--red)", lineHeight: 1.6 }}>
                    {sendErrors.slice(-3).map((e, i) => (
                      <div key={i}><strong>{e.email}</strong>: {e.error}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Step 5: Complete ──
  const totalSent    = sentCampaign?.successCount ?? 0;
  const totalFailed  = sentCampaign?.failureCount ?? 0;
  const totalCount   = sentCampaign?.recipientCount ?? recipients.length;
  const allFailed    = totalFailed === totalCount && totalCount > 0;
  const partialFail  = totalFailed > 0 && !allFailed;

  return (
    <div className="step-content">
      <div className="panel">
        <div className="panel-body" style={{ padding: "48px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 44, marginBottom: 16, color: allFailed ? "var(--red)" : partialFail ? "var(--yellow, #f59e0b)" : "var(--green)" }}>
              {allFailed ? "✕" : partialFail ? "⚠" : "✓"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
              {allFailed ? "Campaign failed" : partialFail ? "Campaign sent with errors" : "Campaign sent successfully"}
            </div>
            <div style={{ fontSize: 15, color: "var(--tx2)" }}>
              <strong style={{ color: "var(--green)" }}>{totalSent}</strong> of <strong>{totalCount}</strong> invitation{totalCount !== 1 ? "s" : ""} sent
              {totalFailed > 0 && <> · <strong style={{ color: "var(--red)" }}>{totalFailed}</strong> failed</>}
              {selectedTemplate && <> · <strong>{selectedTemplate.name}</strong></>}
            </div>
          </div>

          {sentCampaign?.sentEvents && sentCampaign.sentEvents.length > 0 && (
            <div style={{
              marginBottom: 24,
              border: "1px solid var(--bd)",
              borderRadius: 8,
              overflow: "hidden",
            }}>
              <div style={{
                padding: "10px 16px",
                background: "var(--bg2)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--tx2)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                borderBottom: "1px solid var(--bd)",
              }}>
                Invitations
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {sentCampaign.sentEvents.map((ev, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "9px 16px",
                      borderBottom: i < sentCampaign.sentEvents!.length - 1 ? "1px solid var(--bd)" : "none",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--tx2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.email}
                    </span>
                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm"
                      style={{ flexShrink: 0, textDecoration: "none" }}
                    >
                      Open in Google Calendar ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sentCampaign?.errors && sentCampaign.errors.length > 0 && (
            <div style={{
              marginBottom: 24,
              padding: 16,
              background: "var(--bg2)",
              borderRadius: 8,
              border: "1px solid var(--bd)",
            }}>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10, color: "var(--red)" }}>
                Failed invitations
              </div>
              {sentCampaign.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 13, color: "var(--tx2)", marginBottom: 6 }}>
                  <strong>{e.email}</strong>: {e.error}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => navigate("/campaigns")}>Back to Campaigns</button>
          </div>
        </div>
      </div>
    </div>
  );
}

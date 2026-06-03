import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { EventPreview, TIMEZONES } from "./EventPreview";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Variable {
  name: string;
  default: string;
}

export interface Template {
  name: string;
  variables: Variable[];
  content: string;
  // Event details (optional for backward compat with existing saved templates)
  eventTitle?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  location?: string;
  addMeet?: boolean;
  // Reserved variable flags — when true the field is per-recipient, not fixed
  dateIsVariable?: boolean;
  startTimeIsVariable?: boolean;
  endTimeIsVariable?: boolean;
}

export type Templates = Record<string, Template>;

// ─── Reserved variables ───────────────────────────────────────────────────────

export const RESERVED_VARIABLE_NAMES = ["eventDate", "startTime", "endTime"] as const;
export type ReservedVariableName = typeof RESERVED_VARIABLE_NAMES[number];

/** Returns all variables including implicit reserved ones from date/time flags. */
export function getEffectiveVariables(template: Template): Variable[] {
  const vars = [...(template.variables ?? [])];
  if (template.dateIsVariable)      vars.push({ name: "eventDate",  default: "" });
  if (template.startTimeIsVariable) vars.push({ name: "startTime",  default: "" });
  if (template.endTimeIsVariable)   vars.push({ name: "endTime",    default: "" });
  return vars;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CONTENT = "Hello {recipientName},\n\nI'd like to invite you to {meetingType}.\n\nLooking forward to meeting you!\n\nBest regards,\n{senderName}";

function getBrowserTimezone(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return TIMEZONES.some(t => t.value === tz) ? tz : "UTC";
}

function getDefaultDateTimes(): { date: string; startTime: string; endTime: string } {
  const now = new Date();

  // Today as YYYY-MM-DD
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");
  const date  = `${year}-${month}-${day}`;

  // Round up to the next 15-min boundary (e.g. 12:35 → 12:45, 12:45 → 13:00)
  const rem         = now.getMinutes() % 15;
  const minsToAdd   = rem === 0 ? 15 : 15 - rem;
  const start       = new Date(now.getTime() + minsToAdd * 60_000);
  start.setSeconds(0, 0);

  const startTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;

  // End: 30 min after start
  const end     = new Date(start.getTime() + 30 * 60_000);
  const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;

  return { date, startTime, endTime };
}

function exportTemplate(tpl: Template) {
  const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = tpl.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".spark.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function textToHtml(text: string): string {
  return text
    .split("\n")
    .map(line => `<div>${line === "" ? "<br>" : line}</div>`)
    .join("");
}

function htmlToText(el: HTMLElement): string {
  let result = "";
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName.toLowerCase();
      if (tag === "br") {
        result += "\n";
      } else if (["div", "p", "li"].includes(tag)) {
        const inner = htmlToText(node as HTMLElement);
        const text = inner.startsWith("\n") ? inner.slice(1) : inner;
        result += (result.length > 0 ? "\n" : "") + text;
      } else {
        result += htmlToText(node as HTMLElement);
      }
    }
  }
  return result;
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({ template, onClose }: { template: Template; onClose: () => void }) {
  return (
    <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{template.name}</div>
          <div className="modal-desc">{template.variables.length} variable{template.variables.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="modal-body">
          {template.variables.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "var(--tx2)", marginBottom: 8 }}><strong>Variables:</strong></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {template.variables.map((v, i) => (
                  <div key={i} className="var-tag">{"{" + v.name + "}"} = {v.default || "(none)"}</div>
                ))}
              </div>
            </div>
          )}
          <EventPreview template={template} />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Templates list ───────────────────────────────────────────────────────────

export function TemplatesList() {
  const { savedTemplates, updateTemplates } = useAppContext();
  const navigate = useNavigate();
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const entries = Object.entries(savedTemplates);

  function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    const updated = { ...savedTemplates };
    delete updated[id];
    updateTemplates(updated);
  }

  return (
    <>
      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          {entries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">No templates yet</div>
              <div className="empty-state-desc">
                Click <strong>+ New Template</strong> in the top bar to create your first invitation template.
              </div>
            </div>
          ) : (
            entries.map(([id, tpl]) => (
              <div key={id} className="list-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="list-item-title">{tpl.name}</div>
                  <div className="list-item-meta">
                    {tpl.eventTitle && <span>{tpl.eventTitle} · </span>}
                    {tpl.variables.length} variable{tpl.variables.length !== 1 ? "s" : ""}
                    {tpl.variables.length > 0 && (
                      <span style={{ marginLeft: 6 }}>
                        · {tpl.variables.map(v => "{" + v.name + "}").join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-sm" onClick={() => setPreviewTemplate(tpl)}>Preview</button>
                  <button className="btn btn-sm" onClick={() => navigate(`/templates/${id}/edit`)}>Edit</button>
                  <button className="btn btn-sm" onClick={() => exportTemplate(tpl)}>Export</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {previewTemplate && (
        <PreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </>
  );
}

// ─── Template form ────────────────────────────────────────────────────────────

export function TemplateForm() {
  const { savedTemplates, updateTemplates } = useAppContext();
  const navigate = useNavigate();
  const { id: editingId } = useParams<{ id?: string }>();
  const existing = editingId ? savedTemplates[editingId] : null;

  // Template name
  const [tplName, setTplName] = useState(existing?.name ?? "");
  const [copiedId, setCopiedId] = useState(false);

  function copyId() {
    if (!editingId) return;
    navigator.clipboard.writeText(editingId).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    });
  }

  // Event details
  const [eventTitle, setEventTitle] = useState(existing?.eventTitle ?? "");
  const [date, setDate] = useState(() => {
    if (existing) return existing.date ?? "";
    return getDefaultDateTimes().date;
  });
  const [startTime, setStartTime] = useState(() => {
    if (existing) return existing.startTime ?? "";
    return getDefaultDateTimes().startTime;
  });
  const [endTime, setEndTime] = useState(() => {
    if (existing) return existing.endTime ?? "";
    return getDefaultDateTimes().endTime;
  });
  const [timezone, setTimezone] = useState(existing?.timezone ?? getBrowserTimezone());
  const [location, setLocation] = useState(existing?.location ?? "");
  const [addMeet, setAddMeet] = useState(existing?.addMeet ?? false);
  const [dateIsVariable, setDateIsVariable] = useState(existing ? (existing.dateIsVariable ?? false) : true);
  const [startTimeIsVariable, setStartTimeIsVariable] = useState(existing ? (existing.startTimeIsVariable ?? false) : true);
  const [endTimeIsVariable, setEndTimeIsVariable] = useState(existing ? (existing.endTimeIsVariable ?? false) : true);

  // Variables
  const [varName, setVarName] = useState("");
  const [varDefault, setVarDefault] = useState("");
  const [variables, setVariables] = useState<Variable[]>(
    existing ? JSON.parse(JSON.stringify(existing.variables)) : []
  );

  // Editor state
  const [editorText, setEditorText] = useState("");
  const [editorHtml, setEditorHtml] = useState("");

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const varNameRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  function syncEditor() {
    const el = editorRef.current;
    if (!el) return;
    setEditorText(htmlToText(el));
    setEditorHtml(el.innerHTML);
  }

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = existing ? existing.content : textToHtml(DEFAULT_CONTENT);
    syncEditor();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Variable management ──

  function addVariable() {
    const name = varName.trim();
    if (!name) { alert("Variable name required"); return; }
    setVariables(prev => [...prev, { name, default: varDefault.trim() }]);
    setVarName("");
    setVarDefault("");
    varNameRef.current?.focus();
  }

  function removeVariable(idx: number) {
    setVariables(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Variable insertion ──

  function insertAtTextInput(
    inputRef: React.RefObject<HTMLInputElement | null>,
    setter: React.Dispatch<React.SetStateAction<string>>,
    token: string
  ) {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end   = input.selectionEnd   ?? input.value.length;
    const newValue = input.value.slice(0, start) + token + input.value.slice(end);
    setter(newValue);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function insertVariable(name: string) {
    const token = "{" + name + "}";
    const active = document.activeElement;

    if (active === editorRef.current) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(token);
        range.insertNode(node);
        range.setStartAfter(node);
        range.setEndAfter(node);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      syncEditor();
    } else if (active === titleInputRef.current) {
      insertAtTextInput(titleInputRef, setEventTitle, token);
    } else if (active === locationInputRef.current) {
      insertAtTextInput(locationInputRef, setLocation, token);
    }
  }

  function formatText(cmd: string) {
    document.execCommand(cmd, false, undefined);
    editorRef.current?.focus();
    syncEditor();
  }

  // ── Save ──

  function saveTemplate() {
    const name = tplName.trim();
    if (!name) { alert("Template name required"); return; }
    const content = editorRef.current?.innerHTML ?? "";
    if (!editorText.trim()) { alert("Template content required"); return; }

    const template: Template = {
      name, variables, content,
      eventTitle,
      date:      dateIsVariable      ? "" : date,
      startTime: startTimeIsVariable ? "" : startTime,
      endTime:   endTimeIsVariable   ? "" : endTime,
      timezone, location, addMeet,
      dateIsVariable, startTimeIsVariable, endTimeIsVariable,
    };

    const updated = { ...savedTemplates };
    updated[editingId ?? uuidv4()] = template;
    updateTemplates(updated);
    navigate("/templates");
  }

  // ── Live draft template for preview ──

  // Build a complete Template object from current form state so EventPreview
  // can render it identically to how the saved template will look.
  const liveTemplate: Template = {
    name: tplName, variables, content: editorHtml,
    eventTitle,
    date:      dateIsVariable      ? "" : date,
    startTime: startTimeIsVariable ? "" : startTime,
    endTime:   endTimeIsVariable   ? "" : endTime,
    timezone, location, addMeet,
    dateIsVariable, startTimeIsVariable, endTimeIsVariable,
  };
  const defaultValues = Object.fromEntries(
    getEffectiveVariables(liveTemplate).map(v => [v.name, v.default ?? ""])
  );

  // ── Render ──

  const allPillVars: Variable[] = [
    ...variables,
    ...(dateIsVariable      ? [{ name: "eventDate",  default: "" }] : []),
    ...(startTimeIsVariable ? [{ name: "startTime",  default: "" }] : []),
    ...(endTimeIsVariable   ? [{ name: "endTime",    default: "" }] : []),
  ];

  // Always rendered so the section never pops into existence and causes a layout shift.
  const insertPills = (
    <div>
      <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 8 }}>
        Click to insert into focused field:
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 26, alignItems: "center" }}>
        {allPillVars.length > 0
          ? allPillVars.map((v, i) => (
              <span
                key={i}
                className="var-pill"
                style={{ cursor: "pointer" }}
                onMouseDown={e => { e.preventDefault(); insertVariable(v.name); }}
              >
                {"{" + v.name + "}"}
              </span>
            ))
          : <span style={{ fontSize: 12, color: "var(--tx3)", fontStyle: "italic" }}>
              Add variables above to use them in your template
            </span>
        }
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

      {/* ── LEFT: two panels + save ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Panel 1: Template details */}
        <div className="panel">
          <div className="panel-header">Template details</div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {editingId && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Template ID</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={editingId}
                    disabled
                    style={{ flex: 1, background: "var(--bg2)", color: "var(--tx3)", fontFamily: "var(--mono)", fontSize: 13 }}
                  />
                  <button
                    className="btn btn-sm"
                    onClick={copyId}
                    style={{
                      flexShrink: 0,
                      minWidth: 80,
                      transition: "background 0.1s, color 0.1s, border-color 0.1s",
                      ...(copiedId ? {
                        background: "var(--green-bg)",
                        color: "var(--green-tx)",
                        borderColor: "var(--green-bd)",
                      } : {}),
                    }}
                  >
                    {copiedId ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Template name</label>
              <input
                type="text"
                placeholder="e.g. Weekly Sync"
                value={tplName}
                onChange={e => setTplName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "var(--tx)" }}>
                Variables
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  ref={varNameRef}
                  type="text"
                  placeholder="Variable name"
                  value={varName}
                  onChange={e => setVarName(e.target.value)}
                  style={{ flex: 1 }}
                  onKeyDown={e => e.key === "Enter" && addVariable()}
                />
                <input
                  type="text"
                  placeholder="Default value"
                  value={varDefault}
                  onChange={e => setVarDefault(e.target.value)}
                  style={{ flex: 1 }}
                  onKeyDown={e => e.key === "Enter" && addVariable()}
                />
                <button className="btn btn-primary" onClick={addVariable} style={{ flexShrink: 0 }}>
                  Add
                </button>
              </div>
              {variables.length > 0 && (
                <div className="variables-list" style={{ marginBottom: 14 }}>
                  {variables.map((v, i) => (
                    <div key={i} className="var-tag">
                      {"{" + v.name + "}"} = {v.default || "(none)"}
                      <button className="var-tag-x" onClick={() => removeVariable(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {insertPills}
            </div>

            <div className="variables-panel">
              <div style={{ fontSize: 13, color: "var(--tx2)", marginBottom: 5 }}><strong>Variable syntax</strong></div>
              <div style={{ fontSize: 13, color: "var(--tx3)", lineHeight: 1.6 }}>
                Use <span className="var-pill">{"{variableName}"}</span> in title, location, or description.
                Each variable is replaced individually per recipient.
              </div>
            </div>

          </div>
        </div>

        {/* Panel 2: Event details */}
        <div className="panel">
          <div className="panel-header">Event details</div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Event title</label>
              <input
                ref={titleInputRef}
                type="text"
                placeholder="e.g. 1:1 with {recipientName}"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {/* Date */}
              <div>
                <div className="var-field-header">
                  <span>Date</span>
                  <button type="button" className={`var-toggle-pill${dateIsVariable ? " active" : ""}`}
                    onClick={() => { setDateIsVariable(v => !v); if (!dateIsVariable) setDate(""); }}>
                    {"{…}"}
                  </button>
                </div>
                <div className="var-field-input-wrap">
                  {dateIsVariable
                    ? <div className="var-field-placeholder">{"{eventDate}"}</div>
                    : <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  }
                </div>
              </div>
              {/* Start time */}
              <div>
                <div className="var-field-header">
                  <span>Start time</span>
                  <button type="button" className={`var-toggle-pill${startTimeIsVariable ? " active" : ""}`}
                    onClick={() => { setStartTimeIsVariable(v => !v); if (!startTimeIsVariable) setStartTime(""); }}>
                    {"{…}"}
                  </button>
                </div>
                <div className="var-field-input-wrap">
                  {startTimeIsVariable
                    ? <div className="var-field-placeholder">{"{startTime}"}</div>
                    : <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  }
                </div>
              </div>
              {/* End time */}
              <div>
                <div className="var-field-header">
                  <span>End time</span>
                  <button type="button" className={`var-toggle-pill${endTimeIsVariable ? " active" : ""}`}
                    onClick={() => { setEndTimeIsVariable(v => !v); if (!endTimeIsVariable) setEndTime(""); }}>
                    {"{…}"}
                  </button>
                </div>
                <div className="var-field-input-wrap">
                  {endTimeIsVariable
                    ? <div className="var-field-placeholder">{"{endTime}"}</div>
                    : <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  }
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)}>
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Location</label>
              <input
                ref={locationInputRef}
                type="text"
                placeholder="e.g. {officeAddress} or a Zoom link"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            <label className="meet-checkbox-label">
              <input
                type="checkbox"
                checked={addMeet}
                onChange={e => setAddMeet(e.target.checked)}
              />
              Add Google Meet video conferencing
            </label>

            <div className="form-section-title">Description</div>

            <div className="rich-editor">
              <div className="editor-toolbar">
                <button className="toolbar-btn" onClick={() => formatText("bold")}><strong>B</strong></button>
                <button className="toolbar-btn" onClick={() => formatText("italic")}><em>I</em></button>
                <button className="toolbar-btn" onClick={() => formatText("underline")}><u>U</u></button>
                <button className="toolbar-btn" onClick={() => formatText("insertUnorderedList")}>• List</button>
                <button className="toolbar-btn" onClick={() => formatText("insertOrderedList")}>1. List</button>
              </div>
              <div
                ref={editorRef}
                className="editor-content"
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditor}
              />
            </div>

          </div>
        </div>

        {/* Save / cancel — below both panels */}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={saveTemplate}>
            {editingId ? "Update template" : "Save template"}
          </button>
          <button className="btn" onClick={() => navigate("/templates")}>Cancel</button>
        </div>

      </div>

      {/* ── RIGHT: live preview (sticky, height-bounded so content changes never reflow the page) ── */}
      <div style={{ position: "sticky", top: 24, maxHeight: "calc(100vh - 76px)", overflowY: "auto" }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14, color: "var(--tx)" }}>Live preview</div>
        <EventPreview template={liveTemplate} values={defaultValues} />
      </div>

    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

interface Props {
  savedTemplates: Templates;
  onUpdate: (templates: Templates) => void;
  view: "list" | "form";
  editingId: string | null;
  onEdit: (id: string) => void;
  onSaved: () => void;
  onCancel: () => void;
}

export default function TemplatesSection(_props: Props) {
  return null; // routing handled by App.tsx — this export kept for import compat
}

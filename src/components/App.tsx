import { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  Outlet,
  useOutletContext,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";
import { CampaignsList, CampaignFlow } from "./CampaignSection";
import { TemplatesList, TemplateForm } from "./TemplatesSection";
import type { Templates, Template, Campaign } from "@/types";
import { EventPreview } from "./EventPreview";
import { LoginPage } from "./LoginPage";
import { SparkBrand } from "./SparkBrand";
import { useAuth, SCOPE_META, REQUESTED_SCOPES } from "../context/AuthContext";
import "@styles/global.css";

// ─── Shared context ─────────────────────────────────────────────────────────

export interface AppContext {
  savedTemplates: Templates;
  updateTemplates: (t: Templates) => void;
  campaigns: Campaign[];
  saveCampaign: (c: Campaign) => void;
  deleteCampaign: (id: string) => void;
  knownEmails: string[];
  addKnownEmails: (emails: string[]) => void;
}

export function useAppContext() {
  return useOutletContext<AppContext>();
}

// ─── Data loaders ────────────────────────────────────────────────────────────

function loadTemplates(): Templates {
  try { return JSON.parse(localStorage.getItem("spark-templates") || "{}"); }
  catch { return {}; }
}

function loadCampaigns(): Campaign[] {
  try { return JSON.parse(localStorage.getItem("spark-campaigns") || "[]"); }
  catch { return []; }
}

function loadKnownEmails(): string[] {
  try { return JSON.parse(localStorage.getItem("spark-known-emails") || "[]"); }
  catch { return []; }
}

// ─── Full-data export / import ───────────────────────────────────────────────

export interface SparkExport {
  version: 1;
  exportedAt: string;
  templates: Templates;
  campaigns: Campaign[];
  knownEmails: string[];
}

type ValidationResult =
  | { valid: true;  data: SparkExport }
  | { valid: false; error: string };

function validateSparkExport(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return { valid: false, error: "File is not a valid JSON object." };
  const d = raw as Record<string, unknown>;
  if (d.version !== 1)
    return { valid: false, error: `Unsupported version "${d.version}". Expected 1.` };
  if (typeof d.exportedAt !== "string")
    return { valid: false, error: "Missing exportedAt field." };
  if (!d.templates || typeof d.templates !== "object" || Array.isArray(d.templates))
    return { valid: false, error: "Invalid templates field." };
  for (const [id, t] of Object.entries(d.templates as Record<string, unknown>)) {
    if (!t || typeof t !== "object" || Array.isArray(t))
      return { valid: false, error: `Template "${id}" is malformed.` };
    const tpl = t as Record<string, unknown>;
    if (typeof tpl.name    !== "string") return { valid: false, error: `Template "${id}" is missing a name.` };
    if (typeof tpl.content !== "string") return { valid: false, error: `Template "${id}" is missing content.` };
    if (!Array.isArray(tpl.variables))   return { valid: false, error: `Template "${id}" has invalid variables.` };
  }
  if (!Array.isArray(d.campaigns))
    return { valid: false, error: "Invalid campaigns field." };
  for (let i = 0; i < (d.campaigns as unknown[]).length; i++) {
    const c = (d.campaigns as unknown[])[i];
    if (!c || typeof c !== "object" || Array.isArray(c))
      return { valid: false, error: `Campaign ${i} is malformed.` };
    const cam = c as Record<string, unknown>;
    if (typeof cam.templateName !== "string") return { valid: false, error: `Campaign ${i} is missing templateName.` };
    if (!Array.isArray(cam.recipients))       return { valid: false, error: `Campaign ${i} has invalid recipients.` };
  }
  if (d.knownEmails !== undefined && !Array.isArray(d.knownEmails))
    return { valid: false, error: "Invalid knownEmails field." };
  return { valid: true, data: raw as SparkExport };
}

// ─── Permissions modal ────────────────────────────────────────────────────────

interface PermissionsModalProps {
  onClose: () => void;
  savedTemplates: Templates;
  campaigns: Campaign[];
  knownEmails: string[];
  onExport: () => void;
  onMerge: (data: SparkExport) => void;
  onReplace: (data: SparkExport) => void;
}

function PermissionsModal({ onClose, savedTemplates, campaigns, knownEmails, onExport, onMerge, onReplace }: PermissionsModalProps) {
  const { user, grantedScopes, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingImport, setPendingImport] = useState<SparkExport | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [importError, setImportError] = useState("");

  function handleLogout() { logout(); onClose(); }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = validateSparkExport(JSON.parse(reader.result as string));
        if (!result.valid) { setImportError(result.error); return; }
        setPendingImport(result.data);
        setImportMode("merge");
      } catch {
        setImportError("Could not parse the selected file as JSON.");
      }
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!pendingImport) return;
    if (importMode === "replace") { setShowReplaceConfirm(true); return; }
    onMerge(pendingImport);
    setPendingImport(null);
    onClose();
  }

  function confirmReplace() {
    if (!pendingImport) return;
    onReplace(pendingImport);
    setPendingImport(null);
    setShowReplaceConfirm(false);
    onClose();
  }

  const tplEntries  = Object.entries(savedTemplates);
  const tplCount    = tplEntries.length;
  const campCount   = campaigns.length;
  const emailCount  = knownEmails.length;

  // ── Replace confirmation modal ──
  if (showReplaceConfirm) {
    return (
      <div className="modal-backdrop open">
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Replace all data?</div>
            <div className="modal-desc" style={{ color: "var(--red)" }}>This action is permanent and cannot be undone.</div>
          </div>
          <div className="modal-body">
            <div className="import-warning-box">
              <div className="import-warning-icon">⚠</div>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>The following will be permanently deleted:</div>
                <ul className="import-warning-list">
                  <li>{tplCount} template{tplCount !== 1 ? "s" : ""}</li>
                  <li>{campCount} campaign{campCount !== 1 ? "s" : ""}</li>
                  <li>{emailCount} known email address{emailCount !== 1 ? "es" : ""}</li>
                </ul>
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--tx3)" }}>
                  They will be replaced with the {Object.keys(pendingImport?.templates ?? {}).length} templates,{" "}
                  {pendingImport?.campaigns.length ?? 0} campaigns, and{" "}
                  {pendingImport?.knownEmails?.length ?? 0} emails from the import file.
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" onClick={() => setShowReplaceConfirm(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmReplace}>Replace all data</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Import preview modal ──
  if (pendingImport) {
    const impTpls  = Object.entries(pendingImport.templates);
    const impCamps = pendingImport.campaigns;
    const impEmails = pendingImport.knownEmails ?? [];
    return (
      <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && setPendingImport(null)}>
        <div className="modal modal-lg">
          <div className="modal-header">
            <div className="modal-title">Import preview</div>
            <div className="modal-desc">
              Exported {new Date(pendingImport.exportedAt).toLocaleString()}
            </div>
          </div>
          <div className="modal-body">

            {/* Templates */}
            <div className="import-section">
              <div className="import-section-header">
                <span className="import-section-title">Templates</span>
                <span className="import-section-count">{impTpls.length}</span>
              </div>
              {impTpls.length > 0 && (
                <div className="import-item-list">
                  {impTpls.slice(0, 5).map(([id, tpl]) => (
                    <div key={id} className="import-item">{tpl.name}</div>
                  ))}
                  {impTpls.length > 5 && (
                    <div className="import-item import-item-more">+{impTpls.length - 5} more</div>
                  )}
                </div>
              )}
            </div>

            {/* Campaigns */}
            <div className="import-section">
              <div className="import-section-header">
                <span className="import-section-title">Campaigns</span>
                <span className="import-section-count">{impCamps.length}</span>
              </div>
              {impCamps.length > 0 && (
                <div className="import-item-list">
                  {impCamps.slice(0, 5).map((c, i) => (
                    <div key={i} className="import-item">
                      {c.templateName || "Untitled"}
                      <span style={{ color: "var(--tx3)", marginLeft: 6 }}>
                        · {c.recipients?.length ?? 0} recipients
                        · {c.status === "sent" ? "Sent" : `Draft · Step ${c.step ?? 1}`}
                      </span>
                    </div>
                  ))}
                  {impCamps.length > 5 && (
                    <div className="import-item import-item-more">+{impCamps.length - 5} more</div>
                  )}
                </div>
              )}
            </div>

            {/* Known emails */}
            <div className="import-section">
              <div className="import-section-header">
                <span className="import-section-title">Known emails</span>
                <span className="import-section-count">{impEmails.length}</span>
              </div>
            </div>

            {/* Import mode */}
            <div style={{ height: 1, background: "var(--bd)", margin: "18px 0" }} />
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--tx2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Import mode
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label className="import-mode-option">
                <input type="radio" name="importMode" value="merge" checked={importMode === "merge"} onChange={() => setImportMode("merge")} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Merge with existing data</div>
                  <div style={{ fontSize: 12, color: "var(--tx3)", marginTop: 2 }}>
                    All imported items are added alongside your current data. Templates and campaigns receive new IDs.
                  </div>
                </div>
              </label>
              <label className="import-mode-option">
                <input type="radio" name="importMode" value="replace" checked={importMode === "replace"} onChange={() => setImportMode("replace")} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Replace all existing data</div>
                  <div style={{ fontSize: 12, color: "var(--red)", marginTop: 2 }}>
                    ⚠ Your current {tplCount} template{tplCount !== 1 ? "s" : ""}, {campCount} campaign{campCount !== 1 ? "s" : ""}, and {emailCount} known email{emailCount !== 1 ? "s" : ""} will be permanently deleted.
                  </div>
                </div>
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" onClick={() => setPendingImport(null)}>Cancel</button>
            <button
              className={`btn ${importMode === "replace" ? "btn-danger" : "btn-primary"}`}
              onClick={confirmImport}
            >
              {importMode === "replace" ? "Replace data…" : "Import"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main permissions modal ──
  return (
    <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Account & permissions</div>
          <div className="modal-desc">Signed in with Google</div>
        </div>
        <div className="modal-body">

          {user && (
            <div className="perm-profile">
              <img src={user.picture} alt={user.name} className="perm-avatar" referrerPolicy="no-referrer" />
              <div>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{user.name}</div>
                <div style={{ fontSize: 13, color: "var(--tx2)", marginTop: 2 }}>{user.email}</div>
                {user.hd && (
                  <div className="org-badge" style={{ marginTop: 6 }}>
                    {user.hd !== "gmail.com" ? user.hd.split(".")[0].toUpperCase() : "ORGANISATION"}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ height: 1, background: "var(--bd)", margin: "18px 0" }} />

          <div className="perm-section-label">Permissions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {REQUESTED_SCOPES.map(scope => {
              const meta    = SCOPE_META[scope];
              const granted = grantedScopes.includes(scope);
              return (
                <div key={scope} className="perm-row">
                  <div className={`perm-dot ${granted ? "perm-dot-granted" : "perm-dot-denied"}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{meta?.label ?? scope}</div>
                    <div style={{ fontSize: 12, color: "var(--tx3)", marginTop: 2 }}>{meta?.description}</div>
                  </div>
                  <div className={`perm-status ${granted ? "perm-status-granted" : "perm-status-denied"}`}>
                    {granted ? "Granted" : "Not granted"}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ height: 1, background: "var(--bd)", margin: "18px 0" }} />

          <div className="perm-section-label">Data</div>
          <div style={{ display: "flex", gap: 8, marginBottom: importError ? 8 : 0 }}>
            <button className="btn btn-sm" style={{ flex: 1 }} onClick={onExport}>
              ↓ Export all data
            </button>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFileChange} />
            <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => { setImportError(""); fileInputRef.current?.click(); }}>
              ↑ Import data
            </button>
          </div>
          {importError && (
            <div style={{ fontSize: 12, color: "var(--red)", marginTop: 8, lineHeight: 1.5 }}>{importError}</div>
          )}

        </div>
        <div className="modal-footer">
          <button className="btn btn-danger" onClick={handleLogout}>Sign out</button>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Shell layout ─────────────────────────────────────────────────────────────

function Shell() {
  const [savedTemplates, setSavedTemplates] = useState<Templates>(loadTemplates);
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns);
  const [knownEmails, setKnownEmails] = useState<string[]>(loadKnownEmails);
  const [showPerms, setShowPerms] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, type: "success" | "error") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const updateTemplates = (t: Templates) => {
    setSavedTemplates(t);
    localStorage.setItem("spark-templates", JSON.stringify(t));
  };

  const saveCampaign = useCallback((c: Campaign) => {
    setCampaigns(prev => {
      const exists = prev.some(x => x.id === c.id);
      const next = exists ? prev.map(x => x.id === c.id ? c : x) : [...prev, c];
      localStorage.setItem("spark-campaigns", JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns(prev => {
      const next = prev.filter(c => c.id !== id);
      localStorage.setItem("spark-campaigns", JSON.stringify(next));
      return next;
    });
  }, []);

  const addKnownEmails = (emails: string[]) => {
    setKnownEmails(prev => {
      const set = new Set(prev);
      emails.forEach(e => set.add(e.toLowerCase().trim()));
      const next = Array.from(set);
      localStorage.setItem("spark-known-emails", JSON.stringify(next));
      return next;
    });
  };

  function exportAllData() {
    try {
      const payload: SparkExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        templates: savedTemplates,
        campaigns,
        knownEmails,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `spark-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const tplCount  = Object.keys(savedTemplates).length;
      const campCount = campaigns.length;
      showToast(`Exported ${tplCount} template${tplCount !== 1 ? "s" : ""} and ${campCount} campaign${campCount !== 1 ? "s" : ""}.`, "success");
    } catch {
      showToast("Export failed. Please try again.", "error");
    }
  }

  function mergeData(data: SparkExport) {
    const merged = { ...savedTemplates };
    Object.values(data.templates).forEach(tpl => { merged[uuidv4()] = tpl; });
    updateTemplates(merged);
    data.campaigns.forEach(c => saveCampaign({ ...c, id: uuidv4(), timestamp: Date.now() }));
    addKnownEmails(data.knownEmails ?? []);
    const tplCount  = Object.keys(data.templates).length;
    const campCount = data.campaigns.length;
    showToast(`Merged ${tplCount} template${tplCount !== 1 ? "s" : ""} and ${campCount} campaign${campCount !== 1 ? "s" : ""}.`, "success");
  }

  function replaceData(data: SparkExport) {
    updateTemplates(data.templates);
    setCampaigns(data.campaigns);
    localStorage.setItem("spark-campaigns", JSON.stringify(data.campaigns));
    const emails = data.knownEmails ?? [];
    setKnownEmails(emails);
    localStorage.setItem("spark-known-emails", JSON.stringify(emails));
    const tplCount  = Object.keys(data.templates).length;
    const campCount = data.campaigns.length;
    showToast(`Replaced with ${tplCount} template${tplCount !== 1 ? "s" : ""} and ${campCount} campaign${campCount !== 1 ? "s" : ""}.`, "success");
  }

  const ctx: AppContext = { savedTemplates, updateTemplates, campaigns, saveCampaign, deleteCampaign, knownEmails, addKnownEmails };

  return (
    <div className="editor">
      <Sidebar onOpenPerms={() => setShowPerms(true)} />
      {showPerms && (
        <PermissionsModal
          onClose={() => setShowPerms(false)}
          savedTemplates={savedTemplates}
          campaigns={campaigns}
          knownEmails={knownEmails}
          onExport={exportAllData}
          onMerge={mergeData}
          onReplace={replaceData}
        />
      )}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.message}
        </div>
      )}
      <div className="main">
        <Appbar savedTemplates={savedTemplates} updateTemplates={updateTemplates} campaigns={campaigns} saveCampaign={saveCampaign} />
        <div className="content">
          <Outlet context={ctx} />
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ onOpenPerms }: { onOpenPerms: () => void }) {
  const { user } = useAuth();

  return (
    <aside className="rail">
      <div className="rail-header">
        <SparkBrand size="sm" />
      </div>

      <div className="rail-body">
        <NavLink
          to="/campaigns"
          end={false}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <div className="nav-icon"><CalendarDays size={16} /></div>
          <div>Campaigns</div>
        </NavLink>
        <NavLink
          to="/templates"
          end={false}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <div className="nav-icon"><FileText size={16} /></div>
          <div>Templates</div>
        </NavLink>
      </div>

      {user && (
        <div className="rail-user" onClick={onOpenPerms}>
          <img src={user.picture} alt={user.name} className="rail-avatar" referrerPolicy="no-referrer" />
          <div className="rail-user-info">
            <div className="rail-user-name">{user.name}</div>
            <div className="rail-user-email">{user.email}</div>
            {user.hd && (
              <span className="org-badge" style={{ marginTop: 5 }}>
                {user.hd !== "gmail.com" ? user.hd.split(".")[0].toUpperCase() : "ORGANISATION"}
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Appbar ───────────────────────────────────────────────────────────────────

const ROUTE_TITLES: Record<string, string> = {
  "/campaigns":     "Campaigns",
  "/campaigns/new": "New Campaign",
  "/templates":     "Templates",
  "/templates/new": "New Template",
};

interface AppbarProps {
  savedTemplates: Templates;
  updateTemplates: (t: Templates) => void;
  campaigns: Campaign[];
  saveCampaign: (c: Campaign) => void;
}

function Appbar({ savedTemplates, updateTemplates, campaigns: _campaigns, saveCampaign }: AppbarProps) {
  const location     = useLocation();
  const navigate     = useNavigate();
  const fileInputRef       = useRef<HTMLInputElement>(null);
  const campaignFileRef    = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Template | null>(null);
  const [pendingCampaignImport, setPendingCampaignImport] = useState<Campaign | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editTemplateMatch = location.pathname.match(/^\/templates\/(.+)\/edit$/);
  const editCampaignMatch = location.pathname.match(/^\/campaigns\/(.+)\/edit$/);
  const title = editTemplateMatch ? "Edit Template"
    : editCampaignMatch ? "Edit Campaign"
    : (ROUTE_TITLES[location.pathname] ?? "Spark");

  // Back route: sub-routes go back to their list home
  const backRoute = location.pathname.startsWith("/campaigns/") ? "/campaigns"
    : location.pathname.startsWith("/templates/") ? "/templates"
    : null;

  const onCampaignsList = location.pathname === "/campaigns";
  const onTemplatesList = location.pathname === "/templates";

  function showToast(message: string, type: "success" | "error") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (typeof data.name !== "string" || typeof data.content !== "string") {
          showToast("Invalid template file — missing required fields.", "error");
          return;
        }
        if (!Array.isArray(data.variables)) data.variables = [];
        setPendingImport(data as Template);
      } catch {
        showToast("Could not parse the selected file as JSON.", "error");
      }
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!pendingImport) return;
    const name = pendingImport.name.trim();
    if (!name) { showToast("Template name is required.", "error"); return; }
    const updated = { ...savedTemplates, [uuidv4()]: { ...pendingImport, name } };
    updateTemplates(updated);
    setPendingImport(null);
    navigate("/templates");
    showToast(`"${name}" imported successfully.`, "success");
  }

  function handleCampaignFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (typeof data.templateName !== "string" || !Array.isArray(data.recipients)) {
          showToast("Invalid campaign file — missing required fields.", "error");
          return;
        }
        setPendingCampaignImport(data as Campaign);
      } catch {
        showToast("Could not parse the selected file as JSON.", "error");
      }
    };
    reader.readAsText(file);
  }

  function confirmCampaignImport() {
    if (!pendingCampaignImport) return;
    const c: Campaign = {
      ...pendingCampaignImport,
      id: uuidv4(),
      status: "draft",
      sentAt: undefined,
      timestamp: Date.now(),
    };
    saveCampaign(c);
    setPendingCampaignImport(null);
    navigate("/campaigns");
    showToast(`Campaign imported as draft.`, "success");
  }

  return (
    <>
      <div className="appbar">
        {backRoute && (
          <button className="appbar-back" onClick={() => navigate(backRoute)} title="Back">
            <ArrowLeft size={16} />
          </button>
        )}
        <span className="appbar-title">{title}</span>
        <div className="ab-right">
          {onCampaignsList && (
            <>
              <input
                ref={campaignFileRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleCampaignFileChange}
              />
              <button className="btn btn-appbar" onClick={() => campaignFileRef.current?.click()}>
                Import Campaign
              </button>
              <button className="btn btn-primary btn-appbar" onClick={() => navigate("/campaigns/new")}>
                + New Campaign
              </button>
            </>
          )}
          {onTemplatesList && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <button className="btn btn-appbar" onClick={() => fileInputRef.current?.click()}>
                Import Template
              </button>
              <button className="btn btn-primary btn-appbar" onClick={() => navigate("/templates/new")}>
                + New Template
              </button>
            </>
          )}
        </div>
      </div>

      {pendingImport && (
        <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && setPendingImport(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">Import template</div>
              <div className="modal-desc">Review the template before importing it into Spark.</div>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Name</label>
                <input
                  type="text"
                  value={pendingImport.name}
                  onChange={e => setPendingImport({ ...pendingImport, name: e.target.value })}
                  autoFocus
                />
              </div>
              {pendingImport.variables.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: "var(--tx2)", marginBottom: 8 }}>Variables</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {pendingImport.variables.map((v, i) => (
                      <span key={i} className="var-tag">
                        {"{" + v.name + "}"}{v.default ? ` = ${v.default}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 13, color: "var(--tx2)", marginBottom: 10 }}>Preview</div>
              <EventPreview template={pendingImport} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setPendingImport(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmImport}>Import</button>
            </div>
          </div>
        </div>
      )}

      {pendingCampaignImport && (
        <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && setPendingCampaignImport(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Import campaign</div>
              <div className="modal-desc">This campaign will be imported as a draft.</div>
            </div>
            <div className="modal-body">
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-label">Template</div>
                  <div className="stat-value" style={{ fontSize: 15 }}>{pendingCampaignImport.templateName || "—"}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Recipients</div>
                  <div className="stat-value">{pendingCampaignImport.recipientCount ?? pendingCampaignImport.recipients?.length ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Step</div>
                  <div className="stat-value">{pendingCampaignImport.step ?? 1} of 4</div>
                </div>
              </div>
              {(pendingCampaignImport.recipients?.length ?? 0) > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, color: "var(--tx2)", marginBottom: 8 }}>Recipients</div>
                  <div style={{ fontSize: 13, color: "var(--tx3)", lineHeight: 1.8 }}>
                    {pendingCampaignImport.recipients.slice(0, 5).join(", ")}
                    {pendingCampaignImport.recipients.length > 5 && ` +${pendingCampaignImport.recipients.length - 5} more`}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setPendingCampaignImport(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmCampaignImport}>Import as draft</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.message}
        </div>
      )}
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, isLoading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoading ? null : user
            ? <Navigate to="/campaigns" replace />
            : <LoginPage />
        }
      />
      <Route path="/" element={<Navigate to="/campaigns" replace />} />
      <Route element={<RequireAuth><Shell /></RequireAuth>}>
        <Route path="/campaigns"              element={<CampaignsList />} />
        <Route path="/campaigns/new"          element={<CampaignFlow />} />
        <Route path="/campaigns/:id/edit"     element={<CampaignFlow />} />
        <Route path="/templates"          element={<TemplatesList />} />
        <Route path="/templates/new"      element={<TemplateForm />} />
        <Route path="/templates/:id/edit" element={<TemplateForm />} />
      </Route>
      <Route path="*" element={<Navigate to="/campaigns" replace />} />
    </Routes>
  );
}

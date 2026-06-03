import { useState, useRef, useEffect } from "react";
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
import { CampaignsList, CampaignFlow } from "./CampaignSection";
import { TemplatesList, TemplateForm } from "./TemplatesSection";
import type { Templates, Template } from "./TemplatesSection";
import type { Campaign } from "./CampaignSection";
import { EventPreview } from "./EventPreview";
import { LoginPage } from "./LoginPage";
import { useAuth, SCOPE_META, REQUESTED_SCOPES } from "../context/AuthContext";
import "@styles/global.css";

// ─── Shared context ─────────────────────────────────────────────────────────

export interface AppContext {
  savedTemplates: Templates;
  updateTemplates: (t: Templates) => void;
  campaigns: Campaign[];
  addCampaign: (c: Campaign) => void;
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

// ─── Permissions modal ────────────────────────────────────────────────────────

function PermissionsModal({ onClose }: { onClose: () => void }) {
  const { user, grantedScopes, logout } = useAuth();

  function handleLogout() {
    logout();
    onClose();
  }

  return (
    <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Account & permissions</div>
          <div className="modal-desc">Signed in with Google</div>
        </div>
        <div className="modal-body">

          {/* User profile */}
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

          {/* Permissions */}
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--tx2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Permissions
          </div>
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

  const updateTemplates = (t: Templates) => {
    setSavedTemplates(t);
    localStorage.setItem("spark-templates", JSON.stringify(t));
  };

  const addCampaign = (c: Campaign) => {
    setCampaigns(prev => {
      const next = [...prev, c];
      localStorage.setItem("spark-campaigns", JSON.stringify(next));
      return next;
    });
  };

  const addKnownEmails = (emails: string[]) => {
    setKnownEmails(prev => {
      const set = new Set(prev);
      emails.forEach(e => set.add(e.toLowerCase().trim()));
      const next = Array.from(set);
      localStorage.setItem("spark-known-emails", JSON.stringify(next));
      return next;
    });
  };

  const ctx: AppContext = { savedTemplates, updateTemplates, campaigns, addCampaign, knownEmails, addKnownEmails };

  return (
    <div className="editor">
      <Sidebar />
      <div className="main">
        <Appbar savedTemplates={savedTemplates} updateTemplates={updateTemplates} />
        <div className="content">
          <Outlet context={ctx} />
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar() {
  const { user } = useAuth();
  const [showPerms, setShowPerms] = useState(false);

  return (
    <>
      <aside className="rail">
        <div className="rail-header">
          <div className="ab-logo">S</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--tx)" }}>Spark</div>
            <div style={{ fontSize: 12, color: "var(--tx3)" }}>Calendar Invites</div>
          </div>
        </div>

        <div className="rail-body">
          <NavLink
            to="/campaigns"
            end={false}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <div className="nav-icon">📅</div>
            <div>Campaigns</div>
          </NavLink>
          <NavLink
            to="/templates"
            end={false}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <div className="nav-icon">📝</div>
            <div>Templates</div>
          </NavLink>
        </div>

        {/* User profile — bottom of sidebar */}
        {user && (
          <div className="rail-user" onClick={() => setShowPerms(true)}>
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

      {showPerms && <PermissionsModal onClose={() => setShowPerms(false)} />}
    </>
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
}

function Appbar({ savedTemplates, updateTemplates }: AppbarProps) {
  const location     = useLocation();
  const navigate     = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Template | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editMatch = location.pathname.match(/^\/templates\/(.+)\/edit$/);
  const title = editMatch
    ? "Edit Template"
    : (ROUTE_TITLES[location.pathname] ?? "Spark");

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

  return (
    <>
      <div className="appbar">
        <span className="appbar-title">{title}</span>
        <div className="ab-right">
          {onCampaignsList && (
            <button className="btn btn-primary btn-appbar" onClick={() => navigate("/campaigns/new")}>
              + New Campaign
            </button>
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
        <Route path="/campaigns"          element={<CampaignsList />} />
        <Route path="/campaigns/new"      element={<CampaignFlow />} />
        <Route path="/templates"          element={<TemplatesList />} />
        <Route path="/templates/new"      element={<TemplateForm />} />
        <Route path="/templates/:id/edit" element={<TemplateForm />} />
      </Route>
      <Route path="*" element={<Navigate to="/campaigns" replace />} />
    </Routes>
  );
}

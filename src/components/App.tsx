import { useState } from "react";
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
import type { Templates } from "./TemplatesSection";
import type { Campaign } from "./CampaignSection";
import "@styles/global.css";

// ─── Shared context ─────────────────────────────────────────────────────────

export interface AppContext {
  savedTemplates: Templates;
  updateTemplates: (t: Templates) => void;
  campaigns: Campaign[];
  addCampaign: (c: Campaign) => void;
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

// ─── Shell layout ─────────────────────────────────────────────────────────────

function Shell() {
  const [savedTemplates, setSavedTemplates] = useState<Templates>(loadTemplates);
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns);

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

  const ctx: AppContext = { savedTemplates, updateTemplates, campaigns, addCampaign };

  return (
    <div className="editor">
      <Sidebar />
      <div className="main">
        <Appbar />
        <div className="content">
          <Outlet context={ctx} />
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar() {
  return (
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

function Appbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // For /templates/:id/edit, match dynamically
  const editMatch = location.pathname.match(/^\/templates\/(.+)\/edit$/);
  const title = editMatch
    ? "Edit Template"
    : (ROUTE_TITLES[location.pathname] ?? "Spark");

  const onCampaignsList = location.pathname === "/campaigns";
  const onTemplatesList = location.pathname === "/templates";

  return (
    <div className="appbar">
      <span className="appbar-title">{title}</span>
      <div className="ab-right">
        {onCampaignsList && (
          <button
            className="btn btn-primary btn-appbar"
            onClick={() => navigate("/campaigns/new")}
          >
            + New Campaign
          </button>
        )}
        {onTemplatesList && (
          <button
            className="btn btn-primary btn-appbar"
            onClick={() => navigate("/templates/new")}
          >
            + New Template
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/campaigns" replace />} />
      <Route element={<Shell />}>
        <Route path="/campaigns"     element={<CampaignsList />} />
        <Route path="/campaigns/new" element={<CampaignFlow />} />
        <Route path="/templates"           element={<TemplatesList />} />
        <Route path="/templates/new"       element={<TemplateForm />} />
        <Route path="/templates/:id/edit"  element={<TemplateForm />} />
      </Route>
    </Routes>
  );
}

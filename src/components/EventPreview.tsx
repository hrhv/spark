import type { Template } from "./TemplatesSection";

// ─── Timezones (single source of truth) ──────────────────────────────────────

export const TIMEZONES = [
  { value: "UTC",                 label: "UTC" },
  { value: "America/New_York",    label: "Eastern Time (ET)" },
  { value: "America/Chicago",     label: "Central Time (CT)" },
  { value: "America/Denver",      label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Sao_Paulo",   label: "Brasília Time (BRT)" },
  { value: "Europe/London",       label: "London (GMT/BST)" },
  { value: "Europe/Paris",        label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin",       label: "Berlin (CET/CEST)" },
  { value: "Asia/Dubai",          label: "Dubai (GST)" },
  { value: "Asia/Kolkata",        label: "India (IST)" },
  { value: "Asia/Calcutta",        label: "India (IST)" },
  { value: "Asia/Singapore",      label: "Singapore (SGT)" },
  { value: "Asia/Tokyo",          label: "Tokyo (JST)" },
  { value: "Australia/Sydney",    label: "Sydney (AEST/AEDT)" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatDateLine(date: string, startTime: string, endTime: string): string {
  const parts: string[] = [];
  if (date) {
    const d = new Date(date + "T12:00:00");
    parts.push(d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
  }
  if (startTime) {
    parts.push(endTime ? `${formatTime(startTime)} – ${formatTime(endTime)}` : formatTime(startTime));
  }
  return parts.join(" · ");
}

function substitute(text: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (result, [name, value]) =>
      result.replace(new RegExp("\\{" + name + "\\}", "g"), value),
    text
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface EventPreviewProps {
  /** The template (saved or a live draft constructed from current form state). */
  template: Template;
  /**
   * Flat map of variable name → resolved value for this recipient.
   * Falls back to variable defaults for any name not present.
   */
  values?: Record<string, string>;
}

export function EventPreview({ template, values = {} }: EventPreviewProps) {
  // Merge: caller-supplied values win; fall back to the variable's default.
  const resolved: Record<string, string> = {};
  (template.variables ?? []).forEach(v => {
    resolved[v.name] = values[v.name] ?? v.default ?? "";
  });

  const title    = substitute(template.eventTitle ?? "", resolved);
  const location = substitute(template.location   ?? "", resolved);
  const html     = substitute(template.content,          resolved);
  const dateLine = formatDateLine(template.date ?? "", template.startTime ?? "", template.endTime ?? "");
  const tzLabel  = TIMEZONES.find(tz => tz.value === template.timezone)?.label ?? template.timezone ?? "";

  return (
    <>
      <div className="event-preview-card">
        <div className="event-preview-title">
          {title || <span style={{ color: "var(--tx3)", fontWeight: 400 }}>Event title…</span>}
        </div>
        {dateLine  && <div className="event-preview-meta">📅 {dateLine}</div>}
        {tzLabel   && <div className="event-preview-meta">🌐 {tzLabel}</div>}
        {location  && <div className="event-preview-meta">📍 {location}</div>}
        {template.addMeet && (
          <div className="event-preview-meet">🎥 Google Meet video conferencing</div>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--tx2)", marginBottom: 8 }}>
        Description
      </div>
      <div
        className="preview-box preview-box-rich"
        style={{ minHeight: 160 }}
        dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
      />
    </>
  );
}

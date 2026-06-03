import type { Template } from "@/types";

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
  { value: "Asia/Calcutta",       label: "India (IST)" },
  { value: "Asia/Singapore",      label: "Singapore (SGT)" },
  { value: "Asia/Tokyo",          label: "Tokyo (JST)" },
  { value: "Australia/Sydney",    label: "Sydney (AEST/AEDT)" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTime(t: string): string {
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
  template: Template;
  values?: Record<string, string>;
}

export function EventPreview({ template, values = {} }: EventPreviewProps) {
  // Resolve user-defined variables
  const resolved: Record<string, string> = {};
  (template.variables ?? []).forEach(v => {
    resolved[v.name] = values[v.name] ?? v.default ?? "";
  });

  // Determine effective raw values for the event card date line
  const rawDate  = template.dateIsVariable      ? (values["eventDate"]  ?? "") : (template.date      ?? "");
  const rawStart = template.startTimeIsVariable ? (values["startTime"]  ?? "") : (template.startTime ?? "");
  const rawEnd   = template.endTimeIsVariable   ? (values["endTime"]    ?? "") : (template.endTime   ?? "");

  // Add formatted reserved variable values so {eventDate}/{startTime}/{endTime}
  // tokens in title, location, and description substitute correctly.
  // Only add when a real value exists — if absent the token stays literal in text.
  if (template.dateIsVariable && rawDate) {
    resolved["eventDate"] = new Date(rawDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  if (template.startTimeIsVariable && rawStart) {
    resolved["startTime"] = formatTime(rawStart);
  }
  if (template.endTimeIsVariable && rawEnd) {
    resolved["endTime"] = formatTime(rawEnd);
  }

  const title    = substitute(template.eventTitle ?? "", resolved);
  const location = substitute(template.location   ?? "", resolved);
  const html     = substitute(template.content,          resolved);
  const dateLine = formatDateLine(rawDate, rawStart, rawEnd);
  const tzLabel  = TIMEZONES.find(tz => tz.value === template.timezone)?.label ?? template.timezone ?? "";

  // Token placeholders shown when a field is a variable but no value has been provided yet
  const datePlaceholders = [
    template.dateIsVariable      && !rawDate  ? "{eventDate}"  : null,
    template.startTimeIsVariable && !rawStart ? "{startTime}"  : null,
    template.endTimeIsVariable   && !rawEnd   ? "{endTime}"    : null,
  ].filter(Boolean).join(" · ");

  // Whether the date row has anything to display
  const hasDateContent = Boolean(dateLine || datePlaceholders);

  return (
    <>
      <div className="event-preview-card">
        <div className="event-preview-title">
          {title || <span style={{ color: "var(--tx3)", fontWeight: 400 }}>Event title…</span>}
        </div>
        {/* Always rendered — visibility keeps the row in flow so the card height never shifts */}
        <div className="event-preview-meta" style={{ visibility: hasDateContent ? "visible" : "hidden" }}>
          📅{" "}
          {dateLine || (
            <span style={{ color: "var(--tx3)", fontFamily: "var(--mono)", fontSize: 12 }}>
              {datePlaceholders}
            </span>
          )}
        </div>
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

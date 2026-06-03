import type {
  Template,
  Variable,
  SparkCalendarDateTime,
  SparkCalendarEventPayload,
} from "@/types";

// Re-export so callers can import the payload type from here if preferred.
export type { SparkCalendarDateTime, SparkCalendarEventPayload };

// ─── Helpers (exported for unit testing) ─────────────────────────────────────

/**
 * Converts editor HTML to plain text for use in the Calendar description field.
 * Handles common block elements and HTML entities.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(div|p|li)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Replaces {variableName} tokens in `text` with the corresponding values.
 */
export function substituteVariables(
  text: string,
  values: Record<string, string>
): string {
  return Object.entries(values).reduce(
    (result, [name, value]) =>
      result.replace(new RegExp("\\{" + name + "\\}", "g"), value),
    text
  );
}

// ─── Transformer ──────────────────────────────────────────────────────────────

/**
 * Converts a Spark `Template` into a Google Calendar Events API payload.
 *
 *
 * @param template            - The Spark template to convert.
 * @param values              - Per-recipient variable overrides (name → value).
 *                              Falls back to each variable's declared default.
 * @param conferenceRequestId - Unique idempotency key for the Meet conference.
 *                              Required when `template.addMeet` is true; must
 *                              be stable across retries (e.g. `${campaignId}-${ri}`).
 */
export function toGoogleCalendarEvent(
  template: Template,
  values: Record<string, string> = {},
  conferenceRequestId = ""
): SparkCalendarEventPayload {
  // Seed resolved with ALL caller values first so that reserved variables
  // (eventDate, startTime, endTime) that live only in `values` — not in
  // template.variables — are still substituted in title/description/location.
  // Then override each declared template variable so its default is applied
  // when the caller omitted a value.
  const resolved: Record<string, string> = { ...values };
  (template.variables ?? []).forEach((v: Variable) => {
    resolved[v.name] = values[v.name] ?? v.default ?? "";
  });

  const summary     = substituteVariables(template.eventTitle ?? "", resolved);
  const description = htmlToPlainText(substituteVariables(template.content, resolved));
  const location    = substituteVariables(template.location ?? "", resolved);
  const tz          = template.timezone ?? "UTC";

  // When date/time fields are variable-driven, pull from the per-recipient values.
  const effectiveDate      = template.dateIsVariable      ? (values.eventDate  ?? "") : (template.date      ?? "");
  const effectiveStartTime = template.startTimeIsVariable ? (values.startTime  ?? "") : (template.startTime ?? "");
  const effectiveEndTime   = template.endTimeIsVariable   ? (values.endTime    ?? "") : (template.endTime   ?? "");

  // Build start / end — use dateTime when a clock time is present, date-only otherwise.
  let start: SparkCalendarDateTime = {};
  let end:   SparkCalendarDateTime = {};

  if (effectiveDate) {
    if (effectiveStartTime) {
      start = { dateTime: `${effectiveDate}T${effectiveStartTime}:00`, timeZone: tz };
    } else {
      start = { date: effectiveDate };
    }

    if (effectiveEndTime) {
      end = { dateTime: `${effectiveDate}T${effectiveEndTime}:00`, timeZone: tz };
    } else if (effectiveStartTime) {
      // No explicit end time — mirror start so the payload is always valid.
      end = { dateTime: `${effectiveDate}T${effectiveStartTime}:00`, timeZone: tz };
    } else {
      end = { date: effectiveDate };
    }
  }

  const event: SparkCalendarEventPayload = { summary, description, location, start, end };

  if (template.addMeet) {
    event.conferenceData = {
      createRequest: {
        requestId: conferenceRequestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  return event;
}

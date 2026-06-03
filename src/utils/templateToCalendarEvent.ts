import { GoogleCalendarEvent } from "@/types";
import type { Template, Variable } from "../components/TemplatesSection";

// ─── Output types ─────────────────────────────────────────────────────────────

export interface SparkCalendarDateTime {
  /** RFC3339 string (e.g. "2026-06-15T14:00:00"). Present when a time is set. */
  dateTime?: string;
  /** YYYY-MM-DD string. Used for all-day events (no startTime on the template). */
  date?: string;
  /** IANA timezone name. Only set alongside dateTime. */
  timeZone?: string;
}

export interface SparkCalendarEventPayload {
  /** Maps to Google Calendar `summary`. */
  summary: string;
  /** Plain-text version of the rich-text description. */
  description: string;
  /** Resolved location string (variables substituted). */
  location: string;
  start: SparkCalendarDateTime;
  end: SparkCalendarDateTime;
  /** Only present when template.addMeet is true. */
  conferenceData?: {
    createRequest: {
      /** Caller-supplied unique string. Must be stable across retries. */
      requestId: string;
      conferenceSolutionKey: { type: "hangoutsMeet" };
    };
  };
}

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
 * This is a pure function — no DOM, no side effects — so it can be unit tested
 * without a browser environment.
 *
 * @param template            - The Spark template to convert.
 * @param values              - Per-recipient variable overrides (name → value).
 *                              Falls back to each variable's declared default.
 * @param conferenceRequestId - Unique idempotency key for the Meet conference
 *                              create request. Required when `template.addMeet`
 *                              is true; caller is responsible for uniqueness
 *                              (e.g. a UUID or `recipientId + campaignId`).
 */
export function toGoogleCalendarEvent(
  template: Template,
  values: Record<string, string> = {},
  conferenceRequestId = ""
): GoogleCalendarEvent | SparkCalendarEventPayload {
  // Resolve all variables: caller wins, then fall back to declared defaults.
  const resolved: Record<string, string> = {};
  (template.variables ?? []).forEach((v: Variable) => {
    resolved[v.name] = values[v.name] ?? v.default ?? "";
  });

  const summary     = substituteVariables(template.eventTitle ?? "", resolved);
  const description = htmlToPlainText(substituteVariables(template.content, resolved));
  const location    = substituteVariables(template.location ?? "", resolved);
  const tz          = template.timezone ?? "UTC";

  // Build start / end — use dateTime when a clock time is present, date-only otherwise.
  let start: SparkCalendarDateTime = {};
  let end:   SparkCalendarDateTime = {};

  if (template.date) {
    if (template.startTime) {
      start = { dateTime: `${template.date}T${template.startTime}:00`, timeZone: tz };
    } else {
      start = { date: template.date };
    }

    if (template.endTime) {
      end = { dateTime: `${template.date}T${template.endTime}:00`, timeZone: tz };
    } else if (template.startTime) {
      // No explicit end time — mirror start so the payload is always valid.
      end = { dateTime: `${template.date}T${template.startTime}:00`, timeZone: tz };
    } else {
      end = { date: template.date };
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

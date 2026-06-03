/**
 * Core type definitions for Spark.
 * All domain interfaces and value-level constants live here.
 * No imports from other app modules — this is the foundation layer.
 */

// ─── Legacy / CSV types ───────────────────────────────────────────────────────

export interface Invitee {
  email: string;
  firstName: string;
  lastName: string;
  customFields: Record<string, string>;
}

export interface InviteTemplate {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  meetingLink?: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InviteCampaign {
  id: string;
  templateId: string;
  invitees: Invitee[];
  status: "draft" | "ready" | "sending" | "completed";
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  successCount: number;
  failureCount: number;
  errors: LegacyCampaignError[];
}

export interface LegacyCampaignError {
  email: string;
  error: string;
  timestamp: Date;
}

/** @deprecated Use LegacyCampaignError */
export type CampaignError = LegacyCampaignError;

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export interface TemplateVariable {
  name: string;
  placeholder: string;
  isRequired: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Google auth ──────────────────────────────────────────────────────────────

export interface GoogleAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** Decoded Google ID-token claims shown in the UI. */
export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  /** Hosted domain — present only for Google Workspace accounts. */
  hd?: string;
}

// ─── Google Calendar API ──────────────────────────────────────────────────────

export interface GoogleCalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  conferenceData?: {
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
  attendees: Array<{
    email: string;
    displayName?: string;
  }>;
}

/** Flexible start/end used by Spark when building Calendar API payloads. */
export interface SparkCalendarDateTime {
  /** RFC3339 string (e.g. "2026-06-15T14:00:00"). Present when a time is set. */
  dateTime?: string;
  /** YYYY-MM-DD string. Used for all-day events. */
  date?: string;
  /** IANA timezone name. Only set alongside dateTime. */
  timeZone?: string;
}

export interface SparkCalendarEventPayload {
  summary: string;
  description: string;
  location: string;
  start: SparkCalendarDateTime;
  end: SparkCalendarDateTime;
  /** Only present when template.addMeet is true. */
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: "hangoutsMeet" };
    };
  };
}

// ─── Directory ────────────────────────────────────────────────────────────────

export interface DirectoryPerson {
  name: string;
  email: string;
  photo?: string;
}

// ─── Template ─────────────────────────────────────────────────────────────────

export interface Variable {
  name: string;
  default: string;
}

export interface Template {
  name: string;
  variables: Variable[];
  content: string;
  eventTitle?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  location?: string;
  addMeet?: boolean;
  /** When true, the date comes from the per-recipient `eventDate` variable. */
  dateIsVariable?: boolean;
  /** When true, start time comes from the per-recipient `startTime` variable. */
  startTimeIsVariable?: boolean;
  /** When true, end time comes from the per-recipient `endTime` variable. */
  endTimeIsVariable?: boolean;
}

export type Templates = Record<string, Template>;

export const RESERVED_VARIABLE_NAMES = ["eventDate", "startTime", "endTime"] as const;
export type ReservedVariableName = typeof RESERVED_VARIABLE_NAMES[number];

// ─── Campaign ─────────────────────────────────────────────────────────────────

export interface CampaignSendError {
  email: string;
  error: string;
}

export interface Campaign {
  id: string;
  status: "draft" | "sent";
  templateId: string;
  templateName: string;
  recipientCount: number;
  recipients: string[];
  variables: Variable[];
  timestamp: number;
  /** ISO locale string when the campaign was sent. */
  sentAt?: string;
  successCount?: number;
  failureCount?: number;
  errors?: CampaignSendError[];
  /** Draft-only: which wizard step the user is on (1–4). */
  step?: number;
  mappings?: Record<string, Record<string, string>>;
  variableRules?: Record<string, string>;
  recipientDetails?: Record<string, DirectoryPerson>;
}

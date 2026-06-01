/**
 * Core type definitions for Bulk Invite
 * All interfaces are strict and well-documented
 */

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
  body: string; // Template body with {variables}
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
  errors: CampaignError[];
}

export interface CampaignError {
  email: string;
  error: string;
  timestamp: Date;
}

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

export interface GoogleAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

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

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

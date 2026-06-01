/**
 * Google Calendar API Integration
 * Handles OAuth and event creation
 */

import { GoogleAuthToken, GoogleCalendarEvent, Invitee } from "@/types";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";

/**
 * Get Google OAuth login URL
 * User should be redirected here to authenticate
 */
export function getGoogleAuthURL(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: GOOGLE_SCOPES.join(" "),
    prompt: "consent",
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Handle OAuth callback and extract token from URL
 * Called after user returns from Google login page
 */
export function handleOAuthCallback(): GoogleAuthToken | null {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const expiresIn = params.get("expires_in");
  const tokenType = params.get("token_type");
  const scope = params.get("scope");

  if (!accessToken) return null;

  // Clean up the URL
  window.history.replaceState({}, document.title, window.location.pathname);

  return {
    access_token: accessToken,
    token_type: tokenType || "Bearer",
    expires_in: expiresIn ? parseInt(expiresIn) : 3600,
    scope: scope || GOOGLE_SCOPES.join(" "),
  };
}

/**
 * Store auth token
 * Token is stored with expiry time for auto-refresh checking
 */
export function storeAuthToken(token: GoogleAuthToken): void {
  const tokenData = {
    ...token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
  localStorage.setItem("google_auth_token", JSON.stringify(tokenData));
}

/**
 * Get stored auth token
 */
export function getAuthToken(): GoogleAuthToken | null {
  const stored = localStorage.getItem("google_auth_token");
  if (!stored) return null;

  const token = JSON.parse(stored) as GoogleAuthToken & { expiresAt: number };

  // Check if token is expired
  if (token.expiresAt < Date.now()) {
    localStorage.removeItem("google_auth_token");
    return null;
  }

  return {
    access_token: token.access_token,
    token_type: token.token_type,
    expires_in: token.expires_in,
    scope: token.scope,
  };
}

/**
 * Clear stored auth token
 */
export function clearAuthToken(): void {
  localStorage.removeItem("google_auth_token");
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Create a calendar event via Google Calendar API
 */
export async function createCalendarEvent(
  event: GoogleCalendarEvent
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const token = getAuthToken();
  if (!token) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const response = await fetch(`${GOOGLE_API_BASE}/calendars/primary/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || "Failed to create event",
      };
    }

    const data = (await response.json()) as { id: string };
    return { success: true, eventId: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Build a calendar event from template data
 */
export function buildCalendarEvent(
  invitee: Invitee,
  subject: string,
  description: string,
  startTime: Date,
  endTime: Date,
  location?: string,
  meetingLink?: string
): GoogleCalendarEvent {
  const event: GoogleCalendarEvent = {
    summary: subject,
    description: description,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    attendees: [
      {
        email: invitee.email,
        displayName: `${invitee.firstName} ${invitee.lastName}`,
      },
    ],
  };

  if (location) {
    event.location = location;
  }

  if (meetingLink) {
    event.description += `\n\nMeeting Link: ${meetingLink}`;
  }

  return event;
}

/**
 * Validate Google auth configuration
 */
export function validateGoogleConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    !GOOGLE_CLIENT_ID ||
    GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID")
  ) {
    errors.push("Google Client ID is not configured");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format OAuth token for safe storage
 * Ensures sensitive data is not exposed in logs/debugging
 */
export function sanitizeToken(token: GoogleAuthToken): {
  has_token: boolean;
  type: string;
  scope: string;
} {
  return {
    has_token: !!token.access_token,
    type: token.token_type,
    scope: token.scope,
  };
}

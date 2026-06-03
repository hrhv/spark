import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  /** Hosted domain — present only for Google Workspace accounts. */
  hd?: string;
}

interface StoredAuth {
  user: GoogleUser;
  accessToken: string;
  grantedScopes: string[];
  expiresAt: number;
}

interface AuthContextValue {
  user: GoogleUser | null;
  accessToken: string | null;
  grantedScopes: string[];
  isLoading: boolean;
  setAuth: (
    user: GoogleUser,
    accessToken: string,
    grantedScopes: string[],
    expiresIn: number
  ) => void;
  logout: () => void;
}

// ─── Scopes ───────────────────────────────────────────────────────────────────

export const REQUESTED_SCOPES = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/directory.readonly",
];

export const SCOPE_META: Record<string, { label: string; description: string }> = {
  openid:   { label: "OpenID",          description: "Verify your identity with Google" },
  profile:  { label: "Profile",         description: "Your public name and profile photo" },
  email:    { label: "Email address",   description: "Your Google account email" },
  "https://www.googleapis.com/auth/calendar.events": {
    label:       "Google Calendar",
    description: "Create and manage calendar events on your behalf",
  },
  "https://www.googleapis.com/auth/directory.readonly": {
    label:       "Workspace Directory",
    description: "Search your organisation's directory to auto-complete recipients",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "spark-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [grantedScopes, setGrantedScopes] = useState<string[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  // Rehydrate from localStorage on mount; discard if token has expired.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: StoredAuth = JSON.parse(raw);
        if (stored.expiresAt > Date.now()) {
          setUser(stored.user);
          setAccessToken(stored.accessToken);
          setGrantedScopes(stored.grantedScopes);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const setAuth = useCallback(
    (user: GoogleUser, accessToken: string, grantedScopes: string[], expiresIn: number) => {
      const stored: StoredAuth = {
        user, accessToken, grantedScopes,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setUser(user);
      setAccessToken(accessToken);
      setGrantedScopes(grantedScopes);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setAccessToken(null);
    setGrantedScopes([]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, grantedScopes, isLoading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

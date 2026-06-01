/**
 * React Hooks for Bulk Invite
 * Custom hooks for state management and side effects
 */

import { useState, useCallback, useEffect } from "react";
import {
  Invitee,
  InviteTemplate,
  InviteCampaign,
  GoogleAuthToken,
} from "@types/index";
import { getAuthToken, storeAuthToken, clearAuthToken } from "@utils/googleCalendar";

/**
 * Hook for managing Google authentication
 */
export function useGoogleAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    getAuthToken() !== null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback((token: GoogleAuthToken) => {
    try {
      storeAuthToken(token);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setIsAuthenticated(false);
    setError(null);
  }, []);

  return { isAuthenticated, isLoading, error, login, logout };
}

/**
 * Hook for managing campaign state
 */
export function useCampaign() {
  const [campaign, setCampaign] = useState<InviteCampaign | null>(null);
  const [template, setTemplate] = useState<InviteTemplate | null>(null);
  const [invitees, setInvitees] = useState<Invitee[]>([]);

  const updateInvitees = useCallback((newInvitees: Invitee[]) => {
    setInvitees(newInvitees);
  }, []);

  const updateTemplate = useCallback((newTemplate: InviteTemplate) => {
    setTemplate(newTemplate);
  }, []);

  const resetCampaign = useCallback(() => {
    setCampaign(null);
    setTemplate(null);
    setInvitees([]);
  }, []);

  return {
    campaign,
    setCampaign,
    template,
    setTemplate: updateTemplate,
    invitees,
    setInvitees: updateInvitees,
    resetCampaign,
  };
}

/**
 * Hook for managing localStorage persistence
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Failed to read localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Failed to write localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Failed to remove localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

/**
 * Hook for debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

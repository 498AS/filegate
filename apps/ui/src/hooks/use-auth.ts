import { useState, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "filegate_token";

function getStoredToken(): string | null {
  return (
    localStorage.getItem(STORAGE_KEY) ??
    sessionStorage.getItem(STORAGE_KEY)
  );
}

// Simple external store so multiple components stay in sync
let listeners: Array<() => void> = [];
function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
function notify() {
  listeners.forEach((l) => l());
}

export function useAuth() {
  const token = useSyncExternalStore(subscribe, getStoredToken, () => null);

  const login = useCallback((t: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem(STORAGE_KEY, t);
    } else {
      sessionStorage.setItem(STORAGE_KEY, t);
    }
    notify();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    notify();
  }, []);

  return { token, isAuthed: !!token, login, logout };
}

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface AppUser {
  id: string;
  displayName: string;
}

interface AuthState {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "geo_monitoring_token";

function getStoredAuth(): AuthState {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    return { user: null, token, loading: true };
  }
  return { user: null, token: null, loading: false };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(getStoredAuth);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // On mount, validate stored token by calling /api/auth/me
  useEffect(() => {
    if (!state.token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${state.token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("invalid");
        return r.json();
      })
      .then((data) => {
        setState({ user: { id: data.user.id, displayName: data.user.displayName }, token: state.token, loading: false });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登录失败");
      localStorage.setItem(TOKEN_KEY, data.token);
      setState({ user: data.user, token: data.token, loading: false });
    } finally {
      setIsLoggingIn(false);
    }
  }, [isLoggingIn]);

  const register = useCallback(async (username: string, password: string, displayName: string) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "注册失败");
      localStorage.setItem(TOKEN_KEY, data.token);
      setState({ user: data.user, token: data.token, loading: false });
    } finally {
      setIsLoggingIn(false);
    }
  }, [isLoggingIn]);

  const logout = useCallback(() => {
    if (state.token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${state.token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, loading: false });
  }, [state.token]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

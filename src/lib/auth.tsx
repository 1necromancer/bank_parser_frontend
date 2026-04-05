"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface AuthState {
  token: string | null;
  email: string | null;
  name: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithToken: (token: string, email?: string, name?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("auth");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setToken(data.token);
        setEmail(data.email);
        setName(data.name);
        api.setToken(data.token);
      } catch {
        localStorage.removeItem("auth");
      }
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback(
    (t: string, e?: string, n?: string) => {
      setToken(t);
      setEmail(e ?? null);
      setName(n ?? null);
      api.setToken(t);
      localStorage.setItem(
        "auth",
        JSON.stringify({ token: t, email: e, name: n }),
      );
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      persist(res.access_token, email);
      router.push("/");
    },
    [persist, router],
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      await api.register(email, password, name);
      const res = await api.login(email, password);
      persist(res.access_token, email, name);
      router.push("/");
    },
    [persist, router],
  );

  const loginWithToken = useCallback(
    (token: string, email?: string, name?: string) => {
      persist(token, email, name);
      router.push("/");
    },
    [persist, router],
  );

  const logout = useCallback(() => {
    setToken(null);
    setEmail(null);
    setName(null);
    api.setToken(null);
    localStorage.removeItem("auth");
    router.push("/auth/login");
  }, [router]);

  const value = useMemo(
    () => ({ token, email, name, isLoading, login, register, loginWithToken, logout }),
    [token, email, name, isLoading, login, register, loginWithToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

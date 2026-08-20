"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@arborisis/shared-types";
import { fetchMe, logout as apiLogout } from "./api";

/**
 * Session partagée côté client — un seul appel `/auth/me` pour toute l'app
 * (Header, Profil, garde d'accès du flux Ajouter) plutôt qu'un fetch par
 * composant. Pas de SSR ici : les écrans qui en dépendent sont déjà des
 * client components (voir register/login, apps/web/app/register/page.tsx).
 */
interface SessionState {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
    setStatus(me ? "authenticated" : "unauthenticated");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <SessionContext.Provider value={{ user, status, refresh, logout }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession doit être utilisé sous SessionProvider (voir app/providers.tsx)");
  return ctx;
}

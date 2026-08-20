"use client";

import { useCallback, useEffect, useState } from "react";
import type { Recording } from "@arborisis/shared-types";
import { listRecordings, type ListRecordingsParams } from "./api";

interface UseRecordingsResult {
  recordings: Recording[];
  status: "loading" | "ready" | "error";
  error: string | null;
  retry: () => void;
}

/**
 * Chargement de la liste publique — factorisé entre Explorer, Découvrir et
 * Recherche (voir design/handoff/DEV-HANDOFF.md §5, états chargement/erreur).
 * `enabled: false` (Recherche avant toute saisie) évite un appel réseau
 * inutile plutôt que d'interroger l'API avec une requête vide.
 */
export function useRecordings(params: ListRecordingsParams = {}, enabled = true): UseRecordingsResult {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [status, setStatus] = useState<UseRecordingsResult["status"]>(enabled ? "loading" : "ready");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const paramsKey = JSON.stringify(params);

  const load = useCallback(() => {
    if (!enabled) {
      setRecordings([]);
      setStatus("ready");
      return () => {};
    }
    let cancelled = false;
    setStatus("loading");
    listRecordings(params)
      .then((result) => {
        if (cancelled) return;
        setRecordings(result);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, attempt, enabled]);

  useEffect(() => load(), [load]);

  return { recordings, status, error, retry: () => setAttempt((a) => a + 1) };
}

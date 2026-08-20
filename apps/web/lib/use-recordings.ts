"use client";

import { useCallback, useEffect, useState } from "react";
import type { Recording } from "@arborisis/shared-types";
import { getRecording, listRecordings, type ListRecordingsParams } from "./api";

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

/**
 * Détail complet d'un seul enregistrement par id — utilisé par Explorer
 * (Phase 4) pour peupler le panneau de sélection à partir d'un marqueur de
 * carte, qui ne porte que des champs allégés (voir `RecordingMarker`,
 * `GET /recordings/viewport`) et pas de quoi remplir `RecordingSummaryCard`
 * (waveform, auteur, etc.) — voir plan/08 §8.2 point 4 ("requête ciblée").
 */
export function useRecording(id: string | null): { recording: Recording | null; status: "idle" | "loading" | "ready" } {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  useEffect(() => {
    if (!id) {
      setRecording(null);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    getRecording(id).then((result) => {
      if (cancelled) return;
      setRecording(result);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { recording, status };
}

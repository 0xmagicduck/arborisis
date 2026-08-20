"use client";

import { useEffect, useMemo, useState } from "react";
import { TextField, TextareaField } from "@/components/FormField";
import { Button } from "@/components/Button";
import { PlayButton } from "@/components/PlayButton";
import { useAudioPlayer } from "@/lib/audio-player";
import { formatDuration } from "@/lib/format";
import { searchPlaces, type PlaceSuggestion } from "@/lib/geocoding";
import { formatFileSize } from "./local-probe";
import styles from "./page.module.css";

const GEOCODE_DEBOUNCE_MS = 280; // même valeur que Recherche, voir DEV-HANDOFF §3.6

export interface DetailsValues {
  title: string;
  locationLabel: string;
  locationLat: number | null;
  locationLng: number | null;
  description: string;
  tagsInput: string;
}

interface StepDetailsProps {
  file: File;
  durationSeconds: number | null;
  values: DetailsValues;
  onBack: () => void;
  onContinue: (values: DetailsValues) => void;
}

/**
 * Étape 2 — voir design/handoff/DEV-HANDOFF.md §3.4 et
 * design/system/Upload2.dc.html. Autocomplete géographique (Photon, voir
 * plan/07-carte-open-source.md §7.5) depuis la Phase 4 : chaque suggestion
 * choisie renseigne à la fois le libellé "Lieu, Pays" et les coordonnées en
 * un seul geste. Le bouton "Use my current location" (géolocalisation
 * navigateur) reste disponible en complément — utile quand le lieu ne
 * correspond à aucun résultat Photon pertinent (repli hors sentiers,
 * toponyme absent d'OSM) plutôt qu'un blocage complet du flux.
 */
export function StepDetails({ file, durationSeconds, values, onBack, onContinue }: StepDetailsProps) {
  const [form, setForm] = useState(values);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "done" | "error">(
    values.locationLat != null ? "done" : "idle"
  );
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const { toggle, isPlaying } = useAudioPlayer();

  // Mémoïsé + révoqué au démontage plutôt que recréé à chaque rendu (fuite
  // d'URL blob sinon — chaque createObjectURL doit être révoqué une fois).
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);
  const playing = isPlaying("local-preview");

  // Debounce (même valeur que Recherche, DEV-HANDOFF §3.6) + `AbortController`
  // pour ignorer une réponse Photon devenue obsolète si l'utilisateur·ice
  // retape entre-temps (évite qu'une réponse lente écrase une saisie plus
  // récente, cf. pattern déjà établi dans lib/use-recordings.ts avec `cancelled`).
  useEffect(() => {
    const query = form.locationLabel;
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then(setSuggestions)
        .catch(() => {
          // Erreur réseau ponctuelle sur l'autocomplete : pas d'état d'erreur
          // dédié, l'utilisateur·ice peut toujours taper le lieu en texte
          // libre et utiliser "Use my current location" pour les coordonnées.
        });
    }, GEOCODE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.locationLabel]);

  function selectSuggestion(suggestion: PlaceSuggestion) {
    setForm((f) => ({ ...f, locationLabel: suggestion.label, locationLat: suggestion.lat, locationLng: suggestion.lng }));
    setGeoStatus("done");
    setSuggestions([]);
    setSuggestionsOpen(false);
  }

  function requestLocation() {
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((f) => ({ ...f, locationLat: position.coords.latitude, locationLng: position.coords.longitude }));
        setGeoStatus("done");
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: false, timeout: 10_000 }
    );
  }

  const canContinue = form.title.trim().length > 0 && form.locationLabel.trim().length > 0 && form.locationLat != null;

  return (
    <div className={styles.column}>
      <div className={styles.fileRecap}>
        <PlayButton
          sizePx={30}
          variant="outline"
          tone="accent"
          playing={playing}
          title={file.name}
          onClick={() => toggle({ id: "local-preview", title: file.name, url: previewUrl })}
        />
        <div>
          <div className={styles.fileRecapName}>{file.name}</div>
          <div className={styles.fileRecapMeta}>
            {durationSeconds ? formatDuration(durationSeconds) : "—"} — {formatFileSize(file.size)}
          </div>
        </div>
      </div>

      <div className={styles.fields}>
        <TextField
          id="title"
          label="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <div className={styles.locationField}>
          <TextField
            id="location"
            label="Location"
            placeholder="e.g. Sonian Forest, Belgium"
            value={form.locationLabel}
            onChange={(e) => {
              setForm((f) => ({ ...f, locationLabel: e.target.value }));
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            // Délai avant fermeture : laisse le `onClick` d'une suggestion se
            // déclencher avant que le blur ne démonte la liste (pattern
            // standard pour un combobox non natif sans librairie dédiée).
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSuggestionsOpen(false);
            }}
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestionsOpen && suggestions.length > 0}
            aria-controls="location-suggestions"
            required
          />
          {suggestionsOpen && suggestions.length > 0 && (
            <ul id="location-suggestions" role="listbox" className={styles.locationSuggestions}>
              {suggestions.map((suggestion) => (
                <li key={`${suggestion.label}-${suggestion.lat}-${suggestion.lng}`} role="option" aria-selected={false}>
                  <button type="button" className={styles.locationSuggestionButton} onClick={() => selectSuggestion(suggestion)}>
                    {suggestion.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.locationHelper}>
            {geoStatus !== "done" && (
              <button type="button" className={styles.locationHelperLink} onClick={requestLocation}>
                {geoStatus === "locating" ? "Locating…" : "Use my current location"}
              </button>
            )}
            {geoStatus === "done" && <span className={styles.locationHelperStatus}>Position captured.</span>}
            {geoStatus === "error" && (
              <span className={styles.locationHelperStatus}>Location unavailable — check permissions and retry.</span>
            )}
          </div>
        </div>
        <TextareaField
          id="description"
          label="Description"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <TextField
          id="tags"
          label="Tags — separated by commas"
          value={form.tagsInput}
          onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
        />
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.backLink} onClick={onBack}>
          ← Back
        </button>
        <Button variant="primary" disabled={!canContinue} onClick={() => onContinue(form)}>
          Continue
        </Button>
      </div>
    </div>
  );
}

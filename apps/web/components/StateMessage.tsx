import { Button } from "./Button";

/** États transverses — voir design/handoff/DEV-HANDOFF.md §5. Toujours du texte simple, jamais d'illustration/emoji. */
export function EmptyState({ message }: { message: string }) {
  return (
    <p style={{ fontSize: 13, color: "var(--color-stone)", textAlign: "center", padding: "48px 20px" }}>{message}</p>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <p style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}

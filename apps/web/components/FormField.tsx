import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import styles from "./FormField.module.css";

/**
 * Voir design/handoff/DEV-HANDOFF.md §2.10 : label toujours visible
 * au-dessus du champ (jamais placeholder-as-label), erreur portée par le
 * texte du message plutôt qu'une couleur de bordure dédiée (système
 * volontairement monochrome, voir la note sur la couleur d'erreur).
 */
interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, id, error, className, ...props }: TextFieldProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={`${styles.field} ${error ? styles.error : ""} ${className ?? ""}`} {...props} />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function TextareaField({ label, id, error, className, ...props }: TextareaFieldProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <textarea id={id} className={`${styles.field} ${error ? styles.error : ""} ${className ?? ""}`} {...props} />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}

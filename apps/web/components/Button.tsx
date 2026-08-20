import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

/** Voir design/handoff/DEV-HANDOFF.md §2.9. */
export function Button({ variant = "secondary", className, ...props }: ButtonProps) {
  const variantClass = variant === "primary" ? styles.primary : styles.secondary;
  return <button className={`${styles.button} ${variantClass} ${className ?? ""}`} {...props} />;
}

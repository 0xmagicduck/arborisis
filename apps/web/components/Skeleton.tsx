import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export function Skeleton({ width = "100%", height = 14, style }: { width?: string | number; height?: number; style?: CSSProperties }) {
  return <span aria-hidden="true" className={styles.skeleton} style={{ width, height, ...style }} />;
}

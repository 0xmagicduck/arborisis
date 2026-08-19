import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Arborisis",
  description: "Archive sonore naturaliste, géographique et communautaire.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

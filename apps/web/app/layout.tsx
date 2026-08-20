import type { ReactNode } from "react";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Auto-hébergées par Next (next/font) : pas de requête vers Google Fonts au
// runtime, `font-display: swap` géré automatiquement — voir
// design/handoff/DEV-HANDOFF.md §1.2 ("fallback obligatoire", "font-display: swap").
// Les variables générées sont branchées sur --font-sans/--font-serif dans
// globals.css, en tête de la pile de fallback déjà définie par
// @arborisis/design-tokens (system-ui / Georgia, serif).
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["400", "500"],
  variable: "--font-serif-loaded",
  display: "swap",
});

export const metadata = {
  title: "Arborisis",
  description: "Archive sonore naturaliste, géographique et communautaire.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${publicSans.variable} ${sourceSerif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

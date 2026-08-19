import { defineConfig } from "drizzle-kit";

// drizzle-kit charge ce fichier via require() sans réécrire les extensions
// ".js" (nécessaires en source pour la résolution NodeNext, voir tsconfig.json)
// vers ".ts" — on pointe donc vers le schéma déjà compilé (`pnpm build`
// d'abord) plutôt que vers src/schema.ts directement.
export default defineConfig({
  schema: "./dist/schema.js",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://arborisis:arborisis@localhost:5432/arborisis",
  },
});

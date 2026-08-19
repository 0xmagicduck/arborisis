import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL manquant — voir infra/docker-compose.yml / .env");
}

const db = createDb(connectionString);

// fileURLToPath (pas juste .pathname, qui laisse les espaces encodés en %20
// et casse la résolution du dossier sur un chemin contenant des espaces).
await migrate(db, {
  migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
});

console.log("Migrations appliquées.");
process.exit(0);

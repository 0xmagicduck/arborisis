import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { geographyPoint } from "./columns.js";

/**
 * Schéma PostgreSQL/PostGIS — voir plan/08-donnees-et-recherche.md §8.1 et
 * plan/06-authentification-sans-mot-de-passe.md §6.4.
 *
 * Aucune colonne email, aucune colonne mot de passe (voir 06.1) : l'identité
 * repose entièrement sur `handle` (pseudo public unique) + WebAuthn.
 */

// --- users -----------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  webauthnCredentials: many(webauthnCredentials),
  recoveryCodes: many(recoveryCodes),
  recordings: many(recordings),
}));

// --- webauthn_credentials ----------------------------------------------------

export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Identifiant du credential encodé en base64url (tel que retourné par
  // @simplewebauthn/server) — stocké en text plutôt que bytea pour rester
  // directement comparable/loggable sans conversion.
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(), // clé publique, encodée base64url
  signCount: integer("sign_count").notNull().default(0), // compteur anti-clonage, voir 06.3
  transports: text("transports").array().notNull().default(sql`'{}'::text[]`),
  deviceLabel: text("device_label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webauthnCredentialsRelations = relations(webauthnCredentials, ({ one }) => ({
  user: one(users, {
    fields: [webauthnCredentials.userId],
    references: [users.id],
  }),
}));

// --- recovery_codes ----------------------------------------------------------

export const recoveryCodes = pgTable("recovery_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(), // argon2, jamais en clair — voir 06.4
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recoveryCodesRelations = relations(recoveryCodes, ({ one }) => ({
  user: one(users, {
    fields: [recoveryCodes.userId],
    references: [users.id],
  }),
}));

// --- recordings ----------------------------------------------------------------

export const recordingLicenseEnum = pgEnum("recording_license", [
  "CC0",
  "CC-BY",
  "CC-BY-SA",
  "CC-BY-NC",
]);

export const recordingStatusEnum = pgEnum("recording_status", [
  "draft",
  "processing",
  "published",
  "failed",
]);

export const recordings = pgTable(
  "recordings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    locationLabel: text("location_label").notNull(),
    locationPoint: geographyPoint("location_point").notNull(),
    recordedAt: date("recorded_at", { mode: "date" }).notNull(),
    durationSeconds: integer("duration_seconds"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    license: recordingLicenseEnum("license").notNull(),
    status: recordingStatusEnum("status").notNull().default("draft"),
    // Clés Object Storage (pas des URLs) : le container est privé (Terraform,
    // `container_read = ""`), donc l'API recalcule une URL de lecture
    // pré-signée à chaque réponse plutôt que de stocker une URL stable — voir
    // @arborisis/storage `presignGetUrl` et apps/api/src/routes/recordings.ts.
    // originalKey, préfixe originals/ — copie pérenne en mode intérimaire tant
    // qu'Internet Archive n'est pas actif, voir plan/05 §5.10.
    originalKey: text("original_key"),
    // proxyKey, préfixe proxy/ — copie de lecture rapide transcodée (Opus).
    proxyKey: text("proxy_key"),
    // Restent `null` tant qu'ARCHIVE_TO_IA=false (mode intérimaire, plan/05 §5.10).
    iaIdentifier: text("ia_identifier"),
    iaItemUrl: text("ia_item_url"),
    waveformPeaks: jsonb("waveform_peaks").$type<number[]>(),
    equipment: text("equipment"),
    sampleRate: text("sample_rate"),
    format: text("format"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Requêtes viewport ("enregistrements dans cette bbox") et proximité —
    // voir plan/08-donnees-et-recherche.md §8.1-8.2.
    locationGix: index("recordings_location_gix").using("gist", table.locationPoint),
    authorIdx: index("recordings_author_idx").on(table.authorId),
    statusIdx: index("recordings_status_idx").on(table.status),
  })
);

export const recordingsRelations = relations(recordings, ({ one }) => ({
  author: one(users, {
    fields: [recordings.authorId],
    references: [users.id],
  }),
}));

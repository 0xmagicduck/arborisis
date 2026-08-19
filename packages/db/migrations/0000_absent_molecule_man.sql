-- Prérequis pour le type "geography(Point, 4326)" utilisé par recordings.location_point
-- (voir plan/08-donnees-et-recherche.md §8.1 et packages/db/src/columns.ts).
CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TYPE "public"."recording_license" AS ENUM('CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC');--> statement-breakpoint
CREATE TYPE "public"."recording_status" AS ENUM('draft', 'processing', 'published', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location_label" text NOT NULL,
	"location_point" geography(Point, 4326) NOT NULL,
	"recorded_at" date NOT NULL,
	"duration_seconds" integer,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"license" "recording_license" NOT NULL,
	"status" "recording_status" DEFAULT 'draft' NOT NULL,
	"original_url" text,
	"streaming_url" text,
	"ia_identifier" text,
	"ia_item_url" text,
	"waveform_peaks" jsonb,
	"equipment" text,
	"sample_rate" text,
	"format" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" text NOT NULL,
	"display_name" text,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webauthn_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"sign_count" integer DEFAULT 0 NOT NULL,
	"transports" text[] DEFAULT '{}'::text[] NOT NULL,
	"device_label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webauthn_credentials_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recordings" ADD CONSTRAINT "recordings_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recordings_location_gix" ON "recordings" USING gist ("location_point");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recordings_author_idx" ON "recordings" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recordings_status_idx" ON "recordings" USING btree ("status");
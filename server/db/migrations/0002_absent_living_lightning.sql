DROP TABLE "sections" CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "draft_document" jsonb DEFAULT '{"sections":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "published_document" jsonb;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "published_at" timestamp with time zone;
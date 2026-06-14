CREATE TABLE "music_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"r2_key" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "invitations" DROP COLUMN "music_media_id";
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "music_track_id" uuid;
--> statement-breakpoint
ALTER TABLE "music_tracks" ADD CONSTRAINT "music_tracks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_music_track_id_music_tracks_id_fk" FOREIGN KEY ("music_track_id") REFERENCES "public"."music_tracks"("id") ON DELETE no action ON UPDATE no action;

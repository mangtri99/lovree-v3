CREATE TABLE "invitation_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"opening_greeting" text DEFAULT '' NOT NULL,
	"opening_body" text DEFAULT '' NOT NULL,
	"closing_greeting" text DEFAULT '' NOT NULL,
	"closing_body" text DEFAULT '' NOT NULL,
	"quote" text DEFAULT '' NOT NULL,
	"quote_source" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

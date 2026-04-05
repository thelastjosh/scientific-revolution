CREATE TABLE "ui_experiments" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"variant" varchar(32) DEFAULT 'control' NOT NULL,
	"label" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

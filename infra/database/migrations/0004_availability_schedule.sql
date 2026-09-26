ALTER TABLE "app_rooms" ADD CONSTRAINT "uq_app_rooms_tenant_unit_id" UNIQUE("tenant_id","unit_id","id");
--> statement-breakpoint
CREATE TABLE "app_availabilities" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"unit_id" varchar(36) NOT NULL,
	"practitioner_id" varchar(36),
	"room_id" varchar(36),
	"series_id" varchar(36) NOT NULL,
	"replaces_id" varchar(36),
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"slot_duration_minutes" integer NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"valid_from" date NOT NULL,
	"valid_until" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_app_availabilities_tenant_id" UNIQUE("tenant_id","id"),
	CONSTRAINT "uq_app_availabilities_replaces" UNIQUE("tenant_id","replaces_id"),
	CONSTRAINT "app_availabilities_resource_check" CHECK (("app_availabilities"."practitioner_id" IS NULL) <> ("app_availabilities"."room_id" IS NULL)),
	CONSTRAINT "app_availabilities_day_check" CHECK ("app_availabilities"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "app_availabilities_time_check" CHECK ("app_availabilities"."start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "app_availabilities"."end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "app_availabilities"."start_time" < "app_availabilities"."end_time"),
	CONSTRAINT "app_availabilities_slot_check" CHECK ("app_availabilities"."slot_duration_minutes" BETWEEN 1 AND 1439),
	CONSTRAINT "app_availabilities_validity_check" CHECK ("app_availabilities"."valid_until" IS NULL OR "app_availabilities"."valid_until" > "app_availabilities"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "app_availabilities" ADD CONSTRAINT "fk_app_availabilities_replaces" FOREIGN KEY ("tenant_id","replaces_id") REFERENCES "public"."app_availabilities"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_availabilities" ADD CONSTRAINT "fk_app_availabilities_series" FOREIGN KEY ("tenant_id","series_id") REFERENCES "public"."app_availabilities"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_availabilities" ADD CONSTRAINT "fk_app_availabilities_unit" FOREIGN KEY ("tenant_id","unit_id") REFERENCES "public"."app_organization_units"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_availabilities" ADD CONSTRAINT "fk_app_availabilities_practitioner" FOREIGN KEY ("tenant_id","practitioner_id") REFERENCES "public"."app_practitioners"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_availabilities" ADD CONSTRAINT "fk_app_availabilities_room" FOREIGN KEY ("tenant_id","unit_id","room_id") REFERENCES "public"."app_rooms"("tenant_id","unit_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_availabilities_series" ON "app_availabilities" USING btree ("tenant_id","series_id");--> statement-breakpoint
CREATE INDEX "idx_app_availabilities_resource" ON "app_availabilities" USING btree ("tenant_id","unit_id","practitioner_id","room_id");

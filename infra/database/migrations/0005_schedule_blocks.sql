ALTER TABLE "app_rooms" ADD CONSTRAINT "uq_app_rooms_tenant_id" UNIQUE("tenant_id","id");
--> statement-breakpoint
CREATE TABLE "app_schedule_blocks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"unit_id" varchar(36),
	"practitioner_id" varchar(36),
	"room_id" varchar(36),
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"reason" text,
	"recurrence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "app_schedule_blocks_resource_check" CHECK (("app_schedule_blocks"."practitioner_id" IS NULL) <> ("app_schedule_blocks"."room_id" IS NULL)),
	CONSTRAINT "app_schedule_blocks_period_check" CHECK ("app_schedule_blocks"."ends_at" > "app_schedule_blocks"."starts_at"),
	CONSTRAINT "app_schedule_blocks_recurrence_check" CHECK ("app_schedule_blocks"."recurrence" IS NULL OR (jsonb_typeof("app_schedule_blocks"."recurrence") = 'object' AND "app_schedule_blocks"."recurrence" ? 'frequency' AND "app_schedule_blocks"."recurrence" ? 'interval' AND "app_schedule_blocks"."recurrence"->>'frequency' IN ('DAILY', 'WEEKLY') AND jsonb_typeof("app_schedule_blocks"."recurrence"->'interval') = 'number' AND ("app_schedule_blocks"."recurrence"->>'interval')::numeric BETWEEN 1 AND 52 AND trunc(("app_schedule_blocks"."recurrence"->>'interval')::numeric) = ("app_schedule_blocks"."recurrence"->>'interval')::numeric))
);
--> statement-breakpoint
ALTER TABLE "app_schedule_blocks" ADD CONSTRAINT "fk_app_schedule_blocks_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_schedule_blocks" ADD CONSTRAINT "fk_app_schedule_blocks_unit" FOREIGN KEY ("tenant_id","unit_id") REFERENCES "public"."app_organization_units"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_schedule_blocks" ADD CONSTRAINT "fk_app_schedule_blocks_practitioner" FOREIGN KEY ("tenant_id","practitioner_id") REFERENCES "public"."app_practitioners"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_schedule_blocks" ADD CONSTRAINT "fk_app_schedule_blocks_room" FOREIGN KEY ("tenant_id","room_id") REFERENCES "public"."app_rooms"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_schedule_blocks" ADD CONSTRAINT "fk_app_schedule_blocks_room_unit" FOREIGN KEY ("tenant_id","unit_id","room_id") REFERENCES "public"."app_rooms"("tenant_id","unit_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_schedule_blocks_tenant_start" ON "app_schedule_blocks" USING btree ("tenant_id","starts_at","id");--> statement-breakpoint
CREATE INDEX "idx_app_schedule_blocks_resource" ON "app_schedule_blocks" USING btree ("tenant_id","practitioner_id","room_id");

ALTER TABLE "app_practitioners" ADD CONSTRAINT "uq_app_practitioners_tenant_id_id" UNIQUE("tenant_id","id");
--> statement-breakpoint
CREATE TABLE "app_procedure_practitioners" (
	"tenant_id" varchar(36) NOT NULL,
	"procedure_id" varchar(36) NOT NULL,
	"practitioner_id" varchar(36) NOT NULL,
	CONSTRAINT "uq_app_procedure_practitioners" UNIQUE("tenant_id","procedure_id","practitioner_id")
);
--> statement-breakpoint
CREATE TABLE "app_procedures" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"tuss_code" varchar(8),
	"estimated_duration_minutes" integer NOT NULL,
	"requires_room" boolean DEFAULT false NOT NULL,
	"preparation_instructions" text,
	"return_after_days" integer,
	"minimum_interval_days" integer,
	"calendar_color" varchar(7),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_app_procedures_tenant_id_id" UNIQUE("tenant_id","id"),
	CONSTRAINT "app_procedures_name_check" CHECK (length(trim("app_procedures"."name")) > 0),
	CONSTRAINT "app_procedures_duration_check" CHECK ("app_procedures"."estimated_duration_minutes" > 0),
	CONSTRAINT "app_procedures_return_check" CHECK ("app_procedures"."return_after_days" >= 0),
	CONSTRAINT "app_procedures_interval_check" CHECK ("app_procedures"."minimum_interval_days" >= 0),
	CONSTRAINT "app_procedures_tuss_check" CHECK ("app_procedures"."tuss_code" ~ '^[0-9]{8}$'),
	CONSTRAINT "app_procedures_color_check" CHECK ("app_procedures"."calendar_color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
ALTER TABLE "app_procedure_practitioners" ADD CONSTRAINT "fk_app_procedure_practitioners_procedure" FOREIGN KEY ("tenant_id","procedure_id") REFERENCES "public"."app_procedures"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_procedure_practitioners" ADD CONSTRAINT "fk_app_procedure_practitioners_practitioner" FOREIGN KEY ("tenant_id","practitioner_id") REFERENCES "public"."app_practitioners"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_procedures" ADD CONSTRAINT "fk_app_procedures_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_procedure_practitioners_practitioner" ON "app_procedure_practitioners" USING btree ("tenant_id","practitioner_id");--> statement-breakpoint
CREATE INDEX "idx_app_procedures_tenant_name" ON "app_procedures" USING btree ("tenant_id","name","id");--> statement-breakpoint
CREATE INDEX "idx_app_procedures_tenant_tuss" ON "app_procedures" USING btree ("tenant_id","tuss_code");

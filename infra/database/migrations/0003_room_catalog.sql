ALTER TABLE "app_organization_units" ADD CONSTRAINT "uq_app_org_units_tenant_id_id" UNIQUE("tenant_id","id");
--> statement-breakpoint
CREATE TABLE "app_rooms" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(36) NOT NULL,
  "unit_id" varchar(36) NOT NULL,
  "name" varchar(255) NOT NULL,
  "room_type" varchar(100),
  "is_schedulable" boolean NOT NULL,
  "equipment" text[] DEFAULT '{}'::text[] NOT NULL,
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "app_rooms_name_check" CHECK (length(trim("app_rooms"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "app_rooms" ADD CONSTRAINT "fk_app_rooms_unit" FOREIGN KEY ("tenant_id","unit_id") REFERENCES "public"."app_organization_units"("tenant_id","id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_app_rooms_tenant_name" ON "app_rooms" USING btree ("tenant_id","name","id");
--> statement-breakpoint
CREATE INDEX "idx_app_rooms_tenant_unit" ON "app_rooms" USING btree ("tenant_id","unit_id");

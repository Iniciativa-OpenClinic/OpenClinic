ALTER TABLE "app_patients" ADD CONSTRAINT "uq_app_patients_tenant_id_id" UNIQUE("tenant_id","id");
--> statement-breakpoint
ALTER TABLE "app_appointments" DROP CONSTRAINT "fk_app_appointments_patient";
--> statement-breakpoint
ALTER TABLE "app_appointments" DROP CONSTRAINT "fk_app_appointments_practitioner";
--> statement-breakpoint
ALTER TABLE "app_appointments" ADD COLUMN "procedure_id" varchar(36);--> statement-breakpoint
ALTER TABLE "app_appointments" ADD COLUMN "unit_id" varchar(36);--> statement-breakpoint
ALTER TABLE "app_appointments" ADD COLUMN "room_id" varchar(36);--> statement-breakpoint
ALTER TABLE "app_appointments" ADD COLUMN "is_overbook" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_appointments" ADD COLUMN "payer_type" varchar(20) DEFAULT 'PARTICULAR' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_appointments" ADD COLUMN "source_channel" varchar(30) DEFAULT 'LEGACY' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_appointments" ADD CONSTRAINT "fk_app_appointments_procedure" FOREIGN KEY ("tenant_id","procedure_id") REFERENCES "public"."app_procedures"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_appointments" ADD CONSTRAINT "fk_app_appointments_unit" FOREIGN KEY ("tenant_id","unit_id") REFERENCES "public"."app_organization_units"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_appointments" ADD CONSTRAINT "fk_app_appointments_room_unit" FOREIGN KEY ("tenant_id","unit_id","room_id") REFERENCES "public"."app_rooms"("tenant_id","unit_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_appointments" ADD CONSTRAINT "fk_app_appointments_patient" FOREIGN KEY ("tenant_id","patient_id") REFERENCES "public"."app_patients"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_appointments" ADD CONSTRAINT "fk_app_appointments_practitioner" FOREIGN KEY ("tenant_id","practitioner_id") REFERENCES "public"."app_practitioners"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_appointments_room" ON "app_appointments" USING btree ("tenant_id","room_id","appointment_date");--> statement-breakpoint
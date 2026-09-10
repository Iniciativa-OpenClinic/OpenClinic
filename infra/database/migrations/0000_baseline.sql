CREATE TABLE "app_appointments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"patient_id" varchar(36) NOT NULL,
	"practitioner_id" varchar(36) NOT NULL,
	"appointment_date" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" varchar(20) DEFAULT 'SCHEDULED' NOT NULL,
	"type" varchar(30) NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_encounters" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"patient_id" varchar(36) NOT NULL,
	"practitioner_id" varchar(36) NOT NULL,
	"appointment_id" varchar(36),
	"start_time" timestamp with time zone DEFAULT now() NOT NULL,
	"end_time" timestamp with time zone,
	"status" varchar(20) NOT NULL,
	"chief_complaint" text,
	"diagnosis" text,
	"clinical_notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_medical_records" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"patient_id" varchar(36) NOT NULL,
	"encounter_id" varchar(36),
	"record_type" varchar(30) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"record_date" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_organization_units" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"trade_name" varchar(255),
	"cnes_code" varchar(15),
	"tax_id" varchar(50),
	"cnpj" varchar(14),
	"phone" varchar(20),
	"email" varchar(255),
	"postal_code" varchar(20),
	"street" varchar(255),
	"number" varchar(20),
	"complement" varchar(100),
	"neighborhood" varchar(100),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(50),
	"is_headquarters" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_organizations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"trade_name" varchar(255) NOT NULL,
	"tax_id" varchar(50),
	"cnpj" varchar(14),
	"state_registration" varchar(30),
	"municipal_registration" varchar(30),
	"email" varchar(255),
	"phone" varchar(20),
	"website" varchar(255),
	"postal_code" varchar(20),
	"street" varchar(255),
	"number" varchar(20),
	"complement" varchar(100),
	"neighborhood" varchar(100),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_patients" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"cpf" varchar(11),
	"cns" varchar(15),
	"birth_date" date,
	"gender" varchar(20),
	"email" varchar(255),
	"phone" varchar(20),
	"address" text,
	"emergency_contact" varchar(255),
	"insurance_name" varchar(100),
	"insurance_number" varchar(100),
	"allergies_notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_practitioners" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"user_id" varchar(36),
	"full_name" varchar(255) NOT NULL,
	"cpf" varchar(11),
	"practitioner_type" varchar(50) NOT NULL,
	"job_title" varchar(100),
	"council_type" varchar(20),
	"council_number" varchar(20),
	"council_uf" varchar(2),
	"primary_specialty" varchar(150),
	"phone" varchar(20),
	"email" varchar(255),
	"is_clinical_staff" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_prescriptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"encounter_id" varchar(36) NOT NULL,
	"patient_id" varchar(36) NOT NULL,
	"practitioner_id" varchar(36) NOT NULL,
	"medication_name" varchar(255) NOT NULL,
	"dosage" varchar(100) NOT NULL,
	"instructions" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "iam_groups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"tenant_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "iam_lockouts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"tenant_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam_permissions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"group_id" varchar(36),
	"resource_id" varchar(36) NOT NULL,
	"action" varchar(20) DEFAULT 'READ' NOT NULL,
	"effect" varchar(20) DEFAULT 'ALLOW' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "iam_permissions_check" CHECK ("iam_permissions"."user_id" IS NOT NULL OR "iam_permissions"."group_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "iam_sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"token_hash" varchar(500) NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam_user_groups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"group_id" varchar(36) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "iam_user_groups_user_id_group_id_key" UNIQUE("user_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "iam_users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"cpf" varchar(11),
	"hashed_password" varchar(500),
	"full_name" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"job_title" varchar(100),
	"role" varchar(20) DEFAULT 'USER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_access" timestamp with time zone,
	"require_password_change" boolean DEFAULT false NOT NULL,
	"password_reset_token" varchar(255),
	"password_reset_expires_at" timestamp with time zone,
	"tenant_id" varchar(36),
	"is_tenant_owner" boolean DEFAULT false NOT NULL,
	"timezone" varchar(50),
	"locale" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_application_configs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"application_id" varchar(36) NOT NULL,
	"tenant_id" varchar(36),
	"is_primary_for_tenant" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"enforce_document_acceptance_on_login" boolean DEFAULT false NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_application_resources" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"item_code" varchar(255) NOT NULL,
	"resource_type" varchar(20) DEFAULT 'API' NOT NULL,
	"context" varchar(20) DEFAULT 'BUSINESS' NOT NULL,
	"description" text,
	"parent_id" varchar(36),
	"path" varchar(500),
	"label_key" varchar(255),
	"icon" varchar(100),
	"route" varchar(500),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"min_role" varchar(20) DEFAULT 'USER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"application_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_sys_resources_item_code" UNIQUE("item_code")
);
--> statement-breakpoint
CREATE TABLE "sys_applications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"code" varchar(100) NOT NULL,
	"app_name" varchar(255) NOT NULL,
	"app_version" varchar(50) NOT NULL,
	"app_logo_url" varchar(500),
	"app_favicon_url" varchar(500),
	"app_subtitle" varchar(255),
	"app_description" text,
	"default_locale" varchar(10) NOT NULL,
	"default_supported_locales" jsonb NOT NULL,
	"default_timezone" varchar(50) NOT NULL,
	"default_dialing_code" varchar(5) NOT NULL,
	"default_max_login_attempts" integer NOT NULL,
	"default_lockout_duration_minutes" integer NOT NULL,
	"default_session_timeout_minutes" integer NOT NULL,
	"default_min_password_length" integer NOT NULL,
	"default_mfa_enabled" boolean DEFAULT false NOT NULL,
	"default_password_reset_token_ttl_hours" integer NOT NULL,
	"default_enable_audit_log" boolean DEFAULT true NOT NULL,
	"default_audit_retention_days" integer NOT NULL,
	"default_accepted_login_methods" jsonb NOT NULL,
	"default_extra_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"primary_login_identifier" varchar(20) NOT NULL,
	"is_multi_tenant" boolean DEFAULT false NOT NULL,
	"is_default_application" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sys_applications_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sys_audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"username" varchar(255),
	"action" varchar(100) NOT NULL,
	"resource" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'SUCCESS' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"details" jsonb,
	"tenant_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_tenants" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100),
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"tax_id" varchar(50),
	"cnpj" varchar(14),
	"contact_name" varchar(255),
	"contact_title" varchar(100),
	"contact_email" varchar(255),
	"contact_phone" varchar(20),
	"postal_code" varchar(20),
	"street" varchar(255),
	"number" varchar(20),
	"complement" varchar(100),
	"neighborhood" varchar(100),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(50),
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sys_tenants_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "app_appointments" ADD CONSTRAINT "fk_app_appointments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_appointments" ADD CONSTRAINT "fk_app_appointments_patient" FOREIGN KEY ("patient_id") REFERENCES "public"."app_patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_appointments" ADD CONSTRAINT "fk_app_appointments_practitioner" FOREIGN KEY ("practitioner_id") REFERENCES "public"."app_practitioners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_encounters" ADD CONSTRAINT "fk_app_encounters_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_encounters" ADD CONSTRAINT "fk_app_encounters_patient" FOREIGN KEY ("patient_id") REFERENCES "public"."app_patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_encounters" ADD CONSTRAINT "fk_app_encounters_practitioner" FOREIGN KEY ("practitioner_id") REFERENCES "public"."app_practitioners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_encounters" ADD CONSTRAINT "fk_app_encounters_appointment" FOREIGN KEY ("appointment_id") REFERENCES "public"."app_appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_medical_records" ADD CONSTRAINT "fk_app_medical_records_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_medical_records" ADD CONSTRAINT "fk_app_medical_records_patient" FOREIGN KEY ("patient_id") REFERENCES "public"."app_patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_medical_records" ADD CONSTRAINT "fk_app_medical_records_encounter" FOREIGN KEY ("encounter_id") REFERENCES "public"."app_encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_organization_units" ADD CONSTRAINT "fk_app_org_units_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_organization_units" ADD CONSTRAINT "fk_app_org_units_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."app_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_organizations" ADD CONSTRAINT "fk_app_organizations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_patients" ADD CONSTRAINT "fk_app_patients_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_practitioners" ADD CONSTRAINT "fk_app_practitioners_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_practitioners" ADD CONSTRAINT "fk_app_practitioners_user" FOREIGN KEY ("user_id") REFERENCES "public"."iam_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_prescriptions" ADD CONSTRAINT "fk_app_prescriptions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_prescriptions" ADD CONSTRAINT "fk_app_prescriptions_encounter" FOREIGN KEY ("encounter_id") REFERENCES "public"."app_encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_prescriptions" ADD CONSTRAINT "fk_app_prescriptions_patient" FOREIGN KEY ("patient_id") REFERENCES "public"."app_patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_prescriptions" ADD CONSTRAINT "fk_app_prescriptions_practitioner" FOREIGN KEY ("practitioner_id") REFERENCES "public"."app_practitioners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_groups" ADD CONSTRAINT "fk_iam_groups_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_lockouts" ADD CONSTRAINT "fk_iam_lockouts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_permissions" ADD CONSTRAINT "fk_iam_permissions_user" FOREIGN KEY ("user_id") REFERENCES "public"."iam_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_permissions" ADD CONSTRAINT "fk_iam_permissions_group" FOREIGN KEY ("group_id") REFERENCES "public"."iam_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_permissions" ADD CONSTRAINT "fk_iam_permissions_resource" FOREIGN KEY ("resource_id") REFERENCES "public"."sys_application_resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_permissions" ADD CONSTRAINT "fk_iam_permissions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_sessions" ADD CONSTRAINT "fk_iam_sessions_user" FOREIGN KEY ("user_id") REFERENCES "public"."iam_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_user_groups" ADD CONSTRAINT "fk_iam_user_groups_user" FOREIGN KEY ("user_id") REFERENCES "public"."iam_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_user_groups" ADD CONSTRAINT "fk_iam_user_groups_group" FOREIGN KEY ("group_id") REFERENCES "public"."iam_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_users" ADD CONSTRAINT "fk_iam_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_application_configs" ADD CONSTRAINT "fk_sys_app_configs_application" FOREIGN KEY ("application_id") REFERENCES "public"."sys_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_application_configs" ADD CONSTRAINT "fk_sys_app_configs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_application_resources" ADD CONSTRAINT "fk_sys_app_resources_parent" FOREIGN KEY ("parent_id") REFERENCES "public"."sys_application_resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_application_resources" ADD CONSTRAINT "fk_sys_app_resources_application" FOREIGN KEY ("application_id") REFERENCES "public"."sys_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_audit_logs" ADD CONSTRAINT "fk_sys_audit_logs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_appointments_tenant" ON "app_appointments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_app_appointments_patient" ON "app_appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_app_appointments_practitioner" ON "app_appointments" USING btree ("practitioner_id");--> statement-breakpoint
CREATE INDEX "idx_app_appointments_date" ON "app_appointments" USING btree ("appointment_date");--> statement-breakpoint
CREATE INDEX "idx_app_encounters_tenant" ON "app_encounters" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_app_encounters_patient" ON "app_encounters" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_app_encounters_practitioner" ON "app_encounters" USING btree ("practitioner_id");--> statement-breakpoint
CREATE INDEX "idx_app_encounters_start_time" ON "app_encounters" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_app_medical_records_tenant" ON "app_medical_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_app_medical_records_patient" ON "app_medical_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_app_org_units_tenant_id" ON "app_organization_units" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_app_org_units_organization_id" ON "app_organization_units" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_app_org_units_cnes" ON "app_organization_units" USING btree ("cnes_code");--> statement-breakpoint
CREATE INDEX "idx_app_org_units_tax_id" ON "app_organization_units" USING btree ("tax_id");--> statement-breakpoint
CREATE INDEX "idx_app_org_units_cnpj" ON "app_organization_units" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX "idx_app_org_units_name" ON "app_organization_units" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "idx_app_organizations_tenant_id" ON "app_organizations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_app_organizations_tax_id" ON "app_organizations" USING btree ("tax_id");--> statement-breakpoint
CREATE INDEX "idx_app_organizations_cnpj" ON "app_organizations" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX "idx_app_organizations_trade_name" ON "app_organizations" USING btree ("tenant_id","trade_name");--> statement-breakpoint
CREATE INDEX "idx_app_patients_tenant_id" ON "app_patients" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_app_patients_cpf" ON "app_patients" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "idx_app_patients_name" ON "app_patients" USING btree ("tenant_id","full_name");--> statement-breakpoint
CREATE INDEX "idx_app_practitioners_tenant_id" ON "app_practitioners" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_app_practitioners_user_id" ON "app_practitioners" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_app_practitioners_cpf" ON "app_practitioners" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "idx_app_practitioners_type" ON "app_practitioners" USING btree ("practitioner_type");--> statement-breakpoint
CREATE INDEX "idx_app_prescriptions_tenant" ON "app_prescriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_app_prescriptions_encounter" ON "app_prescriptions" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "idx_app_prescriptions_patient" ON "app_prescriptions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_iam_lockouts_identifier" ON "iam_lockouts" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_iam_permissions_user_id" ON "iam_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_iam_permissions_group_id" ON "iam_permissions" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_iam_permissions_resource_id" ON "iam_permissions" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_iam_sessions_token_hash" ON "iam_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_iam_sessions_user_id" ON "iam_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_iam_sessions_expires_at" ON "iam_sessions" USING btree ("expires_at") WHERE "iam_sessions"."revoked_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_iam_users_email_tenant" ON "iam_users" USING btree ("email","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_iam_users_username_tenant" ON "iam_users" USING btree ("username","tenant_id");--> statement-breakpoint
CREATE INDEX "idx_iam_users_cpf" ON "iam_users" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "idx_iam_users_role" ON "iam_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_iam_users_tenant_id" ON "iam_users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_iam_users_deleted_at" ON "iam_users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_sys_resources_item_code" ON "sys_application_resources" USING btree ("item_code");--> statement-breakpoint
CREATE INDEX "idx_sys_resources_context" ON "sys_application_resources" USING btree ("context");--> statement-breakpoint
CREATE INDEX "idx_sys_applications_is_active" ON "sys_applications" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_sys_audit_logs_user_id" ON "sys_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sys_audit_logs_created_at" ON "sys_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_sys_tenants_cnpj" ON "sys_tenants" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX "idx_sys_tenants_status" ON "sys_tenants" USING btree ("status");
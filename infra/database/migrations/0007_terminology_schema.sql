CREATE SCHEMA "terminology";
--> statement-breakpoint
CREATE TABLE "terminology"."concepts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"source_code" varchar(64) NOT NULL,
	"code" varchar(64) NOT NULL,
	"version" varchar(64) NOT NULL,
	"language" varchar(10) DEFAULT 'pt-BR' NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"inicio_vigencia" timestamp with time zone DEFAULT now() NOT NULL,
	"fim_implantacao" timestamp with time zone,
	"fim_vigencia" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "terminology_concepts_code_check" CHECK (length(trim("terminology"."concepts"."code")) > 0),
	CONSTRAINT "terminology_concepts_display_check" CHECK (length(trim("terminology"."concepts"."display_name")) > 0),
	CONSTRAINT "terminology_concepts_version_check" CHECK (length(trim("terminology"."concepts"."version")) > 0),
	CONSTRAINT "terminology_concepts_vigencia_order_check" CHECK (("terminology"."concepts"."fim_implantacao" IS NULL OR "terminology"."concepts"."fim_implantacao" >= "terminology"."concepts"."inicio_vigencia") AND ("terminology"."concepts"."fim_vigencia" IS NULL OR "terminology"."concepts"."fim_vigencia" >= "terminology"."concepts"."inicio_vigencia"))
);
--> statement-breakpoint
CREATE TABLE "terminology"."sources" (
	"code" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"kind" varchar(32) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "terminology_sources_code_check" CHECK ("terminology"."sources"."code" ~ '^[a-z0-9][a-z0-9-]*$'),
	CONSTRAINT "terminology_sources_kind_check" CHECK ("terminology"."sources"."kind" IN ('TUSS_OCL','ANS_CSV','FHIR_CODESYSTEM','CBO_CSV'))
);
--> statement-breakpoint
CREATE TABLE "terminology"."sync_runs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"source_code" varchar(64) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'RUNNING' NOT NULL,
	"records_fetched" integer,
	"records_upserted" integer,
	"records_versioned" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "terminology_sync_runs_status_check" CHECK ("terminology"."sync_runs"."status" IN ('RUNNING','SUCCESS','FAILED'))
);
--> statement-breakpoint
ALTER TABLE "terminology"."concepts" ADD CONSTRAINT "fk_terminology_concepts_source" FOREIGN KEY ("source_code") REFERENCES "terminology"."sources"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminology"."sync_runs" ADD CONSTRAINT "fk_terminology_sync_runs_source" FOREIGN KEY ("source_code") REFERENCES "terminology"."sources"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_terminology_concepts_current" ON "terminology"."concepts" USING btree ("source_code","code","language") WHERE "terminology"."concepts"."fim_vigencia" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_terminology_concepts_source_code" ON "terminology"."concepts" USING btree ("source_code","code");--> statement-breakpoint
CREATE INDEX "idx_terminology_concepts_display" ON "terminology"."concepts" USING btree ("source_code","display_name");--> statement-breakpoint
CREATE INDEX "idx_terminology_sync_runs_source_started" ON "terminology"."sync_runs" USING btree ("source_code","started_at");
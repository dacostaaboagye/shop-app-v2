ALTER TABLE "deliveries" ADD COLUMN "reference" varchar(40);--> statement-breakpoint
WITH existing_max AS (
  SELECT COALESCE(MAX(substring("reference" from '^DLV-([0-9]+)$')::int), 0) AS value
  FROM "deliveries"
  WHERE "reference" IS NOT NULL
),
numbered AS (
  SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS rn
  FROM "deliveries"
  WHERE "reference" IS NULL
)
UPDATE "deliveries"
SET "reference" = 'DLV-' || lpad((numbered.rn + existing_max.value)::text, 5, '0')
FROM numbered, existing_max
WHERE "deliveries"."id" = numbered."id";--> statement-breakpoint
INSERT INTO "sequence_counters" ("sequence_key", "current_value", "description")
SELECT
  'delivery',
  COALESCE(MAX(substring("reference" from '^DLV-([0-9]+)$')::int), 0),
  'Delivery header counter - generates DLV-XXXXX references'
FROM "deliveries"
ON CONFLICT ("sequence_key") DO UPDATE
SET
  "current_value" = GREATEST("sequence_counters"."current_value", excluded."current_value"),
  "description" = excluded."description",
  "updated_at" = now();--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "reference" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_reference_unique" ON "deliveries" USING btree ("reference");

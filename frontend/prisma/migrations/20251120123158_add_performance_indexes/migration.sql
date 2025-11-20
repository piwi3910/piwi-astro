-- Performance Optimization Phase 1: Database Indexes

-- ============================================================================
-- 1. Search Field Indexes
-- ============================================================================

-- Catalog ID indexes for search
CREATE INDEX IF NOT EXISTS "idx_targets_catalog_id" ON "Target"("catalogId");
CREATE INDEX IF NOT EXISTS "idx_targets_messier_id" ON "Target"("messierId");
CREATE INDEX IF NOT EXISTS "idx_targets_ngc_id" ON "Target"("ngcId");
CREATE INDEX IF NOT EXISTS "idx_targets_ic_id" ON "Target"("icId");

-- Name and other names for text search
CREATE INDEX IF NOT EXISTS "idx_targets_name" ON "Target"("name");
CREATE INDEX IF NOT EXISTS "idx_targets_other_names" ON "Target"("otherNames");

-- ============================================================================
-- 2. Filter Field Indexes
-- ============================================================================

-- Type filtering (Galaxy, Nebula, etc.)
CREATE INDEX IF NOT EXISTS "idx_targets_type" ON "Target"("type");

-- Constellation filtering
CREATE INDEX IF NOT EXISTS "idx_targets_constellation" ON "Target"("constellation");

-- Magnitude filtering (brightness)
CREATE INDEX IF NOT EXISTS "idx_targets_magnitude" ON "Target"("magnitude");

-- Size filtering
CREATE INDEX IF NOT EXISTS "idx_targets_size_major" ON "Target"("sizeMajorArcmin");

-- Coordinates for declination filtering
CREATE INDEX IF NOT EXISTS "idx_targets_dec_deg" ON "Target"("decDeg");
CREATE INDEX IF NOT EXISTS "idx_targets_ra_deg" ON "Target"("raDeg");

-- ============================================================================
-- 3. Composite Indexes (for multi-column filtering)
-- ============================================================================

-- Type + Magnitude (common: "show me all galaxies brighter than X")
CREATE INDEX IF NOT EXISTS "idx_targets_type_magnitude" ON "Target"("type", "magnitude");

-- Constellation + Magnitude (common: "brightest objects in Orion")
CREATE INDEX IF NOT EXISTS "idx_targets_constellation_magnitude" ON "Target"("constellation", "magnitude");

-- Type + Constellation (common: "galaxies in Virgo")
CREATE INDEX IF NOT EXISTS "idx_targets_type_constellation" ON "Target"("type", "constellation");

-- Type + Size (common: "large nebulae")
CREATE INDEX IF NOT EXISTS "idx_targets_type_size" ON "Target"("type", "sizeMajorArcmin");

-- ============================================================================
-- 4. Partial Indexes (only index non-null values)
-- ============================================================================

-- Only index targets with known magnitude
CREATE INDEX IF NOT EXISTS "idx_targets_magnitude_not_null" ON "Target"("magnitude")
WHERE "magnitude" IS NOT NULL;

-- Only index targets with known size
CREATE INDEX IF NOT EXISTS "idx_targets_size_not_null" ON "Target"("sizeMajorArcmin")
WHERE "sizeMajorArcmin" IS NOT NULL;

-- Only index dynamic objects (planets, comets, moon)
CREATE INDEX IF NOT EXISTS "idx_targets_dynamic" ON "Target"("isDynamic", "solarSystemBody")
WHERE "isDynamic" = true;

-- ============================================================================
-- 5. Full-Text Search Index
-- ============================================================================

-- Enable pg_trgm extension for fuzzy search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tsvector column for full-text search
ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create GIN index on search vector (fast full-text search)
CREATE INDEX IF NOT EXISTS "idx_targets_search_vector" ON "Target" USING GIN("search_vector");

-- Populate search vector with existing data
UPDATE "Target" SET "search_vector" =
  to_tsvector('english',
    COALESCE("name", '') || ' ' ||
    COALESCE("catalogId", '') || ' ' ||
    COALESCE("messierId", '') || ' ' ||
    COALESCE("ngcId", '') || ' ' ||
    COALESCE("icId", '') || ' ' ||
    COALESCE("otherNames", '')
  );

-- Create trigger to automatically update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_target_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."search_vector" = to_tsvector('english',
    COALESCE(NEW."name", '') || ' ' ||
    COALESCE(NEW."catalogId", '') || ' ' ||
    COALESCE(NEW."messierId", '') || ' ' ||
    COALESCE(NEW."ngcId", '') || ' ' ||
    COALESCE(NEW."icId", '') || ' ' ||
    COALESCE(NEW."otherNames", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS "trigger_update_target_search_vector" ON "Target";
CREATE TRIGGER "trigger_update_target_search_vector"
  BEFORE INSERT OR UPDATE ON "Target"
  FOR EACH ROW
  EXECUTE FUNCTION update_target_search_vector();

-- ============================================================================
-- 6. Trigram Indexes (for fuzzy/typo-tolerant search)
-- ============================================================================

-- Trigram indexes for fuzzy matching on common search fields
CREATE INDEX IF NOT EXISTS "idx_targets_name_trgm" ON "Target" USING gin("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_targets_catalog_id_trgm" ON "Target" USING gin("catalogId" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_targets_messier_id_trgm" ON "Target" USING gin("messierId" gin_trgm_ops);

-- ============================================================================
-- 7. Sorting Optimization Indexes
-- ============================================================================

-- Magnitude sorting (most common: brightest first)
CREATE INDEX IF NOT EXISTS "idx_targets_magnitude_asc" ON "Target"("magnitude" ASC NULLS LAST);

-- Size sorting (largest first)
CREATE INDEX IF NOT EXISTS "idx_targets_size_desc" ON "Target"("sizeMajorArcmin" DESC NULLS LAST);

-- Name sorting (alphabetical)
CREATE INDEX IF NOT EXISTS "idx_targets_name_asc" ON "Target"("name" ASC);

-- ============================================================================
-- Performance Analysis
-- ============================================================================

-- After migration, analyze tables for query planner
ANALYZE "Target";

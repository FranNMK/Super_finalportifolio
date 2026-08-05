-- ============================================================
-- Migration 002: Ensure projects table supports image upload
-- The image_path column already exists per the schema, so
-- this migration only adds helpful comments / confirms nullability.
-- Safe to re-run (uses IF NOT EXISTS guard where possible).
-- ============================================================

-- Confirm image_path is nullable (it already is, this is a no-op on TiDB)
ALTER TABLE `projects`
  MODIFY COLUMN `image_path` VARCHAR(500) DEFAULT NULL
    COMMENT 'Cloudinary URL or local path set by manual upload';

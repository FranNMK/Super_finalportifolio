-- ============================================================
-- Migration 004: Add demo_video_url column to projects table
-- Safe to re-run (IF NOT EXISTS guard).
-- ============================================================

ALTER TABLE `projects`
  ADD COLUMN IF NOT EXISTS `demo_video_url` VARCHAR(500) DEFAULT NULL
    COMMENT 'Optional YouTube / Vimeo embed URL shown on the portfolio';

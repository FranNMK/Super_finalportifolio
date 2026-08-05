-- ============================================================
-- Migration 001: Add password reset token fields to users
-- Run this once on your TiDB Cloud database.
-- ============================================================

ALTER TABLE `users`
  ADD COLUMN `reset_token`         VARCHAR(255) DEFAULT NULL,
  ADD COLUMN `reset_token_expires`  DATETIME     DEFAULT NULL;

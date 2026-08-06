-- ============================================================
-- Migration 005 — Contact messages table
-- Run this once in your TiDB Cloud SQL editor.
--
-- Every submission from client/contact.html is stored here and read
-- from the Messages tab of the admin panel. No email is sent.
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120)  NOT NULL,
  email       VARCHAR(255)  NOT NULL,
  subject     VARCHAR(200)  DEFAULT NULL,
  message     TEXT          NOT NULL,
  ip_address  VARCHAR(64)   DEFAULT NULL,
  user_agent  VARCHAR(255)  DEFAULT NULL,
  is_read     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contact_messages_created_at (created_at),
  INDEX idx_contact_messages_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ============================================================
-- Migration 005 — Contact messages table
-- Run this once in your TiDB Cloud SQL editor.
--
-- Every submission from client/contact.html is stored here BEFORE
-- the notification email is attempted, so a Gmail/SMTP failure can
-- never lose a lead. `email_sent` records whether the notification
-- went out, and `email_error` keeps the SMTP failure reason.
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120)  NOT NULL,
  email       VARCHAR(255)  NOT NULL,
  subject     VARCHAR(200)  DEFAULT NULL,
  message     TEXT          NOT NULL,
  ip_address  VARCHAR(64)   DEFAULT NULL,
  user_agent  VARCHAR(255)  DEFAULT NULL,
  email_sent  TINYINT(1)    NOT NULL DEFAULT 0,
  email_error VARCHAR(255)  DEFAULT NULL,
  is_read     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contact_messages_created_at (created_at),
  INDEX idx_contact_messages_email_sent (email_sent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

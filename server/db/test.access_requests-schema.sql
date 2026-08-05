/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `access_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','denied') DEFAULT 'pending',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

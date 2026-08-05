/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `live_url` varchar(255) DEFAULT NULL,
  `github_url` varchar(255) DEFAULT NULL,
  `year` int DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `load_time_seconds` int DEFAULT '0',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=330001;

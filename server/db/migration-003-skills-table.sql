-- ============================================================
-- Migration 003 — Skills table
-- Run this in your TiDB Cloud SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS skills (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(150)  NOT NULL,
  description TEXT,
  icon        VARCHAR(80)   NOT NULL DEFAULT 'fa-solid fa-star',
  sort_order  INT           NOT NULL DEFAULT 0,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed with the 10 default skills so the portfolio looks great straight away
INSERT INTO skills (title, description, icon, sort_order) VALUES
  ('Programming & Software Development',
   'I develop software using modern programming practices, with experience in writing clean, maintainable code and building complete applications. I can work across frontend and backend tasks, apply debugging methods, and deliver solutions that are scalable and user-focused.',
   'fa-solid fa-code', 1),

  ('Web Development',
   'I design and build responsive websites using HTML, CSS, and JavaScript, ensuring strong usability on desktop and mobile devices. I also handle client-side interactions, navigation flows, and performance improvements for smooth user experiences.',
   'fa-solid fa-globe', 2),

  ('Database Management',
   'I understand database design, data modeling, and basic query optimization. I can work with relational databases to store, retrieve, and manage application data efficiently while keeping data integrity and structure as a priority.',
   'fa-solid fa-database', 3),

  ('Computer Networking',
   'I have practical skills in network setup, IP addressing, router and switch configuration fundamentals, and troubleshooting connectivity issues. I can support small to medium network environments with a focus on stability and performance.',
   'fa-solid fa-network-wired', 4),

  ('Cybersecurity Fundamentals',
   'I apply essential security practices such as secure password policies, safe system configuration, access control awareness, and basic threat prevention. I am committed to protecting systems and user data through consistent security-minded workflows.',
   'fa-solid fa-shield-halved', 5),

  ('IT Support & Troubleshooting',
   'I provide technical support for software, hardware, and system-related issues, including diagnostics and step-by-step resolution. I can troubleshoot efficiently, document fixes, and communicate clearly with users during support processes.',
   'fa-solid fa-lightbulb', 6),

  ('Cloud & DevOps Basics',
   'I am familiar with core cloud concepts, deployment workflows, and version-controlled development practices. I can use Git and GitHub for collaboration, track changes effectively, and support reliable release processes.',
   'fa-solid fa-cloud', 7),

  ('Professional ICT Skills',
   'Beyond technical work, I bring communication, teamwork, and project organization skills that help in delivering technology projects on time. I adapt quickly to new tools, learn continuously, and contribute in both independent and collaborative environments.',
   'fa-solid fa-people-group', 8),

  ('Microsoft Office Applications',
   'I am proficient in Microsoft Word, Excel, and PowerPoint for preparing reports, analyzing data, and creating professional presentations. I use these tools to support documentation, communication, and day-to-day ICT and office operations.',
   'fa-solid fa-file-word', 9),

  ('Graphics Design',
   'I create clean visual designs for posters, social media content, and digital branding materials. I apply design principles such as layout, typography, and color balance to produce clear and engaging visuals.',
   'fa-solid fa-pen-ruler', 10);

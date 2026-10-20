-- Smart Condo & Apartment Portal — schema + seed only.
-- Students create least-privilege DB user themselves (SELECT/INSERT/UPDATE/DELETE).

CREATE DATABASE IF NOT EXISTS db_labexam
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_labexam;

CREATE TABLE IF NOT EXISTS residents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  room_code VARCHAR(20) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'resident',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_residents_room (room_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_login_attempts_username_time (username, attempted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS repair_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resident_id INT NOT NULL,
  room_code VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  CONSTRAINT fk_repair_resident
    FOREIGN KEY (resident_id) REFERENCES residents(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  posted_by VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS announcement_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT NOT NULL,
  resident_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ac_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ac_resident
    FOREIGN KEY (resident_id) REFERENCES residents(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(100) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  uploaded_by INT NOT NULL,
  storage_type VARCHAR(20) NOT NULL DEFAULT 'insecure',
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tf_ticket
    FOREIGN KEY (ticket_id) REFERENCES repair_tickets(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_tf_uploader
    FOREIGN KEY (uploaded_by) REFERENCES residents(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS security_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NULL,
  event_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  details VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed demo accounts: resident* / Resident1234 · admin01 / Admin1234
INSERT INTO residents (username, password_hash, full_name, room_code, phone, role) VALUES
  ('resident01', '$2y$12$LhsmUlkFyEohd8YVX1VLpeovWC.cjFeSyNso0A470fg8w7S7vh2Fi', 'Somchai Resident', 'A-101', '0812345678', 'resident'),
  ('resident02', '$2y$12$LhsmUlkFyEohd8YVX1VLpeovWC.cjFeSyNso0A470fg8w7S7vh2Fi', 'Suda Neighbor', 'B-202', '0898765432', 'resident'),
  ('admin01', '$2y$12$FhH9NYIAqACSlE5ol49Ur.sPeZjqtIXuzNuT2VFeDGT8183owtKwq', 'Condo Committee', 'OFFICE', '021112233', 'admin')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role);

INSERT INTO announcements (title, body, posted_by) VALUES
  ('ปิดน้ำชั่วคราว ชั้น 2', 'วันเสาร์ 09:00-12:00 ปิดน้ำเพื่อซ่อมท่อหลัก กรุณาสำรองน้ำ', 'admin01'),
  ('เก็บขยะใหญ่', 'วันที่ 1 ของทุกเดือน วางขยะใหญ่ที่จุดรวมชั้น G', 'admin01');

INSERT INTO repair_tickets (resident_id, room_code, category, title, description, status) VALUES
  (1, 'A-101', 'Plumbing', 'น้ำหยดใต้ซิงค์', 'มีน้ำหยดตลอดเวลาบริเวณท่อน้ำทิ้ง', 'open'),
  (2, 'B-202', 'Electrical', 'ไฟห้องน้ำดับ', 'สวิตช์ไฟห้องน้ำไม่ติดตั้งแต่เมื่อวาน', 'open');

INSERT INTO announcement_comments (announcement_id, resident_id, comment) VALUES
  (1, 1, 'ขอทราบว่าลิฟต์จะปิดด้วยหรือไม่ครับ'),
  (1, 2, 'ขอบคุณสำหรับแจ้งเตือนค่ะ');

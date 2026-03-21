-- Create Database
CREATE DATABASE IF NOT EXISTS doc_key;
USE doc_key;

-- Create Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  file_name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  upload_date DATETIME NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  created_at DATETIME NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_upload_date (upload_date),
  INDEX idx_file_name (file_name),
  INDEX idx_customer_name (customer_name)
);

-- Insert sample data (optional)
INSERT INTO documents (file_name, customer_name, upload_date, status, created_at)
VALUES
  ('Invoice #001.pdf', 'Acme Corporation', NOW(), 'Completed', NOW()),
  ('Contract Agreement.docx', 'TechStart LLC', NOW(), 'Draft', NOW()),
  ('Receipt #305.pdf', 'Global Trading Co', NOW(), 'Completed', NOW()),
  ('Quote Request.xlsx', 'Customer Services Inc', NOW(), 'Draft', NOW()),
  ('Annual Report 2024.pdf', 'Financial Solutions Ltd', NOW(), 'Completed', NOW());

-- =====================================================================
-- SQL Script: Erase Transaction Data & Reset System to Initial State
-- Database Dialect: MySQL
-- =====================================================================
-- WARNING: This script deletes transactional data. Do NOT run on production 
-- without taking a full database backup first!
-- =====================================================================

-- Step 1: Temporarily disable foreign key constraints to allow truncating parent/child tables
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. Sales With Orders
-- ---------------------------------------------------------------------
-- Order details must be cleared before or along with headers
TRUNCATE TABLE tbl_OrderDetails;
TRUNCATE TABLE tbl_OrderHeaders;

-- ---------------------------------------------------------------------
-- 2. Invoice Generation & Despatch entries
-- ---------------------------------------------------------------------
TRUNCATE TABLE tbl_InvoiceDetails;
TRUNCATE TABLE tbl_InvoiceHeaders;
TRUNCATE TABLE tbl_DespatchEntries;

-- ---------------------------------------------------------------------
-- 3. Sales Without Orders (Direct Sales / Direct Invoice)
-- ---------------------------------------------------------------------
TRUNCATE TABLE tbl_DirectInvoiceDetails;
TRUNCATE TABLE tbl_DirectInvoiceHeaders;

-- ---------------------------------------------------------------------
-- 4. Depot Sales
-- ---------------------------------------------------------------------
TRUNCATE TABLE tbl_DepotSalesDetails;
TRUNCATE TABLE tbl_DepotSalesHeaders;

-- ---------------------------------------------------------------------
-- 5. Depot Transfer & Depot Stock Received
-- ---------------------------------------------------------------------
TRUNCATE TABLE tbl_DepotReceived;

-- ---------------------------------------------------------------------
-- 6. RG1 Production Log
-- ---------------------------------------------------------------------
TRUNCATE TABLE tbl_RG1Productions;

-- ---------------------------------------------------------------------
-- 7. System Logs, Audits, and Backup History (Related tables)
-- ---------------------------------------------------------------------
-- If you want to keep the historical audit logs and backup run records,
-- you can comment out the two lines below:
TRUNCATE TABLE tbl_AuditLogs;
TRUNCATE TABLE tbl_BackupRuns;

-- ---------------------------------------------------------------------
-- 8. Reset dynamic stocks in Master Tables to initial values
-- ---------------------------------------------------------------------
-- Set product warehouse stocks (mill_stock) back to 0. 
-- This ensures the dynamic stock displays are reset to initial empty state.
UPDATE tbl_Products SET mill_stock = 0.000;

-- Step 2: Re-enable foreign key constraints
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- NOTE ON MANUAL ALTERNATIVE:
-- If your DB provider/UI does not support TRUNCATE on foreign-key targets,
-- you can run the following alternative DELETE queries:
--
-- SET FOREIGN_KEY_CHECKS = 0;
-- DELETE FROM tbl_OrderDetails;
-- DELETE FROM tbl_OrderHeaders;
-- DELETE FROM tbl_InvoiceDetails;
-- DELETE FROM tbl_InvoiceHeaders;
-- DELETE FROM tbl_DespatchEntries;
-- DELETE FROM tbl_DirectInvoiceDetails;
-- DELETE FROM tbl_DirectInvoiceHeaders;
-- DELETE FROM tbl_DepotSalesDetails;
-- DELETE FROM tbl_DepotSalesHeaders;
-- DELETE FROM tbl_DepotReceived;
-- DELETE FROM tbl_RG1Productions;
-- DELETE FROM tbl_AuditLogs;
-- DELETE FROM tbl_BackupRuns;
-- UPDATE tbl_Products SET mill_stock = 0.000;
--
-- -- To reset auto-increment counters back to 1:
-- ALTER TABLE tbl_OrderDetails AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_OrderHeaders AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_InvoiceDetails AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_InvoiceHeaders AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_DespatchEntries AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_DirectInvoiceDetails AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_DirectInvoiceHeaders AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_DepotSalesDetails AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_DepotSalesHeaders AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_DepotReceived AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_RG1Productions AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_AuditLogs AUTO_INCREMENT = 1;
-- ALTER TABLE tbl_BackupRuns AUTO_INCREMENT = 1;
--
-- SET FOREIGN_KEY_CHECKS = 1;
-- =====================================================================

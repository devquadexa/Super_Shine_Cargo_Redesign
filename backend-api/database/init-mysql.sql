-- =============================================================================
-- Super Shine Cargo - MySQL Database Initialization Script
-- Generated for MySQL 8.0+ / MariaDB 10.3+
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `super_shine_cargo`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `super_shine_cargo`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
DROP TABLE IF EXISTS `Users`;
CREATE TABLE `Users` (
  `userId` VARCHAR(50) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `fullName` VARCHAR(200) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `email` VARCHAR(200) NOT NULL,
  `createdDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `isActive` TINYINT(1) DEFAULT 1,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Districts Table
DROP TABLE IF EXISTS `Districts`;
CREATE TABLE `Districts` (
  `districtId` INT AUTO_INCREMENT NOT NULL,
  `districtName` VARCHAR(100) NOT NULL,
  `province` VARCHAR(50) NOT NULL,
  `isActive` TINYINT(1) DEFAULT 1,
  `createdDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`districtId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Cities Table
DROP TABLE IF EXISTS `Cities`;
CREATE TABLE `Cities` (
  `cityId` INT AUTO_INCREMENT NOT NULL,
  `cityName` VARCHAR(100) NOT NULL,
  `districtId` INT NOT NULL,
  `isActive` TINYINT(1) DEFAULT 1,
  `createdDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cityId`),
  KEY `idx_cities_district` (`districtId`),
  CONSTRAINT `fk_cities_districts` FOREIGN KEY (`districtId`) REFERENCES `Districts` (`districtId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Categories Table
DROP TABLE IF EXISTS `Categories`;
CREATE TABLE `Categories` (
  `categoryId` INT AUTO_INCREMENT NOT NULL,
  `categoryName` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`categoryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Customers Table
DROP TABLE IF EXISTS `Customers`;
CREATE TABLE `Customers` (
  `customerId` VARCHAR(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `mainPhone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NULL,
  `isSameLocation` TINYINT(1) DEFAULT 1,
  `website` VARCHAR(255) NULL,
  `registrationDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `isActive` TINYINT(1) DEFAULT 1,
  `creditPeriodDays` INT DEFAULT 30,
  `cityId` INT NULL,
  `districtId` INT NULL,
  `addressNumber` VARCHAR(20) NULL,
  `addressStreet1` VARCHAR(200) NULL,
  `addressStreet2` VARCHAR(200) NULL,
  `addressCity` VARCHAR(100) NULL,
  `addressDistrict` VARCHAR(100) NULL,
  `officeAddressNumber` VARCHAR(20) NULL,
  `officeAddressStreet1` VARCHAR(200) NULL,
  `officeAddressStreet2` VARCHAR(200) NULL,
  `officeAddressCity` VARCHAR(100) NULL,
  `officeAddressDistrict` VARCHAR(100) NULL,
  `isOfficeAddressSame` TINYINT(1) DEFAULT 1,
  `addressCountry` VARCHAR(100) DEFAULT 'Sri Lanka',
  `officeAddressCountry` VARCHAR(100) DEFAULT 'Sri Lanka',
  PRIMARY KEY (`customerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ContactPersons Table
DROP TABLE IF EXISTS `ContactPersons`;
CREATE TABLE `ContactPersons` (
  `contactPersonId` INT NOT NULL,
  `customerId` VARCHAR(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NULL,
  `designation` VARCHAR(100) NULL,
  PRIMARY KEY (`customerId`, `contactPersonId`),
  CONSTRAINT `fk_contactpersons_customers` FOREIGN KEY (`customerId`) REFERENCES `Customers` (`customerId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. CustomerCategories Table
DROP TABLE IF EXISTS `CustomerCategories`;
CREATE TABLE `CustomerCategories` (
  `customerId` VARCHAR(20) NOT NULL,
  `categoryId` INT NOT NULL,
  PRIMARY KEY (`customerId`, `categoryId`),
  CONSTRAINT `fk_customercats_customers` FOREIGN KEY (`customerId`) REFERENCES `Customers` (`customerId`) ON DELETE CASCADE,
  CONSTRAINT `fk_customercats_categories` FOREIGN KEY (`categoryId`) REFERENCES `Categories` (`categoryId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Transporters Table
DROP TABLE IF EXISTS `Transporters`;
CREATE TABLE `Transporters` (
  `transporterId` VARCHAR(50) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `contactPerson` VARCHAR(150) NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NULL,
  `address` VARCHAR(500) NULL,
  `vehicleNumber` VARCHAR(100) NULL,
  `notes` LONGTEXT NULL,
  `createdDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `isActive` TINYINT(1) DEFAULT 1,
  `registrationDate` DATETIME NULL,
  `addressNumber` VARCHAR(100) NULL,
  `addressStreet1` VARCHAR(200) NULL,
  `addressStreet2` VARCHAR(200) NULL,
  `addressDistrict` VARCHAR(100) NULL,
  `addressCity` VARCHAR(100) NULL,
  `addressCountry` VARCHAR(100) NULL,
  `contactPersonsJson` LONGTEXT NULL,
  PRIMARY KEY (`transporterId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Jobs Table
DROP TABLE IF EXISTS `Jobs`;
CREATE TABLE `Jobs` (
  `jobId` VARCHAR(50) NOT NULL,
  `customerId` VARCHAR(20) NOT NULL,
  `blNumber` VARCHAR(100) NULL,
  `cusdecNumber` VARCHAR(100) NULL,
  `openDate` DATE NULL,
  `shipmentCategory` VARCHAR(100) NULL,
  `status` VARCHAR(50) DEFAULT 'Pending',
  `createdDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `createdBy` VARCHAR(50) NULL,
  `completedDate` DATETIME NULL,
  `exporter` VARCHAR(500) NULL,
  `lcNumber` VARCHAR(100) NULL,
  `containerNumber` VARCHAR(100) NULL,
  `pettyCashStatus` VARCHAR(20) DEFAULT 'Pending',
  `transporter` VARCHAR(200) NULL,
  `assignedTo` VARCHAR(50) NULL,
  `advancePayment` DECIMAL(18, 2) DEFAULT 0.00,
  `advancePaymentDate` DATETIME NULL,
  `advancePaymentNotes` VARCHAR(500) NULL,
  `advancePaymentRecordedBy` VARCHAR(50) NULL,
  `payItems` LONGTEXT NULL,
  `assignedUsers` LONGTEXT NULL,
  `officePayItems` LONGTEXT NULL,
  `metadata` LONGTEXT NULL,
  `advancePaymentType` VARCHAR(50) NULL,
  `advancePaymentCheckNo` VARCHAR(100) NULL,
  PRIMARY KEY (`jobId`),
  KEY `idx_jobs_customer` (`customerId`),
  KEY `idx_jobs_status` (`status`),
  CONSTRAINT `fk_jobs_customers` FOREIGN KEY (`customerId`) REFERENCES `Customers` (`customerId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- JobAdvancePayments Table
DROP TABLE IF EXISTS `JobAdvancePayments`;
CREATE TABLE `JobAdvancePayments` (
  `advancePaymentId` INT AUTO_INCREMENT NOT NULL,
  `jobId` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `paymentMadeDate` DATETIME NOT NULL,
  `paymentType` VARCHAR(50) NULL,
  `checkNo` VARCHAR(100) NULL,
  `notes` LONGTEXT NULL,
  `recordedBy` VARCHAR(50) NULL,
  `recordedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`advancePaymentId`),
  KEY `idx_jap_job` (`jobId`),
  CONSTRAINT `fk_jap_jobs` FOREIGN KEY (`jobId`) REFERENCES `Jobs` (`jobId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. JobAssignments Table
DROP TABLE IF EXISTS `JobAssignments`;
CREATE TABLE `JobAssignments` (
  `assignmentId` INT AUTO_INCREMENT NOT NULL,
  `jobId` VARCHAR(50) NOT NULL,
  `userId` VARCHAR(50) NOT NULL,
  `assignedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `assignedBy` VARCHAR(50) NULL,
  `isActive` TINYINT(1) DEFAULT 1,
  `notes` VARCHAR(500) NULL,
  PRIMARY KEY (`assignmentId`),
  KEY `idx_jobassignments_job` (`jobId`),
  KEY `idx_jobassignments_user` (`userId`),
  CONSTRAINT `fk_jobassignments_jobs` FOREIGN KEY (`jobId`) REFERENCES `Jobs` (`jobId`) ON DELETE CASCADE,
  CONSTRAINT `fk_jobassignments_users` FOREIGN KEY (`userId`) REFERENCES `Users` (`userId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. PayItems Table
DROP TABLE IF EXISTS `PayItems`;
CREATE TABLE `PayItems` (
  `payItemId` VARCHAR(50) NOT NULL,
  `jobId` VARCHAR(50) NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `actualCost` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `addedBy` VARCHAR(50) NOT NULL,
  `addedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `billingAmount` DECIMAL(10, 2) NULL,
  `isCustomItem` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`payItemId`),
  KEY `idx_payitems_job` (`jobId`),
  CONSTRAINT `fk_payitems_jobs` FOREIGN KEY (`jobId`) REFERENCES `Jobs` (`jobId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Bills Table
DROP TABLE IF EXISTS `Bills`;
CREATE TABLE `Bills` (
  `billId` VARCHAR(50) NOT NULL,
  `jobId` VARCHAR(50) NOT NULL,
  `customerId` VARCHAR(20) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `paymentStatus` VARCHAR(50) DEFAULT 'Pending',
  `createdDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `actualCost` DECIMAL(10, 2) NULL,
  `billingAmount` DECIMAL(10, 2) NULL,
  `profit` DECIMAL(10, 2) NULL,
  `billDate` DATETIME NULL,
  `invoiceNumber` VARCHAR(50) NULL,
  `shipmentCategory` VARCHAR(50) NULL,
  `pettyCashSettled` TINYINT(1) NOT NULL DEFAULT 0,
  `invoiceDate` DATETIME NULL,
  `dueDate` DATETIME NULL,
  `isOverdue` TINYINT(1) DEFAULT 0,
  `advancePayment` DECIMAL(18, 2) DEFAULT 0.00,
  `grossTotal` DECIMAL(18, 2) NULL,
  `netTotal` DECIMAL(18, 2) NULL,
  `paidAmount` DECIMAL(18, 2) DEFAULT 0.00,
  `balanceAmount` DECIMAL(18, 2) DEFAULT 0.00,
  `chequeStatus` VARCHAR(50) NULL,
  `paymentDetails` LONGTEXT NULL,
  PRIMARY KEY (`billId`),
  KEY `idx_bills_job` (`jobId`),
  KEY `idx_bills_customer` (`customerId`),
  KEY `idx_bills_invoiceNumber` (`invoiceNumber`),
  CONSTRAINT `fk_bills_jobs` FOREIGN KEY (`jobId`) REFERENCES `Jobs` (`jobId`),
  CONSTRAINT `fk_bills_customers` FOREIGN KEY (`customerId`) REFERENCES `Customers` (`customerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Payments Table
DROP TABLE IF EXISTS `Payments`;
CREATE TABLE `Payments` (
  `paymentId` VARCHAR(50) NOT NULL,
  `jobId` VARCHAR(50) NOT NULL,
  `customerId` VARCHAR(20) NOT NULL,
  `customerName` VARCHAR(255) NULL,
  `invoiceNumber` VARCHAR(50) NULL,
  `billId` VARCHAR(50) NULL,
  `paymentMethod` VARCHAR(50) NOT NULL,
  `paymentDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `amount` DECIMAL(18, 2) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  `chequeNumber` VARCHAR(100) NULL,
  `chequeDate` DATE NULL,
  `bankName` VARCHAR(255) NULL,
  `referenceNumber` VARCHAR(100) NULL,
  `clearedDate` DATETIME NULL,
  `bouncedDate` DATETIME NULL,
  `notes` LONGTEXT NULL,
  `createdBy` VARCHAR(50) NULL,
  `createdDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedDate` DATETIME NULL,
  PRIMARY KEY (`paymentId`),
  KEY `idx_payments_job` (`jobId`),
  KEY `idx_payments_customer` (`customerId`),
  KEY `idx_payments_bill` (`billId`),
  CONSTRAINT `fk_payments_jobs` FOREIGN KEY (`jobId`) REFERENCES `Jobs` (`jobId`),
  CONSTRAINT `fk_payments_customers` FOREIGN KEY (`customerId`) REFERENCES `Customers` (`customerId`),
  CONSTRAINT `fk_payments_bills` FOREIGN KEY (`billId`) REFERENCES `Bills` (`billId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. PayItemTemplates Table
DROP TABLE IF EXISTS `PayItemTemplates`;
CREATE TABLE `PayItemTemplates` (
  `templateId` INT AUTO_INCREMENT NOT NULL,
  `shipmentCategory` VARCHAR(50) NOT NULL,
  `itemName` VARCHAR(200) NOT NULL,
  `itemOrder` INT NOT NULL DEFAULT 0,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`templateId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. OfficePayItems Table
DROP TABLE IF EXISTS `OfficePayItems`;
CREATE TABLE `OfficePayItems` (
  `officePayItemId` VARCHAR(50) NOT NULL,
  `jobId` VARCHAR(50) NOT NULL,
  `description` VARCHAR(200) NOT NULL,
  `actualCost` DECIMAL(18, 2) NOT NULL,
  `billingAmount` DECIMAL(18, 2) NULL,
  `paidBy` VARCHAR(50) NOT NULL,
  `paymentDate` DATETIME NULL,
  `notes` VARCHAR(500) NULL,
  `createdDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedDate` DATETIME NULL,
  PRIMARY KEY (`officePayItemId`),
  KEY `idx_officepayitems_job` (`jobId`),
  CONSTRAINT `fk_officepayitems_jobs` FOREIGN KEY (`jobId`) REFERENCES `Jobs` (`jobId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. PettyCash Table
DROP TABLE IF EXISTS `PettyCash`;
CREATE TABLE `PettyCash` (
  `entryId` VARCHAR(50) NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `entryType` VARCHAR(50) NOT NULL,
  `jobId` VARCHAR(50) NULL,
  `createdBy` VARCHAR(50) NOT NULL,
  `balanceAfter` DECIMAL(10, 2) NOT NULL,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`entryId`),
  KEY `idx_pettycash_job` (`jobId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. PettyCashBalance Table
DROP TABLE IF EXISTS `PettyCashBalance`;
CREATE TABLE `PettyCashBalance` (
  `id` INT NOT NULL,
  `balance` DECIMAL(10, 2) DEFAULT 0.00,
  `lastUpdated` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. PettyCashAssignments Table
DROP TABLE IF EXISTS `PettyCashAssignments`;
CREATE TABLE `PettyCashAssignments` (
  `assignmentId` INT AUTO_INCREMENT NOT NULL,
  `jobId` VARCHAR(50) NOT NULL,
  `assignedTo` VARCHAR(50) NOT NULL,
  `assignedBy` VARCHAR(50) NOT NULL,
  `assignedAmount` DECIMAL(18, 2) NOT NULL,
  `assignedDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(100) NOT NULL DEFAULT 'ASSIGNED',
  `settlementDate` DATETIME NULL,
  `actualSpent` DECIMAL(18, 2) DEFAULT 0.00,
  `balanceAmount` DECIMAL(18, 2) DEFAULT 0.00,
  `overAmount` DECIMAL(18, 2) DEFAULT 0.00,
  `notes` VARCHAR(500) NULL,
  `groupId` VARCHAR(100) NULL,
  `parentAssignmentId` INT NULL,
  `isMainAssignment` TINYINT(1) DEFAULT 1,
  PRIMARY KEY (`assignmentId`),
  KEY `idx_pca_job` (`jobId`),
  KEY `idx_pca_user` (`assignedTo`),
  KEY `idx_pca_group` (`groupId`),
  KEY `idx_pca_parent` (`parentAssignmentId`),
  CONSTRAINT `fk_pca_jobs` FOREIGN KEY (`jobId`) REFERENCES `Jobs` (`jobId`),
  CONSTRAINT `fk_pca_assigned_to` FOREIGN KEY (`assignedTo`) REFERENCES `Users` (`userId`),
  CONSTRAINT `fk_pca_assigned_by` FOREIGN KEY (`assignedBy`) REFERENCES `Users` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. PettyCashSettlementItems Table
DROP TABLE IF EXISTS `PettyCashSettlementItems`;
CREATE TABLE `PettyCashSettlementItems` (
  `settlementItemId` INT AUTO_INCREMENT NOT NULL,
  `assignmentId` INT NOT NULL,
  `itemName` VARCHAR(200) NOT NULL,
  `actualCost` DECIMAL(18, 2) NOT NULL,
  `isCustomItem` TINYINT(1) NOT NULL DEFAULT 0,
  `createdDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paidBy` VARCHAR(50) NULL,
  `hasBill` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`settlementItemId`),
  KEY `idx_pcsi_assignment` (`assignmentId`),
  CONSTRAINT `fk_pcsi_assignments` FOREIGN KEY (`assignmentId`) REFERENCES `PettyCashAssignments` (`assignmentId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. CashBalanceSettlements Table
DROP TABLE IF EXISTS `CashBalanceSettlements`;
CREATE TABLE `CashBalanceSettlements` (
  `settlementId` VARCHAR(50) NOT NULL,
  `userId` VARCHAR(50) NOT NULL,
  `userName` VARCHAR(200) NULL,
  `managerId` VARCHAR(50) NULL,
  `managerName` VARCHAR(200) NULL,
  `settlementType` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  `requestDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approvedDate` DATETIME NULL,
  `completedDate` DATETIME NULL,
  `notes` LONGTEXT NULL,
  `managerNotes` LONGTEXT NULL,
  `relatedAssignments` LONGTEXT NULL,
  `createdBy` VARCHAR(50) NULL,
  `createdDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` VARCHAR(50) NULL,
  `updatedDate` DATETIME NULL,
  PRIMARY KEY (`settlementId`),
  KEY `idx_cbs_user` (`userId`),
  CONSTRAINT `fk_cbs_users` FOREIGN KEY (`userId`) REFERENCES `Users` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. CashWithdrawals Table
DROP TABLE IF EXISTS `CashWithdrawals`;
CREATE TABLE `CashWithdrawals` (
  `withdrawalId` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `bankName` VARCHAR(200) NULL,
  `withdrawalDate` DATETIME NOT NULL,
  `notes` VARCHAR(500) NULL,
  `transactionType` VARCHAR(50) NULL,
  `createdBy` VARCHAR(50) NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`withdrawalId`),
  CONSTRAINT `fk_cashwithdrawals_users` FOREIGN KEY (`createdBy`) REFERENCES `Users` (`userId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. TransporterPayments Table
DROP TABLE IF EXISTS `TransporterPayments`;
CREATE TABLE `TransporterPayments` (
  `paymentId` VARCHAR(50) NOT NULL,
  `jobId` VARCHAR(50) NOT NULL,
  `transporterId` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `paymentMethod` VARCHAR(50) NOT NULL,
  `paymentDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  `chequeNumber` VARCHAR(100) NULL,
  `chequeDate` DATE NULL,
  `chequeAmount` DECIMAL(18, 2) NULL,
  `bankName` VARCHAR(255) NULL,
  `clearedDate` DATETIME NULL,
  `notes` LONGTEXT NULL,
  `paidBy` VARCHAR(50) NULL,
  `paidByName` VARCHAR(255) NULL,
  `createdDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedDate` DATETIME NULL,
  PRIMARY KEY (`paymentId`),
  KEY `idx_tp_job` (`jobId`),
  KEY `idx_tp_transporter` (`transporterId`),
  CONSTRAINT `fk_tp_jobs` FOREIGN KEY (`jobId`) REFERENCES `Jobs` (`jobId`),
  CONSTRAINT `fk_tp_transporters` FOREIGN KEY (`transporterId`) REFERENCES `Transporters` (`transporterId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. OldInvoices Table
DROP TABLE IF EXISTS `OldInvoices`;
CREATE TABLE `OldInvoices` (
  `oldInvoiceId` INT AUTO_INCREMENT NOT NULL,
  `customerId` VARCHAR(20) NOT NULL,
  `cusdecNumber` VARCHAR(100) NULL,
  `cusdecDate` DATE NULL,
  `invoiceDate` DATE NOT NULL,
  `invoiceNumber` VARCHAR(100) NOT NULL UNIQUE,
  `totalAmount` DECIMAL(18, 2) NOT NULL,
  `amountReceived` DECIMAL(18, 2) DEFAULT 0.00,
  `balance` DECIMAL(18, 2) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'Pending',
  `settleDate` DATE NULL,
  `daysAfterInvoice` INT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `createdBy` VARCHAR(50) NULL,
  `updatedAt` DATETIME NULL,
  PRIMARY KEY (`oldInvoiceId`),
  KEY `idx_oldinv_customer` (`customerId`),
  CONSTRAINT `fk_oldinv_customers` FOREIGN KEY (`customerId`) REFERENCES `Customers` (`customerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. OldInvoicePayments Table
DROP TABLE IF EXISTS `OldInvoicePayments`;
CREATE TABLE `OldInvoicePayments` (
  `paymentId` INT AUTO_INCREMENT NOT NULL,
  `oldInvoiceId` INT NOT NULL,
  `paymentAmount` DECIMAL(18, 2) NOT NULL,
  `paymentMethod` VARCHAR(50) NOT NULL,
  `receivedDate` DATE NOT NULL,
  `notes` VARCHAR(500) NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `createdBy` VARCHAR(50) NULL,
  PRIMARY KEY (`paymentId`),
  KEY `idx_oldinvp_invoice` (`oldInvoiceId`),
  CONSTRAINT `fk_oldinvp_invoices` FOREIGN KEY (`oldInvoiceId`) REFERENCES `OldInvoices` (`oldInvoiceId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. OtherExpenses Table
DROP TABLE IF EXISTS `OtherExpenses`;
CREATE TABLE `OtherExpenses` (
  `expenseId` VARCHAR(50) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `expenseDate` DATE NOT NULL,
  `paymentMethod` VARCHAR(50) NOT NULL,
  `referenceNumber` VARCHAR(100) NULL,
  `notes` LONGTEXT NULL,
  `recordedBy` VARCHAR(50) NULL,
  `createdDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `attachmentUrl` VARCHAR(500) NULL,
  PRIMARY KEY (`expenseId`),
  CONSTRAINT `fk_otherexp_users` FOREIGN KEY (`recordedBy`) REFERENCES `Users` (`userId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Notifications Table
DROP TABLE IF EXISTS `Notifications`;
CREATE TABLE `Notifications` (
  `notificationId` VARCHAR(50) NOT NULL,
  `userId` VARCHAR(50) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` LONGTEXT NOT NULL,
  `relatedId` VARCHAR(50) NULL,
  `relatedType` VARCHAR(50) NULL,
  `isRead` TINYINT(1) DEFAULT 0,
  `readDate` DATETIME NULL,
  `metadata` LONGTEXT NULL,
  `createdDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` VARCHAR(50) NULL,
  PRIMARY KEY (`notificationId`),
  KEY `idx_notifications_user` (`userId`),
  CONSTRAINT `fk_notifications_users` FOREIGN KEY (`userId`) REFERENCES `Users` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. PasswordResetRequests Table
DROP TABLE IF EXISTS `PasswordResetRequests`;
CREATE TABLE `PasswordResetRequests` (
  `requestId` VARCHAR(50) NOT NULL,
  `userId` VARCHAR(50) NOT NULL,
  `requestedBy` VARCHAR(50) NOT NULL,
  `requestDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
  `resolvedBy` VARCHAR(50) NULL,
  `resolvedDate` DATETIME NULL,
  `notes` VARCHAR(500) NULL,
  PRIMARY KEY (`requestId`),
  CONSTRAINT `fk_pwreset_user` FOREIGN KEY (`userId`) REFERENCES `Users` (`userId`),
  CONSTRAINT `fk_pwreset_requestedby` FOREIGN KEY (`requestedBy`) REFERENCES `Users` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. InvoiceReviews Table
DROP TABLE IF EXISTS `invoice_reviews`;
CREATE TABLE `invoice_reviews` (
  `reviewId` VARCHAR(50) NOT NULL,
  `jobId` VARCHAR(50) NOT NULL,
  `clerkId` VARCHAR(50) NOT NULL,
  `sentBy` VARCHAR(50) NOT NULL,
  `reviewNotes` LONGTEXT NOT NULL,
  `payItems` LONGTEXT NULL,
  `invoiceDetails` LONGTEXT NULL,
  `status` VARCHAR(20) DEFAULT 'Pending',
  `rejectionReason` LONGTEXT NULL,
  `createdDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reviewId`),
  CONSTRAINT `fk_invrev_jobs` FOREIGN KEY (`jobId`) REFERENCES `Jobs` (`jobId`),
  CONSTRAINT `fk_invrev_clerks` FOREIGN KEY (`clerkId`) REFERENCES `Users` (`userId`),
  CONSTRAINT `fk_invrev_sentby` FOREIGN KEY (`sentBy`) REFERENCES `Users` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DATA MIGRATION SEED
-- =============================================================================

INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000001', 'USER0003', 'Waff_Clerk_01', 'USER0006', 'Test Manager 01', 'BALANCE_RETURN', 1500.00, 'COMPLETED', '2026-03-16 16:58:13', '2026-03-16 16:58:25', '2026-03-16 16:58:42', 'Balance return for Assignment #51 (JOB0004)', '', '[51]', 'USER0003', '2026-03-16 16:58:13', 'USER0006', '2026-03-16 16:58:42');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000002', 'USER0003', 'Waff Clerk Number 01', 'USER0006', 'Test Manager 01', 'BALANCE_RETURN', 3000.00, 'COMPLETED', '2026-03-17 09:31:40', '2026-03-17 09:34:56', '2026-03-17 09:35:29', 'Balance return for Assignment #55 (JOB0001)', '', '[55]', 'USER0003', '2026-03-17 09:31:40', 'USER0006', '2026-03-17 09:35:29');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000003', 'USER0003', 'Waff Clerk Number 01', 'USER0006', 'Test Manager 01', 'BALANCE_RETURN', 3000.00, 'APPROVED', '2026-03-17 09:47:50', '2026-03-17 09:48:02', NULL, 'Balance return for Assignment #55 (JOB0001)', '', '[55]', 'USER0003', '2026-03-17 09:47:50', 'USER0006', '2026-03-17 09:48:02');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000004', 'USER0004', 'Waff Clerk Number 02', 'USER0006', 'Test Manager 01', 'OVERDUE_COLLECTION', 2000.00, 'APPROVED', '2026-03-17 09:49:39', '2026-03-17 09:49:55', NULL, 'Overdue collection for Assignment #56 (JOB0001)', '', '[56]', 'USER0004', '2026-03-17 09:49:39', 'USER0006', '2026-03-17 09:49:55');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000005', 'USER0003', 'Waff Clerk Number 01', 'USER0006', 'Test Manager 01', 'BALANCE_RETURN', 3000.00, 'APPROVED', '2026-03-17 09:54:45', '2026-03-17 09:58:20', NULL, 'Balance return for Assignment #55 (JOB0001)', '', '[55]', 'USER0003', '2026-03-17 09:54:45', 'USER0006', '2026-03-17 09:58:20');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000006', 'USER0003', 'Waff Clerk Number 01', 'USER0006', 'Test Manager 01', 'BALANCE_RETURN', 3000.00, 'APPROVED', '2026-03-17 09:58:05', '2026-03-17 09:58:22', NULL, 'Balance return for Assignment #57 (JOB0002)', '', '[57]', 'USER0003', '2026-03-17 09:58:05', 'USER0006', '2026-03-17 09:58:22');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000007', 'USER0003', 'Waff Clerk Number 01', 'USER0006', 'Test Manager 01', 'BALANCE_RETURN', 3000.00, 'APPROVED', '2026-03-17 10:07:59', '2026-03-17 10:08:10', NULL, 'Balance return for Assignment #57 (JOB0002)', '', '[57]', 'USER0003', '2026-03-17 10:07:59', 'USER0006', '2026-03-17 10:08:10');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000008', 'USER0003', 'Waff Clerk Number 01', 'USER0006', 'Test Manager 01', 'BALANCE_RETURN', 3000.00, 'APPROVED', '2026-03-17 16:36:55', '2026-03-17 16:37:06', NULL, 'Balance return for Assignment #58 (JOB0003)', '', '[58]', 'USER0003', '2026-03-17 16:36:55', 'USER0006', '2026-03-17 16:37:06');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000009', 'USER0005', 'Waff Clerk Number 03', 'USER0006', 'Test Manager 01', 'BALANCE_RETURN', 4000.00, 'APPROVED', '2026-03-17 16:50:29', '2026-03-17 16:51:19', NULL, 'Balance return for Assignment #59 (JOB0004)', '', '[59]', 'USER0005', '2026-03-17 16:50:29', 'USER0006', '2026-03-17 16:51:19');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000010', 'USER0004', 'Waff Clerk Number 02', 'USER0002', 'Sasmika Devmith', 'OVERDUE_COLLECTION', 2000.00, 'APPROVED', '2026-03-17 17:02:22', '2026-03-18 08:45:59', NULL, 'Overdue collection for Assignment #56 (JOB0001)', '', '[56]', 'USER0004', '2026-03-17 17:02:22', 'USER0002', '2026-03-18 08:45:59');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000011', 'USER0003', 'Waff Clerk Number 01', 'USER0006', 'Test Manager 01', 'BALANCE_RETURN', 3000.00, 'APPROVED', '2026-03-17 17:42:07', '2026-03-17 17:42:24', NULL, 'Balance return for Assignment #65 (JOB0010)', '', '[65]', 'USER0003', '2026-03-17 17:42:07', 'USER0006', '2026-03-17 17:42:24');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000012', 'USER0004', 'Waff Clerk Number 02', 'USER0002', 'Sasmika Devmith', 'OVERDUE_COLLECTION', 2000.00, 'APPROVED', '2026-03-17 17:44:40', '2026-03-18 08:46:00', NULL, 'Overdue collection for Assignment #66 (JOB0010)', '', '[66]', 'USER0004', '2026-03-17 17:44:40', 'USER0002', '2026-03-18 08:46:00');
INSERT INTO `CashBalanceSettlements` (`settlementId`, `userId`, `userName`, `managerId`, `managerName`, `settlementType`, `amount`, `status`, `requestDate`, `approvedDate`, `completedDate`, `notes`, `managerNotes`, `relatedAssignments`, `createdBy`, `createdDate`, `updatedBy`, `updatedDate`) VALUES ('CBS000013', 'USER0003', 'Waff Clerk Number 01', 'USER0006', 'Test Manager 01', 'BALANCE_RETURN', 3000.00, 'APPROVED', '2026-03-18 08:48:18', '2026-03-18 08:48:26', NULL, 'Balance return for Assignment #67 (JOB0011)', '', '[67]', 'USER0003', '2026-03-18 08:48:18', 'USER0006', '2026-03-18 08:48:26');
INSERT INTO `Categories` (`CategoryId`, `CategoryName`) VALUES (3, 'Animal Feed');
INSERT INTO `Categories` (`CategoryId`, `CategoryName`) VALUES (1, 'Chemical / Raw Materials');
INSERT INTO `Categories` (`CategoryId`, `CategoryName`) VALUES (4, 'Machinery');
INSERT INTO `Categories` (`CategoryId`, `CategoryName`) VALUES (2, 'Paper');
INSERT INTO `Categories` (`CategoryId`, `CategoryName`) VALUES (6, 'Raw Material');
INSERT INTO `Categories` (`CategoryId`, `CategoryName`) VALUES (5, 'Vehicle');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (1, 'Colombo', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (2, 'Dehiwala-Mount Lavinia', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (3, 'Moratuwa', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (4, 'Sri Jayawardenepura Kotte', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (5, 'Maharagama', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (6, 'Kesbewa', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (7, 'Kaduwela', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (8, 'Boralesgamuwa', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (9, 'Piliyandala', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (10, 'Nugegoda', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (11, 'Kotte', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (12, 'Rajagiriya', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (13, 'Wellawatte', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (14, 'Bambalapitiya', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (15, 'Pettah', 1, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (16, 'Gampaha', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (17, 'Negombo', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (18, 'Katunayake', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (19, 'Wattala', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (20, 'Kelaniya', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (21, 'Peliyagoda', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (22, 'Minuwangoda', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (23, 'Ja-Ela', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (24, 'Kandana', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (25, 'Kiribathgoda', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (26, 'Ragama', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (27, 'Divulapitiya', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (28, 'Nittambuwa', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (29, 'Veyangoda', 2, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (30, 'Kalutara', 3, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (31, 'Panadura', 3, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (32, 'Horana', 3, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (33, 'Beruwala', 3, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (34, 'Aluthgama', 3, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (35, 'Matugama', 3, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (36, 'Bandaragama', 3, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (37, 'Ingiriya', 3, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (38, 'Kandy', 4, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (39, 'Peradeniya', 4, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (40, 'Gampola', 4, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (41, 'Nawalapitiya', 4, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (42, 'Wattegama', 4, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (43, 'Hatton', 4, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (44, 'Kadugannawa', 4, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (45, 'Matale', 5, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (46, 'Dambulla', 5, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (47, 'Sigiriya', 5, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (48, 'Galewela', 5, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (49, 'Nuwara Eliya', 6, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (50, 'Hatton', 6, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (51, 'Talawakele', 6, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (52, 'Bandarawela', 6, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (53, 'Galle', 7, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (54, 'Hikkaduwa', 7, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (55, 'Ambalangoda', 7, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (56, 'Bentota', 7, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (57, 'Elpitiya', 7, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (58, 'Baddegama', 7, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (59, 'Matara', 8, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (60, 'Weligama', 8, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (61, 'Mirissa', 8, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (62, 'Akuressa', 8, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (63, 'Hakmana', 8, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (64, 'Hambantota', 9, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (65, 'Tangalle', 9, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (66, 'Tissamaharama', 9, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (67, 'Jaffna', 10, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (68, 'Chavakachcheri', 10, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (69, 'Point Pedro', 10, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (70, 'Kurunegala', 18, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (71, 'Kuliyapitiya', 18, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (72, 'Narammala', 18, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (73, 'Wariyapola', 18, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (74, 'Anuradhapura', 20, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (75, 'Kekirawa', 20, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (76, 'Thambuttegama', 20, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (77, 'Batticaloa', 15, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (78, 'Kalmunai', 15, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (79, 'Ratnapura', 24, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (80, 'Embilipitiya', 24, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (81, 'Balangoda', 24, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (82, 'Badulla', 22, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (83, 'Bandarawela', 22, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (84, 'Ella', 22, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (85, 'Haputale', 22, 1, '2026-03-10 15:28:40');
INSERT INTO `Cities` (`cityId`, `cityName`, `districtId`, `isActive`, `createdDate`) VALUES (86, 'Welimada', 22, 1, '2026-03-10 15:28:40');
INSERT INTO `ContactPersons` (`ContactPersonId`, `CustomerId`, `Name`, `Phone`, `Email`, `Designation`) VALUES (1, 'CUST0001', 'Sasmika Devmith', '0711843128', 'sasmikadevmith955@gmail.com', 'Manager');
INSERT INTO `ContactPersons` (`ContactPersonId`, `CustomerId`, `Name`, `Phone`, `Email`, `Designation`) VALUES (1, 'CUST0002', 'Fernando', '0787843128', 'fernando@gmail.com', 'Manager');
INSERT INTO `ContactPersons` (`ContactPersonId`, `CustomerId`, `Name`, `Phone`, `Email`, `Designation`) VALUES (2, 'CUST0002', 'Perera', '0718541254', 'perera@gmail.com', 'Director');
INSERT INTO `CustomerCategories` (`CustomerId`, `CategoryId`) VALUES ('CUST0001', 5);
INSERT INTO `CustomerCategories` (`CustomerId`, `CategoryId`) VALUES ('CUST0002', 1);
INSERT INTO `CustomerCategories` (`CustomerId`, `CategoryId`) VALUES ('CUST0002', 4);
INSERT INTO `Customers` (`CustomerId`, `Name`, `MainPhone`, `Email`, `IsSameLocation`, `Website`, `RegistrationDate`, `IsActive`, `creditPeriodDays`, `cityId`, `districtId`, `addressNumber`, `addressStreet1`, `addressStreet2`, `addressCity`, `addressDistrict`, `officeAddressNumber`, `officeAddressStreet1`, `officeAddressStreet2`, `officeAddressCity`, `officeAddressDistrict`, `isOfficeAddressSame`, `addressCountry`, `officeAddressCountry`) VALUES ('CUST0001', 'Quadexa', '0711843128', 'sasmikadevmith955@gmail.com', 0, 'https://quadexa.com/', '2026-03-10 00:00:00', 1, 30, NULL, NULL, '124/1 ', 'Campus Road', 'Raththanapitiya', 'Boralesgamuwa', 'Colombo', '', '', '', '', '', 1, 'Sri Lanka', 'Sri Lanka');
INSERT INTO `Customers` (`CustomerId`, `Name`, `MainPhone`, `Email`, `IsSameLocation`, `Website`, `RegistrationDate`, `IsActive`, `creditPeriodDays`, `cityId`, `districtId`, `addressNumber`, `addressStreet1`, `addressStreet2`, `addressCity`, `addressDistrict`, `officeAddressNumber`, `officeAddressStreet1`, `officeAddressStreet2`, `officeAddressCity`, `officeAddressDistrict`, `isOfficeAddressSame`, `addressCountry`, `officeAddressCountry`) VALUES ('CUST0002', 'TDP Thermoline', '0772222726', 'tdp@gmail.com', 0, NULL, '2026-03-13 00:00:00', 1, 30, NULL, NULL, '123', 'Galle Road', 'Kollupitiya', 'Colombo', 'Colombo', '', '', '', '', '', 1, 'Sri Lanka', 'Sri Lanka');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (1, 'Colombo', 'Western', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (2, 'Gampaha', 'Western', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (3, 'Kalutara', 'Western', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (4, 'Kandy', 'Central', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (5, 'Matale', 'Central', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (6, 'Nuwara Eliya', 'Central', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (7, 'Galle', 'Southern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (8, 'Matara', 'Southern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (9, 'Hambantota', 'Southern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (10, 'Jaffna', 'Northern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (11, 'Kilinochchi', 'Northern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (12, 'Mannar', 'Northern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (13, 'Mullaitivu', 'Northern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (14, 'Vavuniya', 'Northern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (15, 'Batticaloa', 'Eastern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (16, 'Ampara', 'Eastern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (17, 'Trincomalee', 'Eastern', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (18, 'Kurunegala', 'North Western', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (19, 'Puttalam', 'North Western', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (20, 'Anuradhapura', 'North Central', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (21, 'Polonnaruwa', 'North Central', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (22, 'Badulla', 'Uva', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (23, 'Monaragala', 'Uva', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (24, 'Ratnapura', 'Sabaragamuwa', 1, '2026-03-10 15:28:40');
INSERT INTO `Districts` (`districtId`, `districtName`, `province`, `isActive`, `createdDate`) VALUES (25, 'Kegalle', 'Sabaragamuwa', 1, '2026-03-10 15:28:40');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (56, 'JOB0001', 'USER0003', '2026-03-17 14:05:24', 'USER0006', 1, NULL);
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (57, 'JOB0001', 'USER0004', '2026-03-17 14:05:24', 'USER0006', 1, NULL);
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (58, 'JOB0002', 'USER0003', '2026-03-17 15:26:54', 'USER0006', 1, NULL);
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (59, 'JOB0003', 'USER0003', '2026-03-17 22:06:16', 'USER0006', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (60, 'JOB0004', 'USER0005', '2026-03-17 22:18:22', 'USER0006', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (61, 'JOB0005', 'USER0004', '2026-03-17 22:31:57', 'USER0006', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (62, 'JOB0006', 'USER0004', '2026-03-17 22:44:54', 'USER0006', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (63, 'JOB0007', 'USER0003', '2026-03-17 22:50:14', 'USER0006', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (64, 'JOB0008', 'USER0004', '2026-03-17 22:54:48', 'USER0006', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (65, 'JOB0008', 'USER0005', '2026-03-17 22:54:48', 'USER0006', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (66, 'JOB0009', 'USER0003', '2026-03-17 22:59:26', 'USER0006', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (67, 'JOB0009', 'USER0004', '2026-03-17 22:59:26', 'USER0006', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (68, 'JOB0010', 'USER0003', '2026-03-17 23:03:44', 'USER0002', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (69, 'JOB0010', 'USER0004', '2026-03-17 23:03:44', 'USER0002', 1, 'Initial assignment from job creation');
INSERT INTO `JobAssignments` (`assignmentId`, `jobId`, `userId`, `assignedDate`, `assignedBy`, `isActive`, `notes`) VALUES (70, 'JOB0011', 'USER0003', '2026-03-18 14:17:44', 'USER0006', 1, 'Initial assignment from job creation');
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0001', 'CUST0002', NULL, NULL, '2026-03-18', 'Air Freight', 'Open', '2026-03-17 08:35:24', NULL, NULL, NULL, NULL, NULL, 'Settled', NULL, NULL, 10000.00, '2026-03-17 08:35:39', '', 'USER0006', '[{"description":"DO Charges","amount":10000,"actualCost":10000,"billingAmount":10000,"paidBy":"Test Manager 01","source":"Office Payment","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Airport Handling","amount":5000,"actualCost":5000,"billingAmount":8000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Customs Clearance","amount":2000,"actualCost":2000,"billingAmount":8000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Storage Charges","amount":5000,"actualCost":5000,"billingAmount":8000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Air Freight Charges","amount":5000,"actualCost":5000,"billingAmount":8000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Documentation Fee","amount":1000,"actualCost":1000,"billingAmount":8000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Delivery Charges","amount":1000,"actualCost":1000,"billingAmount":1000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"SLPA","amount":0,"actualCost":0,"billingAmount":10000,"paidBy":"Office","source":"Custom","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Transport","amount":20000,"actualCost":20000,"billingAmount":25000,"paidBy":"Office","source":"Custom","addedDate":"2026-03-17T08:37:38.943Z"}]', NULL, NULL, NULL, NULL, NULL);
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0002', 'CUST0001', 'EGLV141501314428', 'I-19583 of  03/02/2026', '2026-03-17', 'LCL', 'Open', '2026-03-17 09:56:54', NULL, NULL, 'Test Exporter', '345345', '2321234324', 'Settled', 'Sasmika Devmith', NULL, 10000.00, '2026-03-17 09:57:28', '', 'USER0006', '[{"description":"DO Charges","amount":5000,"actualCost":5000,"billingAmount":5000,"paidBy":"Test Manager 01","source":"Office Payment","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Documentation Fee","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Handling Charges","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Customs Clearance","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Delivery Charges","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Storage Charges","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Fuel","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Agency Fee","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Transport","amount":20000,"actualCost":20000,"billingAmount":30000,"paidBy":"Office","source":"Custom","addedDate":"2026-03-17T09:59:29.119Z"}]', NULL, NULL, NULL, NULL, NULL);
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0003', 'CUST0001', NULL, NULL, '2026-03-17', 'LCL', 'Open', '2026-03-17 16:36:16', NULL, NULL, NULL, NULL, NULL, 'Settled', NULL, 'USER0003', 0.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0004', 'CUST0001', 'EGLV141501314428', 'I-19583 of  03/02/2026', '2026-03-18', 'Air Freight', 'Open', '2026-03-17 16:48:22', NULL, NULL, 'Test Exporter', '345345', '2321234324', 'Settled', 'Sasmika Devmith', 'USER0005', 5000.00, '2026-03-17 00:00:00', '', 'USER0006', '[{"description":"DO Charges","amount":5000,"actualCost":5000,"billingAmount":6000,"paidBy":"Test Manager 01","source":"Office Payment","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Air Freight Charges","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Airport Handling","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Documentation Fee","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Customs Clearance","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Delivery Charges","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Storage Charges","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"}]', NULL, NULL, NULL, 'check', '541214854');
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0005', 'CUST0001', 'EGLV141501314428', 'I-19583 of  03/02/2026', '2026-03-17', 'LCL', 'Open', '2026-03-17 17:01:57', NULL, NULL, 'Test Exporter', '345345', '2321234324', 'Settled', 'Sasmika Devmith', 'USER0004', 0.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0006', 'CUST0002', 'EGLV141501314428', 'I-19583 of  03/02/2026', '2026-03-17', 'FCL', 'Open', '2026-03-17 17:14:54', NULL, NULL, 'Test Exporter', '345345', '2321234324', 'Settled', 'Sasmika Devmith', 'USER0004', 0.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0007', 'CUST0002', 'EGLV141501314428', 'I-19583 of  03/02/2026', '2026-03-17', 'LCL', 'Open', '2026-03-17 17:20:14', NULL, NULL, 'Test Exporter', '345345', '2321234324', 'Settled', 'Sasmika Devmith', 'USER0003', 0.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0008', 'CUST0002', 'EGLV141501314428', 'I-19583 of  03/02/2026', '2026-03-17', 'Air Freight', 'Open', '2026-03-17 17:24:48', NULL, NULL, 'Test Exporter', '345345', '2321234324', 'Assigned', 'Sasmika Devmith', 'USER0004', 0.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0009', 'CUST0002', NULL, NULL, '2026-03-18', 'FCL', 'Open', '2026-03-17 17:29:26', NULL, NULL, NULL, NULL, NULL, 'Not Assigned', NULL, 'USER0003', 0.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0010', 'CUST0002', NULL, NULL, '2026-03-17', 'FCL', 'Open', '2026-03-17 17:33:44', NULL, NULL, NULL, NULL, NULL, 'Settled', NULL, 'USER0003', 10000.00, '2026-03-18 00:00:00', '', 'USER0002', '[{"description":"Refer Payment Module Code (6COSC023C)","amount":65000,"actualCost":65000,"billingAmount":65000,"paidBy":"Sasmika Devmith","source":"Office Payment","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"DO Charges","amount":5000,"actualCost":5000,"billingAmount":5000,"paidBy":"Sasmika Devmith","source":"Office Payment","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Documentation Fee","amount":2000,"actualCost":2000,"billingAmount":3000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Customs Clearance","amount":2000,"actualCost":2000,"billingAmount":6000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Demurrage Charges","amount":8000,"actualCost":8000,"billingAmount":13000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Port Charges","amount":1000,"actualCost":1000,"billingAmount":3000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Detention Charges","amount":5000,"actualCost":5000,"billingAmount":6000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Food","amount":1000,"actualCost":1000,"billingAmount":1000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"}]', NULL, NULL, NULL, 'check', '2547512');
INSERT INTO `Jobs` (`JobId`, `CustomerId`, `BLNumber`, `CUSDECNumber`, `OpenDate`, `ShipmentCategory`, `Status`, `CreatedDate`, `CreatedBy`, `CompletedDate`, `Exporter`, `LCNumber`, `ContainerNumber`, `pettyCashStatus`, `Transporter`, `AssignedTo`, `advancePayment`, `advancePaymentDate`, `advancePaymentNotes`, `advancePaymentRecordedBy`, `payItems`, `assignedUsers`, `officePayItems`, `metadata`, `advancePaymentType`, `advancePaymentCheckNo`) VALUES ('JOB0011', 'CUST0002', NULL, NULL, '2026-03-18', 'LCL', 'Open', '2026-03-18 08:47:44', NULL, NULL, NULL, NULL, NULL, 'Settled', NULL, 'USER0003', 0.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `OfficePayItems` (`officePayItemId`, `jobId`, `description`, `actualCost`, `billingAmount`, `paidBy`, `paymentDate`, `notes`, `createdDate`, `updatedDate`) VALUES ('OPI000001', 'JOB0001', 'DO Charges', 10000.00, NULL, 'USER0006', '2026-03-17 14:05:33', NULL, '2026-03-17 14:05:33', '2026-03-17 14:07:17');
INSERT INTO `OfficePayItems` (`officePayItemId`, `jobId`, `description`, `actualCost`, `billingAmount`, `paidBy`, `paymentDate`, `notes`, `createdDate`, `updatedDate`) VALUES ('OPI000002', 'JOB0002', 'DO Charges', 5000.00, NULL, 'USER0006', '2026-03-17 15:27:23', NULL, '2026-03-17 15:27:23', '2026-03-17 15:29:12');
INSERT INTO `OfficePayItems` (`officePayItemId`, `jobId`, `description`, `actualCost`, `billingAmount`, `paidBy`, `paymentDate`, `notes`, `createdDate`, `updatedDate`) VALUES ('OPI000003', 'JOB0004', 'DO Charges', 5000.00, NULL, 'USER0006', '2026-03-17 22:19:11', NULL, '2026-03-17 22:19:11', '2026-03-17 22:21:46');
INSERT INTO `OfficePayItems` (`officePayItemId`, `jobId`, `description`, `actualCost`, `billingAmount`, `paidBy`, `paymentDate`, `notes`, `createdDate`, `updatedDate`) VALUES ('OPI000004', 'JOB0010', 'DO Charges', 5000.00, NULL, 'USER0002', '2026-03-17 23:03:54', NULL, '2026-03-17 23:03:54', '2026-03-17 23:16:08');
INSERT INTO `OfficePayItems` (`officePayItemId`, `jobId`, `description`, `actualCost`, `billingAmount`, `paidBy`, `paymentDate`, `notes`, `createdDate`, `updatedDate`) VALUES ('OPI000005', 'JOB0010', 'Refer Payment Module Code (6COSC023C)', 65000.00, NULL, 'USER0002', '2026-03-17 23:06:00', NULL, '2026-03-17 23:06:00', '2026-03-17 23:16:08');
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773736659026_nd2b4ngqe', 'JOB0001', 'DO Charges', 10000.00, 'USER0006', '2026-03-17 14:07:39', 10000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773736659028_svlnrmmvq', 'JOB0001', 'Airport Handling', 5000.00, 'USER0006', '2026-03-17 14:07:39', 8000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773736659031_oaofp5py2', 'JOB0001', 'Customs Clearance', 2000.00, 'USER0006', '2026-03-17 14:07:39', 8000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773736659034_thmvrdo8y', 'JOB0001', 'Storage Charges', 5000.00, 'USER0006', '2026-03-17 14:07:39', 8000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773736659037_eqavkoqsj', 'JOB0001', 'Air Freight Charges', 5000.00, 'USER0006', '2026-03-17 14:07:39', 8000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773736659039_ize4dt1q7', 'JOB0001', 'Documentation Fee', 1000.00, 'USER0006', '2026-03-17 14:07:39', 8000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773736659040_p96b8nsub', 'JOB0001', 'Delivery Charges', 1000.00, 'USER0006', '2026-03-17 14:07:39', 1000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773736659040_xfxes9l06', 'JOB0001', 'SLPA', 0.00, 'USER0006', '2026-03-17 14:07:39', 10000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773736659043_shl68wvsq', 'JOB0001', 'Transport', 20000.00, 'USER0006', '2026-03-17 14:07:39', 25000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773741569201_8krff6t5e', 'JOB0002', 'DO Charges', 5000.00, 'USER0006', '2026-03-17 15:29:29', 5000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773741569204_f7ho990s1', 'JOB0002', 'Documentation Fee', 1000.00, 'USER0006', '2026-03-17 15:29:29', 2000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773741569206_q3aokudzk', 'JOB0002', 'Handling Charges', 1000.00, 'USER0006', '2026-03-17 15:29:29', 2000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773741569209_y9j7bjf8k', 'JOB0002', 'Customs Clearance', 1000.00, 'USER0006', '2026-03-17 15:29:29', 2000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773741569210_bhvwt7hc7', 'JOB0002', 'Delivery Charges', 1000.00, 'USER0006', '2026-03-17 15:29:29', 2000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773741569211_prp8nw89k', 'JOB0002', 'Storage Charges', 1000.00, 'USER0006', '2026-03-17 15:29:29', 2000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773741569213_4nkjwdj9a', 'JOB0002', 'Fuel', 1000.00, 'USER0006', '2026-03-17 15:29:29', 2000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773741569216_jpg0mwfiq', 'JOB0002', 'Agency Fee', 1000.00, 'USER0006', '2026-03-17 15:29:29', 2000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773741569217_zh2yt7f7v', 'JOB0002', 'Transport', 20000.00, 'USER0006', '2026-03-17 15:29:29', 30000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773766306282_q70h8ya0d', 'JOB0004', 'DO Charges', 5000.00, 'USER0006', '2026-03-17 22:21:46', 6000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773766306285_aijmj9j1d', 'JOB0004', 'Air Freight Charges', 1000.00, 'USER0006', '2026-03-17 22:21:46', 6000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773766306288_oi8lo1ehk', 'JOB0004', 'Airport Handling', 1000.00, 'USER0006', '2026-03-17 22:21:46', 6000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773766306291_71jyzund8', 'JOB0004', 'Documentation Fee', 1000.00, 'USER0006', '2026-03-17 22:21:46', 6000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773766306294_z6rr5kzes', 'JOB0004', 'Customs Clearance', 1000.00, 'USER0006', '2026-03-17 22:21:46', 6000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773766306295_0m8nocqgy', 'JOB0004', 'Storage Charges', 1000.00, 'USER0006', '2026-03-17 22:21:46', 6000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773766306295_66g3xoth2', 'JOB0004', 'Delivery Charges', 1000.00, 'USER0006', '2026-03-17 22:21:46', 6000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773769656506_p5mmygzad', 'JOB0010', 'Refer Payment Module Code (6COSC023C)', 65000.00, 'USER0002', '2026-03-17 23:17:36', 65000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773769656510_mw76gid9s', 'JOB0010', 'DO Charges', 5000.00, 'USER0002', '2026-03-17 23:17:36', 5000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773769656514_sybvrynjo', 'JOB0010', 'Documentation Fee', 2000.00, 'USER0002', '2026-03-17 23:17:36', 3000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773769656518_mfm8azwzy', 'JOB0010', 'Customs Clearance', 2000.00, 'USER0002', '2026-03-17 23:17:36', 6000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773769656519_tcp43uuce', 'JOB0010', 'Demurrage Charges', 8000.00, 'USER0002', '2026-03-17 23:17:36', 13000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773769656520_sqpzs9ocv', 'JOB0010', 'Port Charges', 1000.00, 'USER0002', '2026-03-17 23:17:36', 3000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773769656523_7blxk1tlo', 'JOB0010', 'Detention Charges', 5000.00, 'USER0002', '2026-03-17 23:17:36', 6000.00, 0);
INSERT INTO `PayItems` (`PayItemId`, `JobId`, `Description`, `ActualCost`, `AddedBy`, `AddedDate`, `BillingAmount`, `isCustomItem`) VALUES ('PI1773769656524_l39qbz064', 'JOB0010', 'Food', 1000.00, 'USER0002', '2026-03-17 23:17:36', 1000.00, 0);
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (1, 'LCL', 'Port Charges', 1, 0, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (2, 'LCL', 'Documentation Fee', 2, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (3, 'LCL', 'Handling Charges', 3, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (4, 'LCL', 'Customs Clearance', 4, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (5, 'LCL', 'Delivery Charges', 5, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (6, 'LCL', 'Storage Charges', 6, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (7, 'FCL', 'Container Charges', 1, 0, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (8, 'FCL', 'Port Charges', 2, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (9, 'FCL', 'Documentation Fee', 3, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (10, 'FCL', 'Customs Clearance', 4, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (11, 'FCL', 'Transport Charges', 5, 0, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (12, 'FCL', 'Detention Charges', 6, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (13, 'FCL', 'Demurrage Charges', 7, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (14, 'Air Freight', 'Air Freight Charges', 1, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (15, 'Air Freight', 'Airport Handling', 2, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (16, 'Air Freight', 'Documentation Fee', 3, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (17, 'Air Freight', 'Customs Clearance', 4, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (18, 'Air Freight', 'Delivery Charges', 5, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (19, 'Air Freight', 'Storage Charges', 6, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (20, 'BOI', 'BOI Processing Fee', 1, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (21, 'BOI', 'Port Charges', 2, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (22, 'BOI', 'Documentation Fee', 3, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (23, 'BOI', 'Customs Clearance', 4, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (24, 'BOI', 'Transport Charges', 5, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (25, 'BOI', 'Handling Charges', 6, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (26, 'Vehicle', 'Vehicle Import Fee', 1, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (27, 'Vehicle', 'Port Charges', 2, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (28, 'Vehicle', 'Documentation Fee', 3, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (29, 'Vehicle', 'Customs Clearance', 4, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (30, 'Vehicle', 'RMV Registration', 5, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (31, 'Vehicle', 'Transport Charges', 6, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (32, 'Vehicle', 'Inspection Fee', 7, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (33, 'TIEP', 'TIEP Processing Fee', 1, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (34, 'TIEP', 'Port Charges', 2, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (35, 'TIEP', 'Documentation Fee', 3, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (36, 'TIEP', 'Customs Clearance', 4, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (37, 'TIEP', 'Bond Charges', 5, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (38, 'TIEP', 'Transport Charges', 6, 1, '2026-03-03 20:22:14');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (39, 'LCL', 'Fuel', 7, 1, '2026-03-03 20:24:07');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (40, 'FCL', 'Food', 8, 1, '2026-03-03 20:24:13');
INSERT INTO `PayItemTemplates` (`templateId`, `shipmentCategory`, `itemName`, `itemOrder`, `isActive`, `createdDate`) VALUES (41, 'LCL', 'Agency Fee', 8, 1, '2026-03-04 03:00:55');
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (55, 'JOB0001', 'USER0003', 'USER0006', 10000.00, '2026-03-17 14:05:57', 'Settled', '2026-03-17 14:06:28', 7000.00, 3000.00, 0.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (56, 'JOB0001', 'USER0004', 'USER0006', 10000.00, '2026-03-17 14:06:03', 'Settled/Approved', '2026-03-17 14:06:46', 12000.00, 0.00, 2000.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (57, 'JOB0002', 'USER0003', 'USER0006', 10000.00, '2026-03-17 15:27:10', 'Settled', '2026-03-17 15:27:57', 7000.00, 3000.00, 0.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (58, 'JOB0003', 'USER0003', 'USER0006', 10000.00, '2026-03-17 22:06:33', 'Balance Returned', '2026-03-17 22:06:51', 7000.00, 3000.00, 0.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (59, 'JOB0004', 'USER0005', 'USER0006', 10000.00, '2026-03-17 22:19:35', 'Balance Returned', '2026-03-17 22:20:26', 6000.00, 4000.00, 0.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (60, 'JOB0005', 'USER0004', 'USER0006', 10000.00, '2026-03-17 22:32:10', 'Settled', '2026-03-17 22:32:41', 8000.00, 2000.00, 0.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (61, 'JOB0006', 'USER0004', 'USER0006', 10000.00, '2026-03-17 22:45:12', 'Settled', '2026-03-17 22:45:50', 6000.00, 4000.00, 0.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (62, 'JOB0007', 'USER0003', 'USER0006', 10000.00, '2026-03-17 22:50:23', 'Settled', '2026-03-17 22:50:54', 8000.00, 2000.00, 0.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (63, 'JOB0008', 'USER0004', 'USER0006', 10000.00, '2026-03-17 22:54:59', 'Settled', '2026-03-17 22:55:35', 6000.00, 4000.00, 0.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (64, 'JOB0008', 'USER0005', 'USER0006', 10000.00, '2026-03-17 22:55:06', 'Assigned', NULL, NULL, NULL, NULL, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (65, 'JOB0010', 'USER0003', 'USER0002', 10000.00, '2026-03-17 23:11:07', 'Balance Returned', '2026-03-17 23:11:48', 7000.00, 3000.00, 0.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (66, 'JOB0010', 'USER0004', 'USER0002', 10000.00, '2026-03-17 23:11:14', 'Settled/Approved', '2026-03-17 23:14:14', 12000.00, 0.00, 2000.00, NULL);
INSERT INTO `PettyCashAssignments` (`assignmentId`, `jobId`, `assignedTo`, `assignedBy`, `assignedAmount`, `assignedDate`, `status`, `settlementDate`, `actualSpent`, `balanceAmount`, `overAmount`, `notes`) VALUES (67, 'JOB0011', 'USER0003', 'USER0006', 10000.00, '2026-03-18 14:17:57', 'Settled/Approved', '2026-03-18 14:18:14', 7000.00, 3000.00, 0.00, NULL);
INSERT INTO `PettyCashBalance` (`Id`, `Balance`, `LastUpdated`) VALUES (1, 1000.00, '2026-03-03 21:46:35');
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (192, 55, 'Air Freight Charges', 5000.00, 0, '2026-03-17 14:06:28', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (193, 55, 'Documentation Fee', 1000.00, 0, '2026-03-17 14:06:28', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (194, 55, 'Delivery Charges', 1000.00, 0, '2026-03-17 14:06:28', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (195, 56, 'Airport Handling', 5000.00, 0, '2026-03-17 14:06:46', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (196, 56, 'Customs Clearance', 2000.00, 0, '2026-03-17 14:06:46', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (197, 56, 'Storage Charges', 5000.00, 0, '2026-03-17 14:06:46', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (198, 57, 'Documentation Fee', 1000.00, 0, '2026-03-17 15:27:57', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (199, 57, 'Handling Charges', 1000.00, 0, '2026-03-17 15:27:57', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (200, 57, 'Customs Clearance', 1000.00, 0, '2026-03-17 15:27:57', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (201, 57, 'Delivery Charges', 1000.00, 0, '2026-03-17 15:27:57', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (202, 57, 'Storage Charges', 1000.00, 0, '2026-03-17 15:27:57', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (203, 57, 'Fuel', 1000.00, 0, '2026-03-17 15:27:57', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (204, 57, 'Agency Fee', 1000.00, 0, '2026-03-17 15:27:57', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (205, 58, 'Documentation Fee', 1000.00, 0, '2026-03-17 22:06:51', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (206, 58, 'Handling Charges', 1000.00, 0, '2026-03-17 22:06:51', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (207, 58, 'Customs Clearance', 1000.00, 0, '2026-03-17 22:06:51', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (208, 58, 'Delivery Charges', 1000.00, 0, '2026-03-17 22:06:51', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (209, 58, 'Storage Charges', 1000.00, 0, '2026-03-17 22:06:51', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (210, 58, 'Fuel', 1000.00, 0, '2026-03-17 22:06:51', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (211, 58, 'Agency Fee', 1000.00, 0, '2026-03-17 22:06:51', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (212, 59, 'Air Freight Charges', 1000.00, 0, '2026-03-17 22:20:26', 'USER0005', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (213, 59, 'Airport Handling', 1000.00, 0, '2026-03-17 22:20:26', 'USER0005', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (214, 59, 'Documentation Fee', 1000.00, 0, '2026-03-17 22:20:26', 'USER0005', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (215, 59, 'Customs Clearance', 1000.00, 0, '2026-03-17 22:20:26', 'USER0005', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (216, 59, 'Delivery Charges', 1000.00, 0, '2026-03-17 22:20:26', 'USER0005', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (217, 59, 'Storage Charges', 1000.00, 0, '2026-03-17 22:20:26', 'USER0005', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (218, 60, 'Documentation Fee', 2000.00, 0, '2026-03-17 22:32:41', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (219, 60, 'Handling Charges', 1000.00, 0, '2026-03-17 22:32:41', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (220, 60, 'Customs Clearance', 1000.00, 0, '2026-03-17 22:32:41', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (221, 60, 'Delivery Charges', 1000.00, 0, '2026-03-17 22:32:41', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (222, 60, 'Storage Charges', 1000.00, 0, '2026-03-17 22:32:41', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (223, 60, 'Fuel', 1000.00, 0, '2026-03-17 22:32:41', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (224, 60, 'Agency Fee', 1000.00, 0, '2026-03-17 22:32:41', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (225, 61, 'Port Charges', 1000.00, 0, '2026-03-17 22:45:49', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (226, 61, 'Documentation Fee', 1000.00, 0, '2026-03-17 22:45:49', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (227, 61, 'Customs Clearance', 1000.00, 0, '2026-03-17 22:45:49', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (228, 61, 'Detention Charges', 1000.00, 0, '2026-03-17 22:45:49', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (229, 61, 'Demurrage Charges', 1000.00, 0, '2026-03-17 22:45:49', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (230, 61, 'Food', 1000.00, 0, '2026-03-17 22:45:50', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (231, 62, 'Documentation Fee', 2000.00, 0, '2026-03-17 22:50:54', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (232, 62, 'Handling Charges', 1000.00, 0, '2026-03-17 22:50:54', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (233, 62, 'Customs Clearance', 1000.00, 0, '2026-03-17 22:50:54', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (234, 62, 'Delivery Charges', 1000.00, 0, '2026-03-17 22:50:54', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (235, 62, 'Storage Charges', 1000.00, 0, '2026-03-17 22:50:54', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (236, 62, 'Fuel', 1000.00, 0, '2026-03-17 22:50:54', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (237, 62, 'Agency Fee', 1000.00, 0, '2026-03-17 22:50:54', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (238, 63, 'Air Freight Charges', 1000.00, 0, '2026-03-17 22:55:35', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (239, 63, 'Airport Handling', 1000.00, 0, '2026-03-17 22:55:35', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (240, 63, 'Documentation Fee', 1000.00, 0, '2026-03-17 22:55:35', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (241, 63, 'Customs Clearance', 1000.00, 0, '2026-03-17 22:55:35', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (242, 63, 'Delivery Charges', 1000.00, 0, '2026-03-17 22:55:35', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (243, 63, 'Storage Charges', 1000.00, 0, '2026-03-17 22:55:35', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (244, 65, 'Port Charges', 1000.00, 0, '2026-03-17 23:11:48', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (245, 65, 'Detention Charges', 5000.00, 0, '2026-03-17 23:11:48', 'USER0003', 1);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (246, 65, 'Food', 1000.00, 0, '2026-03-17 23:11:48', 'USER0003', 1);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (247, 66, 'Documentation Fee', 2000.00, 0, '2026-03-17 23:14:14', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (248, 66, 'Customs Clearance', 2000.00, 0, '2026-03-17 23:14:14', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (249, 66, 'Demurrage Charges', 8000.00, 0, '2026-03-17 23:14:14', 'USER0004', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (250, 67, 'Documentation Fee', 1000.00, 0, '2026-03-18 14:18:14', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (251, 67, 'Handling Charges', 1000.00, 0, '2026-03-18 14:18:14', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (252, 67, 'Customs Clearance', 1000.00, 0, '2026-03-18 14:18:14', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (253, 67, 'Delivery Charges', 1000.00, 0, '2026-03-18 14:18:14', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (254, 67, 'Storage Charges', 1000.00, 0, '2026-03-18 14:18:14', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (255, 67, 'Fuel', 1000.00, 0, '2026-03-18 14:18:14', 'USER0003', 0);
INSERT INTO `PettyCashSettlementItems` (`settlementItemId`, `assignmentId`, `itemName`, `actualCost`, `isCustomItem`, `createdDate`, `paidBy`, `hasBill`) VALUES (256, 67, 'Agency Fee', 1000.00, 0, '2026-03-18 14:18:14', 'USER0003', 0);
INSERT INTO `Transporters` (`transporterId`, `name`, `contactPerson`, `phone`, `email`, `address`, `vehicleNumber`, `notes`, `createdDate`, `isActive`, `registrationDate`, `addressNumber`, `addressStreet1`, `addressStreet2`, `addressDistrict`, `addressCity`, `addressCountry`, `contactPersonsJson`) VALUES ('TRN0001', 'Sasmika Devmith', 'Sasmika Devmith', '0711843128', 'sasmikadevmith955@gmail.com', '124/1 , Campus Road, Raththanapitiya, Colombo, Boralesgamuwa, Sri Lanka', NULL, NULL, '2026-03-16 07:34:49', 1, '2026-03-16 00:00:00', '124/1 ', 'Campus Road', 'Raththanapitiya', 'Colombo', 'Boralesgamuwa', 'Sri Lanka', '[{"name":"Sasmika Devmith","phone":"0711843128","email":"sasmikadevmith955@gmail.com"}]');
INSERT INTO `Transporters` (`transporterId`, `name`, `contactPerson`, `phone`, `email`, `address`, `vehicleNumber`, `notes`, `createdDate`, `isActive`, `registrationDate`, `addressNumber`, `addressStreet1`, `addressStreet2`, `addressDistrict`, `addressCity`, `addressCountry`, `contactPersonsJson`) VALUES ('TRN0002', 'Test Transporter', 'Test Transporter', '0711843128', 'test@gmail.com', '5900 Balcones Drive, STE 100, Gampaha, Gampaha, Sri Lanka', NULL, NULL, '2026-03-17 17:32:51', 1, '2026-03-17 00:00:00', '5900 Balcones Drive', 'STE 100', NULL, 'Gampaha', 'Gampaha', 'Sri Lanka', '[{"name":"Test Transporter","phone":"0711843128","email":"tra@gmail.com"}]');
INSERT INTO `Users` (`UserId`, `Username`, `Password`, `FullName`, `Role`, `Email`, `CreatedDate`, `IsActive`) VALUES ('USER0001', 'superadmin', 'admin123', 'Super Admin', 'Super Admin', 'superadmin@supershine.lk', '2026-02-26 18:17:25', 1);
INSERT INTO `Users` (`UserId`, `Username`, `Password`, `FullName`, `Role`, `Email`, `CreatedDate`, `IsActive`) VALUES ('USER0002', 'Sasmika_Devmith', '1234@Sasmika', 'Sasmika Devmith', 'Super Admin', 'sasmikadevmith955@gmail.com', '2026-02-26 18:34:04', 1);
INSERT INTO `Users` (`UserId`, `Username`, `Password`, `FullName`, `Role`, `Email`, `CreatedDate`, `IsActive`) VALUES ('USER0003', 'Waff_Clerk_01', '1234@Waff', 'Waff Clerk Number 01', 'Waff Clerk', 'waffclerkno01@gmail.com', '2026-03-11 19:31:55', 1);
INSERT INTO `Users` (`UserId`, `Username`, `Password`, `FullName`, `Role`, `Email`, `CreatedDate`, `IsActive`) VALUES ('USER0004', 'Waff_Clerk_02', '1234@Waff02', 'Waff Clerk Number 02', 'Waff Clerk', 'waffclerkno02@gmail.com', '2026-03-11 19:32:40', 1);
INSERT INTO `Users` (`UserId`, `Username`, `Password`, `FullName`, `Role`, `Email`, `CreatedDate`, `IsActive`) VALUES ('USER0005', 'Waff_Clerk_03', '1234@Waff03', 'Waff Clerk Number 03', 'Waff Clerk', 'waffclerkno03@gmail.com', '2026-03-11 19:33:12', 1);
INSERT INTO `Users` (`UserId`, `Username`, `Password`, `FullName`, `Role`, `Email`, `CreatedDate`, `IsActive`) VALUES ('USER0006', 'Test_Manager_01', '1234@Manager', 'Test Manager 01', 'Manager', 'testmanager@gmail.com', '2026-03-11 19:40:54', 1);
INSERT INTO `Users` (`UserId`, `Username`, `Password`, `FullName`, `Role`, `Email`, `CreatedDate`, `IsActive`) VALUES ('USER0007', 'Test_Office', '1234@Office', 'Test Office', 'Office Executive', 'test@gmail.com', '2026-03-13 20:09:15', 1);

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

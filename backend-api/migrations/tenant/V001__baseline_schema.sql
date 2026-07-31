-- ============================================================================
-- V001 Baseline schema (portable) for a Super Shine Cargo TENANT database.
-- Extracted from export.sql: tables, views, indexes, constraints, defaults,
-- foreign keys and the sp_* programmables. The non-portable SSMS preamble
-- (CREATE DATABASE with machine paths, ALTER DATABASE SET..., CREATE USER /
-- ALTER ROLE, USE statements) has been removed so this runs on any server
-- against an already-created, already-selected database.
-- Stored procedures (usp_*) are applied separately as repeatable migrations.
-- ============================================================================

/****** Object:  Table [dbo].[Customers]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Customers](
	[CustomerId] [varchar](20) NOT NULL,
	[Name] [nvarchar](255) NOT NULL,
	[MainPhone] [nvarchar](50) NOT NULL,
	[Email] [nvarchar](255) NOT NULL,
	[IsSameLocation] [bit] NULL,
	[Website] [nvarchar](255) NULL,
	[RegistrationDate] [datetime] NULL,
	[IsActive] [bit] NULL,
	[creditPeriodDays] [int] NULL,
	[cityId] [int] NULL,
	[districtId] [int] NULL,
	[addressNumber] [nvarchar](20) NOT NULL,
	[addressStreet1] [nvarchar](200) NOT NULL,
	[addressStreet2] [nvarchar](200) NULL,
	[addressCity] [nvarchar](100) NOT NULL,
	[addressDistrict] [nvarchar](100) NOT NULL,
	[officeAddressNumber] [nvarchar](20) NULL,
	[officeAddressStreet1] [nvarchar](200) NULL,
	[officeAddressStreet2] [nvarchar](200) NULL,
	[officeAddressCity] [nvarchar](100) NULL,
	[officeAddressDistrict] [nvarchar](100) NULL,
	[isOfficeAddressSame] [bit] NULL,
	[addressCountry] [nvarchar](100) NOT NULL,
	[officeAddressCountry] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[CustomerId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Jobs]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Jobs](
	[JobId] [varchar](50) NOT NULL,
	[CustomerId] [varchar](20) NOT NULL,
	[BLNumber] [varchar](100) NULL,
	[CUSDECNumber] [varchar](100) NULL,
	[OpenDate] [date] NULL,
	[ShipmentCategory] [varchar](100) NULL,
	[Status] [varchar](50) NULL,
	[CreatedDate] [datetime] NULL,
	[CreatedBy] [varchar](50) NULL,
	[CompletedDate] [datetime] NULL,
	[Exporter] [varchar](500) NULL,
	[LCNumber] [varchar](100) NULL,
	[ContainerNumber] [varchar](100) NULL,
	[pettyCashStatus] [nvarchar](20) NOT NULL,
	[Transporter] [nvarchar](200) NULL,
	[AssignedTo] [varchar](50) NULL,
	[advancePayment] [decimal](18, 2) NULL,
	[advancePaymentDate] [datetime] NULL,
	[advancePaymentNotes] [nvarchar](500) NULL,
	[advancePaymentRecordedBy] [varchar](50) NULL,
	[payItems] [nvarchar](max) NULL,
	[assignedUsers] [nvarchar](max) NULL,
	[officePayItems] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[advancePaymentType] [nvarchar](50) NULL,
	[advancePaymentCheckNo] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[JobId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Bills]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Bills](
	[BillId] [varchar](50) NOT NULL,
	[JobId] [varchar](50) NOT NULL,
	[CustomerId] [varchar](20) NOT NULL,
	[Amount] [decimal](10, 2) NOT NULL,
	[Tax] [decimal](10, 2) NOT NULL,
	[Total] [decimal](10, 2) NOT NULL,
	[PaymentStatus] [varchar](50) NULL,
	[CreatedDate] [datetime] NULL,
	[ActualCost] [decimal](10, 2) NULL,
	[BillingAmount] [decimal](10, 2) NULL,
	[Profit] [decimal](10, 2) NULL,
	[BillDate] [datetime] NULL,
	[InvoiceNumber] [varchar](50) NULL,
	[shipmentCategory] [nvarchar](50) NULL,
	[pettyCashSettled] [bit] NOT NULL,
	[invoiceDate] [datetime] NULL,
	[dueDate] [datetime] NULL,
	[isOverdue] [bit] NULL,
	[advancePayment] [decimal](18, 2) NULL,
	[grossTotal] [decimal](18, 2) NULL,
	[netTotal] [decimal](18, 2) NULL,
PRIMARY KEY CLUSTERED 
(
	[BillId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_OverdueInvoices]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE VIEW [dbo].[vw_OverdueInvoices] AS
SELECT 
    b.billId,
    b.jobId,
    b.customerId,
    b.invoiceDate,
    b.dueDate,
    b.paymentStatus,
    j.status AS jobStatus,
    c.creditPeriodDays,
    DATEDIFF(DAY, b.dueDate, GETDATE()) AS daysOverdue,
    CASE 
        WHEN b.paymentStatus = 'Unpaid' 
             AND b.dueDate IS NOT NULL 
             AND GETDATE() > b.dueDate 
        THEN 1 
        ELSE 0 
    END AS shouldBeOverdue
FROM Bills b
INNER JOIN Jobs j ON b.jobId = j.jobId
INNER JOIN Customers c ON b.customerId = c.customerId
WHERE b.paymentStatus = 'Unpaid';
GO
/****** Object:  Table [dbo].[JobAssignments]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[JobAssignments](
	[assignmentId] [int] IDENTITY(1,1) NOT NULL,
	[jobId] [varchar](50) NOT NULL,
	[userId] [varchar](50) NOT NULL,
	[assignedDate] [datetime] NULL,
	[assignedBy] [varchar](50) NULL,
	[isActive] [bit] NULL,
	[notes] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[assignmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Users]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[UserId] [varchar](50) NOT NULL,
	[Username] [varchar](100) NOT NULL,
	[Password] [varchar](255) NOT NULL,
	[FullName] [varchar](200) NOT NULL,
	[Role] [varchar](50) NOT NULL,
	[Email] [varchar](200) NOT NULL,
	[CreatedDate] [datetime] NULL,
	[IsActive] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_JobAssignments]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_JobAssignments] AS
SELECT 
    ja.assignmentId,
    ja.jobId,
    ja.userId,
    u.fullName as userName,
    u.email as userEmail,
    u.role as userRole,
    ja.assignedDate,
    ja.assignedBy,
    ab.fullName as assignedByName,
    ja.notes,
    j.status as jobStatus,
    j.shipmentCategory,
    c.name as customerName
FROM JobAssignments ja
INNER JOIN Users u ON ja.userId = u.userId
LEFT JOIN Users ab ON ja.assignedBy = ab.userId
INNER JOIN Jobs j ON ja.jobId = j.jobId
INNER JOIN Customers c ON j.customerId = c.customerId
WHERE ja.isActive = 1;
GO
/****** Object:  View [dbo].[vw_JobAssignmentSummary]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_JobAssignmentSummary] AS
SELECT 
    ja.jobId,
    COUNT(DISTINCT ja.userId) AS assignedUserCount,
    STRING_AGG(u.FullName, ', ') AS assignedUserNames,
    STRING_AGG(ja.userId, ',') AS assignedUserIds,
    MAX(ja.assignedDate) AS lastAssignedDate
FROM JobAssignments ja
INNER JOIN Users u ON ja.userId = u.UserId
WHERE ja.isActive = 1
GROUP BY ja.jobId;
GO
/****** Object:  Table [dbo].[PettyCashAssignments]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PettyCashAssignments](
	[assignmentId] [int] IDENTITY(1,1) NOT NULL,
	[jobId] [varchar](50) NOT NULL,
	[assignedTo] [varchar](50) NOT NULL,
	[assignedBy] [varchar](50) NOT NULL,
	[assignedAmount] [decimal](18, 2) NOT NULL,
	[assignedDate] [datetime] NOT NULL,
	[status] [nvarchar](20) NOT NULL,
	[settlementDate] [datetime] NULL,
	[actualSpent] [decimal](18, 2) NULL,
	[balanceAmount] [decimal](18, 2) NULL,
	[overAmount] [decimal](18, 2) NULL,
	[notes] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[assignmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PettyCashSettlementItems]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PettyCashSettlementItems](
	[settlementItemId] [int] IDENTITY(1,1) NOT NULL,
	[assignmentId] [int] NOT NULL,
	[itemName] [nvarchar](200) NOT NULL,
	[actualCost] [decimal](18, 2) NOT NULL,
	[isCustomItem] [bit] NOT NULL,
	[createdDate] [datetime] NOT NULL,
	[paidBy] [varchar](50) NULL,
	[hasBill] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[settlementItemId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_SettlementItemsWithUsers]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_SettlementItemsWithUsers] AS
SELECT 
    si.settlementItemId,
    si.assignmentId,
    si.itemName,
    si.actualCost,
    si.isCustomItem,
    si.paidBy,
    si.createdDate,
    u.fullName as paidByName,
    u.email as paidByEmail,
    pa.jobId,
    pa.assignedTo,
    pa.assignedAmount,
    pa.status as assignmentStatus
FROM PettyCashSettlementItems si
LEFT JOIN Users u ON si.paidBy = u.userId
INNER JOIN PettyCashAssignments pa ON si.assignmentId = pa.assignmentId
GO
/****** Object:  Table [dbo].[CashBalanceSettlements]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CashBalanceSettlements](
	[settlementId] [varchar](50) NOT NULL,
	[userId] [varchar](50) NOT NULL,
	[userName] [nvarchar](100) NOT NULL,
	[managerId] [varchar](50) NULL,
	[managerName] [nvarchar](100) NULL,
	[settlementType] [nvarchar](20) NOT NULL,
	[amount] [decimal](18, 2) NOT NULL,
	[status] [nvarchar](20) NOT NULL,
	[requestDate] [datetime] NOT NULL,
	[approvedDate] [datetime] NULL,
	[completedDate] [datetime] NULL,
	[notes] [nvarchar](max) NULL,
	[managerNotes] [nvarchar](max) NULL,
	[relatedAssignments] [nvarchar](max) NULL,
	[createdBy] [varchar](50) NOT NULL,
	[createdDate] [datetime] NOT NULL,
	[updatedBy] [varchar](50) NULL,
	[updatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[settlementId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Categories]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Categories](
	[CategoryId] [int] IDENTITY(1,1) NOT NULL,
	[CategoryName] [nvarchar](100) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[CategoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Cities]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Cities](
	[cityId] [int] IDENTITY(1,1) NOT NULL,
	[cityName] [nvarchar](100) NOT NULL,
	[districtId] [int] NOT NULL,
	[isActive] [bit] NULL,
	[createdDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[cityId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ContactPersons]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContactPersons](
	[ContactPersonId] [int] NOT NULL,
	[CustomerId] [varchar](20) NOT NULL,
	[Name] [nvarchar](255) NOT NULL,
	[Phone] [nvarchar](50) NOT NULL,
	[Email] [varchar](255) NULL,
	[Designation] [varchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[CustomerId] ASC,
	[ContactPersonId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CustomerCategories]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CustomerCategories](
	[CustomerId] [varchar](20) NOT NULL,
	[CategoryId] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[CustomerId] ASC,
	[CategoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Districts]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Districts](
	[districtId] [int] IDENTITY(1,1) NOT NULL,
	[districtName] [nvarchar](100) NOT NULL,
	[province] [nvarchar](50) NOT NULL,
	[isActive] [bit] NULL,
	[createdDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[districtId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[OfficePayItems]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[OfficePayItems](
	[officePayItemId] [varchar](50) NOT NULL,
	[jobId] [varchar](50) NOT NULL,
	[description] [nvarchar](200) NOT NULL,
	[actualCost] [decimal](18, 2) NOT NULL,
	[billingAmount] [decimal](18, 2) NULL,
	[paidBy] [varchar](50) NOT NULL,
	[paymentDate] [datetime] NULL,
	[notes] [nvarchar](500) NULL,
	[createdDate] [datetime] NULL,
	[updatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[officePayItemId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PayItems]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PayItems](
	[PayItemId] [varchar](50) NOT NULL,
	[JobId] [varchar](50) NOT NULL,
	[Description] [varchar](500) NOT NULL,
	[ActualCost] [decimal](10, 2) NOT NULL,
	[AddedBy] [varchar](50) NOT NULL,
	[AddedDate] [datetime] NULL,
	[BillingAmount] [decimal](10, 2) NULL,
	[isCustomItem] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[PayItemId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PayItemTemplates]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PayItemTemplates](
	[templateId] [int] IDENTITY(1,1) NOT NULL,
	[shipmentCategory] [nvarchar](50) NOT NULL,
	[itemName] [nvarchar](200) NOT NULL,
	[itemOrder] [int] NOT NULL,
	[isActive] [bit] NOT NULL,
	[createdDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[templateId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PettyCash]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PettyCash](
	[EntryId] [varchar](50) NOT NULL,
	[Description] [varchar](500) NOT NULL,
	[Amount] [decimal](10, 2) NOT NULL,
	[EntryType] [varchar](50) NOT NULL,
	[JobId] [varchar](50) NULL,
	[CreatedBy] [varchar](50) NOT NULL,
	[BalanceAfter] [decimal](10, 2) NOT NULL,
	[Date] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[EntryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PettyCashBalance]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PettyCashBalance](
	[Id] [int] NOT NULL,
	[Balance] [decimal](10, 2) NULL,
	[LastUpdated] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Transporters]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Transporters](
	[transporterId] [varchar](50) NOT NULL,
	[name] [nvarchar](200) NOT NULL,
	[contactPerson] [nvarchar](150) NULL,
	[phone] [varchar](20) NOT NULL,
	[email] [varchar](100) NULL,
	[address] [nvarchar](500) NULL,
	[vehicleNumber] [nvarchar](100) NULL,
	[notes] [nvarchar](max) NULL,
	[createdDate] [datetime] NULL,
	[isActive] [bit] NULL,
	[registrationDate] [datetime] NULL,
	[addressNumber] [nvarchar](100) NULL,
	[addressStreet1] [nvarchar](200) NULL,
	[addressStreet2] [nvarchar](200) NULL,
	[addressDistrict] [nvarchar](100) NULL,
	[addressCity] [nvarchar](100) NULL,
	[addressCountry] [nvarchar](100) NULL,
	[contactPersonsJson] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[transporterId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
GO

GO

GO
GO
GO
GO

GO

GO
GO
GO
GO

GO

GO
GO

GO
GO
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Bills_CustomerId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_Bills_CustomerId] ON [dbo].[Bills]
(
	[CustomerId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Bills_JobId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_Bills_JobId] ON [dbo].[Bills]
(
	[JobId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_CashBalanceSettlements_ManagerId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_CashBalanceSettlements_ManagerId] ON [dbo].[CashBalanceSettlements]
(
	[managerId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_CashBalanceSettlements_RequestDate]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_CashBalanceSettlements_RequestDate] ON [dbo].[CashBalanceSettlements]
(
	[requestDate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_CashBalanceSettlements_Status]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_CashBalanceSettlements_Status] ON [dbo].[CashBalanceSettlements]
(
	[status] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_CashBalanceSettlements_Type]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_CashBalanceSettlements_Type] ON [dbo].[CashBalanceSettlements]
(
	[settlementType] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_CashBalanceSettlements_UserId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_CashBalanceSettlements_UserId] ON [dbo].[CashBalanceSettlements]
(
	[userId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Categori__8517B2E01EA58593]    Script Date: 3/18/2026 2:30:38 PM ******/
ALTER TABLE [dbo].[Categories] ADD UNIQUE NONCLUSTERED 
(
	[CategoryName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Cities_DistrictId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_Cities_DistrictId] ON [dbo].[Cities]
(
	[districtId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Customer__A9D105343AA9EB68]    Script Date: 3/18/2026 2:30:38 PM ******/
ALTER TABLE [dbo].[Customers] ADD UNIQUE NONCLUSTERED 
(
	[Email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Customers_AddressCity]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_Customers_AddressCity] ON [dbo].[Customers]
(
	[addressCity] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Customers_AddressDistrict]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_Customers_AddressDistrict] ON [dbo].[Customers]
(
	[addressDistrict] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Customers_CityId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_Customers_CityId] ON [dbo].[Customers]
(
	[cityId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Customers_DistrictId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_Customers_DistrictId] ON [dbo].[Customers]
(
	[districtId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__District__797B2E52F8D5D6B1]    Script Date: 3/18/2026 2:30:38 PM ******/
ALTER TABLE [dbo].[Districts] ADD UNIQUE NONCLUSTERED 
(
	[districtName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__JobAssig__FAF30066BF077FAA]    Script Date: 3/18/2026 2:30:38 PM ******/
ALTER TABLE [dbo].[JobAssignments] ADD UNIQUE NONCLUSTERED 
(
	[jobId] ASC,
	[userId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_JobAssignments_Active]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_JobAssignments_Active] ON [dbo].[JobAssignments]
(
	[jobId] ASC,
	[userId] ASC,
	[isActive] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_JobAssignments_JobId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_JobAssignments_JobId] ON [dbo].[JobAssignments]
(
	[jobId] ASC,
	[isActive] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_JobAssignments_UserId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_JobAssignments_UserId] ON [dbo].[JobAssignments]
(
	[userId] ASC,
	[isActive] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Jobs_CustomerId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_Jobs_CustomerId] ON [dbo].[Jobs]
(
	[CustomerId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Jobs_ShipmentCategory]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_Jobs_ShipmentCategory] ON [dbo].[Jobs]
(
	[ShipmentCategory] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Jobs_Status]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_Jobs_Status] ON [dbo].[Jobs]
(
	[Status] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_OfficePayItems_JobId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_OfficePayItems_JobId] ON [dbo].[OfficePayItems]
(
	[jobId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_OfficePayItems_PaidBy]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_OfficePayItems_PaidBy] ON [dbo].[OfficePayItems]
(
	[paidBy] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_PayItems_JobId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_PayItems_JobId] ON [dbo].[PayItems]
(
	[JobId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_PayItemTemplate]    Script Date: 3/18/2026 2:30:38 PM ******/
ALTER TABLE [dbo].[PayItemTemplates] ADD  CONSTRAINT [UQ_PayItemTemplate] UNIQUE NONCLUSTERED 
(
	[shipmentCategory] ASC,
	[itemName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_PayItemTemplates_Category]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_PayItemTemplates_Category] ON [dbo].[PayItemTemplates]
(
	[shipmentCategory] ASC,
	[itemOrder] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_PettyCash_CreatedBy]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_PettyCash_CreatedBy] ON [dbo].[PettyCash]
(
	[CreatedBy] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_PettyCash_JobId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_PettyCash_JobId] ON [dbo].[PettyCash]
(
	[JobId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_PettyCashAssignments_AssignedTo]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_PettyCashAssignments_AssignedTo] ON [dbo].[PettyCashAssignments]
(
	[assignedTo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_PettyCashAssignments_JobId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_PettyCashAssignments_JobId] ON [dbo].[PettyCashAssignments]
(
	[jobId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_PettyCashAssignments_Status]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_PettyCashAssignments_Status] ON [dbo].[PettyCashAssignments]
(
	[status] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_PettyCashSettlementItems_AssignmentId]    Script Date: 3/18/2026 2:30:38 PM ******/
CREATE NONCLUSTERED INDEX [IX_PettyCashSettlementItems_AssignmentId] ON [dbo].[PettyCashSettlementItems]
(
	[assignmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Users__536C85E4037FECB6]    Script Date: 3/18/2026 2:30:38 PM ******/
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED 
(
	[Username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT ('Unpaid') FOR [PaymentStatus]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT ((0)) FOR [ActualCost]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT ((0)) FOR [BillingAmount]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT ((0)) FOR [Profit]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT (getdate()) FOR [BillDate]
GO
ALTER TABLE [dbo].[Bills] ADD  CONSTRAINT [DF_Bills_pettyCashSettled]  DEFAULT ((0)) FOR [pettyCashSettled]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT (getdate()) FOR [invoiceDate]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT ((0)) FOR [isOverdue]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT ((0.00)) FOR [advancePayment]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT ((0.00)) FOR [grossTotal]
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT ((0.00)) FOR [netTotal]
GO
ALTER TABLE [dbo].[CashBalanceSettlements] ADD  DEFAULT ('PENDING') FOR [status]
GO
ALTER TABLE [dbo].[CashBalanceSettlements] ADD  DEFAULT (getdate()) FOR [requestDate]
GO
ALTER TABLE [dbo].[CashBalanceSettlements] ADD  DEFAULT (getdate()) FOR [createdDate]
GO
ALTER TABLE [dbo].[Cities] ADD  DEFAULT ((1)) FOR [isActive]
GO
ALTER TABLE [dbo].[Cities] ADD  DEFAULT (getdate()) FOR [createdDate]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ((0)) FOR [IsSameLocation]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT (getdate()) FOR [RegistrationDate]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ((30)) FOR [creditPeriodDays]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ('') FOR [addressNumber]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ('') FOR [addressStreet1]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ('') FOR [addressCity]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ('') FOR [addressDistrict]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ((0)) FOR [isOfficeAddressSame]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ('Sri Lanka') FOR [addressCountry]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ('Sri Lanka') FOR [officeAddressCountry]
GO
ALTER TABLE [dbo].[Districts] ADD  DEFAULT ((1)) FOR [isActive]
GO
ALTER TABLE [dbo].[Districts] ADD  DEFAULT (getdate()) FOR [createdDate]
GO
ALTER TABLE [dbo].[JobAssignments] ADD  DEFAULT (getdate()) FOR [assignedDate]
GO
ALTER TABLE [dbo].[JobAssignments] ADD  DEFAULT ((1)) FOR [isActive]
GO
ALTER TABLE [dbo].[Jobs] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[Jobs] ADD  CONSTRAINT [DF_Jobs_pettyCashStatus]  DEFAULT ('Not Assigned') FOR [pettyCashStatus]
GO
ALTER TABLE [dbo].[Jobs] ADD  DEFAULT ((0.00)) FOR [advancePayment]
GO
ALTER TABLE [dbo].[OfficePayItems] ADD  DEFAULT (getdate()) FOR [paymentDate]
GO
ALTER TABLE [dbo].[OfficePayItems] ADD  DEFAULT (getdate()) FOR [createdDate]
GO
ALTER TABLE [dbo].[OfficePayItems] ADD  DEFAULT (getdate()) FOR [updatedDate]
GO
ALTER TABLE [dbo].[PayItems] ADD  DEFAULT (getdate()) FOR [AddedDate]
GO
ALTER TABLE [dbo].[PayItems] ADD  DEFAULT ((0)) FOR [BillingAmount]
GO
ALTER TABLE [dbo].[PayItems] ADD  DEFAULT ((0)) FOR [isCustomItem]
GO
ALTER TABLE [dbo].[PayItemTemplates] ADD  DEFAULT ((0)) FOR [itemOrder]
GO
ALTER TABLE [dbo].[PayItemTemplates] ADD  DEFAULT ((1)) FOR [isActive]
GO
ALTER TABLE [dbo].[PayItemTemplates] ADD  DEFAULT (getdate()) FOR [createdDate]
GO
ALTER TABLE [dbo].[PettyCash] ADD  DEFAULT (getdate()) FOR [Date]
GO
ALTER TABLE [dbo].[PettyCashAssignments] ADD  DEFAULT (getdate()) FOR [assignedDate]
GO
ALTER TABLE [dbo].[PettyCashAssignments] ADD  DEFAULT ('Assigned') FOR [status]
GO
ALTER TABLE [dbo].[PettyCashBalance] ADD  DEFAULT ((1)) FOR [Id]
GO
ALTER TABLE [dbo].[PettyCashBalance] ADD  DEFAULT ((1000.00)) FOR [Balance]
GO
ALTER TABLE [dbo].[PettyCashBalance] ADD  DEFAULT (getdate()) FOR [LastUpdated]
GO
ALTER TABLE [dbo].[PettyCashSettlementItems] ADD  DEFAULT ((0)) FOR [isCustomItem]
GO
ALTER TABLE [dbo].[PettyCashSettlementItems] ADD  DEFAULT (getdate()) FOR [createdDate]
GO
ALTER TABLE [dbo].[PettyCashSettlementItems] ADD  DEFAULT ((0)) FOR [hasBill]
GO
ALTER TABLE [dbo].[Transporters] ADD  DEFAULT (getdate()) FOR [createdDate]
GO
ALTER TABLE [dbo].[Transporters] ADD  DEFAULT ((1)) FOR [isActive]
GO
ALTER TABLE [dbo].[Transporters] ADD  DEFAULT (getdate()) FOR [registrationDate]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Bills]  WITH NOCHECK ADD  CONSTRAINT [FK_Bills_Customers] FOREIGN KEY([CustomerId])
REFERENCES [dbo].[Customers] ([CustomerId])
GO
ALTER TABLE [dbo].[Bills] CHECK CONSTRAINT [FK_Bills_Customers]
GO
ALTER TABLE [dbo].[Bills]  WITH NOCHECK ADD  CONSTRAINT [FK_Bills_Jobs] FOREIGN KEY([JobId])
REFERENCES [dbo].[Jobs] ([JobId])
GO
ALTER TABLE [dbo].[Bills] CHECK CONSTRAINT [FK_Bills_Jobs]
GO
ALTER TABLE [dbo].[CashBalanceSettlements]  WITH CHECK ADD FOREIGN KEY([createdBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[CashBalanceSettlements]  WITH CHECK ADD FOREIGN KEY([managerId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[CashBalanceSettlements]  WITH CHECK ADD FOREIGN KEY([updatedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[CashBalanceSettlements]  WITH CHECK ADD FOREIGN KEY([userId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Cities]  WITH CHECK ADD FOREIGN KEY([districtId])
REFERENCES [dbo].[Districts] ([districtId])
GO
ALTER TABLE [dbo].[ContactPersons]  WITH CHECK ADD  CONSTRAINT [FK_ContactPersons_Customers] FOREIGN KEY([CustomerId])
REFERENCES [dbo].[Customers] ([CustomerId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ContactPersons] CHECK CONSTRAINT [FK_ContactPersons_Customers]
GO
ALTER TABLE [dbo].[CustomerCategories]  WITH CHECK ADD  CONSTRAINT [FK_CustomerCategories_Categories] FOREIGN KEY([CategoryId])
REFERENCES [dbo].[Categories] ([CategoryId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[CustomerCategories] CHECK CONSTRAINT [FK_CustomerCategories_Categories]
GO
ALTER TABLE [dbo].[CustomerCategories]  WITH CHECK ADD  CONSTRAINT [FK_CustomerCategories_Customers] FOREIGN KEY([CustomerId])
REFERENCES [dbo].[Customers] ([CustomerId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[CustomerCategories] CHECK CONSTRAINT [FK_CustomerCategories_Customers]
GO
ALTER TABLE [dbo].[JobAssignments]  WITH CHECK ADD FOREIGN KEY([assignedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[JobAssignments]  WITH CHECK ADD FOREIGN KEY([jobId])
REFERENCES [dbo].[Jobs] ([JobId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[JobAssignments]  WITH CHECK ADD FOREIGN KEY([userId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[OfficePayItems]  WITH CHECK ADD FOREIGN KEY([jobId])
REFERENCES [dbo].[Jobs] ([JobId])
GO
ALTER TABLE [dbo].[OfficePayItems]  WITH CHECK ADD FOREIGN KEY([paidBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PayItems]  WITH NOCHECK ADD  CONSTRAINT [FK_PayItems_Jobs] FOREIGN KEY([JobId])
REFERENCES [dbo].[Jobs] ([JobId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[PayItems] CHECK CONSTRAINT [FK_PayItems_Jobs]
GO
ALTER TABLE [dbo].[PayItems]  WITH NOCHECK ADD  CONSTRAINT [FK_PayItems_Users] FOREIGN KEY([AddedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PayItems] CHECK CONSTRAINT [FK_PayItems_Users]
GO
ALTER TABLE [dbo].[PettyCash]  WITH NOCHECK ADD  CONSTRAINT [FK_PettyCash_Jobs] FOREIGN KEY([JobId])
REFERENCES [dbo].[Jobs] ([JobId])
GO
ALTER TABLE [dbo].[PettyCash] CHECK CONSTRAINT [FK_PettyCash_Jobs]
GO
ALTER TABLE [dbo].[PettyCash]  WITH NOCHECK ADD  CONSTRAINT [FK_PettyCash_Users] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PettyCash] CHECK CONSTRAINT [FK_PettyCash_Users]
GO
ALTER TABLE [dbo].[PettyCashAssignments]  WITH NOCHECK ADD  CONSTRAINT [FK_PettyCashAssignments_AssignedBy] FOREIGN KEY([assignedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PettyCashAssignments] CHECK CONSTRAINT [FK_PettyCashAssignments_AssignedBy]
GO
ALTER TABLE [dbo].[PettyCashAssignments]  WITH NOCHECK ADD  CONSTRAINT [FK_PettyCashAssignments_AssignedTo] FOREIGN KEY([assignedTo])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PettyCashAssignments] CHECK CONSTRAINT [FK_PettyCashAssignments_AssignedTo]
GO
ALTER TABLE [dbo].[PettyCashAssignments]  WITH NOCHECK ADD  CONSTRAINT [FK_PettyCashAssignments_Jobs] FOREIGN KEY([jobId])
REFERENCES [dbo].[Jobs] ([JobId])
GO
ALTER TABLE [dbo].[PettyCashAssignments] CHECK CONSTRAINT [FK_PettyCashAssignments_Jobs]
GO
ALTER TABLE [dbo].[PettyCashSettlementItems]  WITH NOCHECK ADD  CONSTRAINT [FK_PettyCashSettlementItems_Assignment] FOREIGN KEY([assignmentId])
REFERENCES [dbo].[PettyCashAssignments] ([assignmentId])
GO
ALTER TABLE [dbo].[PettyCashSettlementItems] CHECK CONSTRAINT [FK_PettyCashSettlementItems_Assignment]
GO
ALTER TABLE [dbo].[PettyCashSettlementItems]  WITH CHECK ADD  CONSTRAINT [FK_SettlementItems_Users_PaidBy] FOREIGN KEY([paidBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PettyCashSettlementItems] CHECK CONSTRAINT [FK_SettlementItems_Users_PaidBy]
GO
ALTER TABLE [dbo].[Bills]  WITH NOCHECK ADD CHECK  (([PaymentStatus]='Unpaid' OR [PaymentStatus]='Paid'))
GO
ALTER TABLE [dbo].[CashBalanceSettlements]  WITH CHECK ADD CHECK  (([amount]>(0)))
GO
ALTER TABLE [dbo].[CashBalanceSettlements]  WITH CHECK ADD CHECK  (([settlementType]='OVERDUE_COLLECTION' OR [settlementType]='BALANCE_RETURN'))
GO
ALTER TABLE [dbo].[CashBalanceSettlements]  WITH CHECK ADD CHECK  (([status]='REJECTED' OR [status]='COMPLETED' OR [status]='APPROVED' OR [status]='PENDING'))
GO
ALTER TABLE [dbo].[Jobs]  WITH CHECK ADD  CONSTRAINT [CK_Jobs_Status] CHECK  (([Status]='Cancelled' OR [Status]='Started' OR [Status]='Canceled' OR [Status]='Completed' OR [Status]='Overdue' OR [Status]='Payment Collected' OR [Status]='Pending Payment' OR [Status]='In Progress' OR [Status]='Open'))
GO
ALTER TABLE [dbo].[Jobs] CHECK CONSTRAINT [CK_Jobs_Status]
GO
ALTER TABLE [dbo].[PettyCash]  WITH NOCHECK ADD CHECK  (([EntryType]='Expense' OR [EntryType]='Income'))
GO
ALTER TABLE [dbo].[PettyCashBalance]  WITH CHECK ADD CHECK  (([Id]=(1)))
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD  CONSTRAINT [CK_Users_Role] CHECK  (([Role]='Waff Clerk' OR [Role]='Office Executive' OR [Role]='Manager' OR [Role]='Admin' OR [Role]='Super Admin'))
GO
ALTER TABLE [dbo].[Users] CHECK CONSTRAINT [CK_Users_Role]
GO
/****** Object:  StoredProcedure [dbo].[sp_AssignUsersToJob]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_AssignUsersToJob]
    @jobId VARCHAR(50),
    @userIds VARCHAR(MAX),
    @assignedBy VARCHAR(50),
    @notes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @AssignedCount INT = 0;
    DECLARE @userId VARCHAR(50);
    DECLARE @pos INT;
    DECLARE @userIdList VARCHAR(MAX) = @userIds + ',';
    
    -- First, deactivate all existing assignments for this job
    UPDATE JobAssignments 
    SET isActive = 0 
    WHERE jobId = @jobId;
    
    -- Parse comma-separated user IDs and insert assignments
    WHILE CHARINDEX(',', @userIdList) > 0
    BEGIN
        SET @pos = CHARINDEX(',', @userIdList);
        SET @userId = LTRIM(RTRIM(SUBSTRING(@userIdList, 1, @pos - 1)));
        SET @userIdList = SUBSTRING(@userIdList, @pos + 1, LEN(@userIdList));
        
        IF LEN(@userId) > 0
        BEGIN
            -- Check if assignment already exists
            IF EXISTS (SELECT 1 FROM JobAssignments WHERE jobId = @jobId AND userId = @userId)
            BEGIN
                -- Reactivate existing assignment
                UPDATE JobAssignments 
                SET isActive = 1, 
                    assignedDate = GETDATE(),
                    assignedBy = @assignedBy,
                    notes = @notes
                WHERE jobId = @jobId AND userId = @userId;
            END
            ELSE
            BEGIN
                -- Create new assignment
                INSERT INTO JobAssignments (jobId, userId, assignedBy, notes)
                VALUES (@jobId, @userId, @assignedBy, @notes);
            END
            
            SET @AssignedCount = @AssignedCount + 1;
        END
    END
    
    SELECT @AssignedCount AS AssignedCount;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_RemoveUserFromJob]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_RemoveUserFromJob]
    @jobId VARCHAR(50),
    @userId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @RemovedCount INT = 0;
    
    UPDATE JobAssignments 
    SET isActive = 0 
    WHERE jobId = @jobId AND userId = @userId AND isActive = 1;
    
    SET @RemovedCount = @@ROWCOUNT;
    
    SELECT @RemovedCount AS RemovedCount;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_UpdateOverdueStatuses]    Script Date: 3/18/2026 2:30:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_UpdateOverdueStatuses]
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @updatedCount INT = 0;
    
    -- Update jobs to Overdue status where invoice is overdue and not yet paid
    UPDATE j
    SET j.status = 'Overdue'
    FROM Jobs j
    INNER JOIN Bills b ON j.jobId = b.jobId
    WHERE b.paymentStatus = 'Unpaid'
        AND b.dueDate IS NOT NULL
        AND GETDATE() > b.dueDate
        AND j.status NOT IN ('Overdue', 'Payment Collected', 'Completed', 'Canceled');
    
    SET @updatedCount = @@ROWCOUNT;
    
    -- Update isOverdue flag in Bills
    UPDATE Bills
    SET isOverdue = 1
    WHERE paymentStatus = 'Unpaid'
        AND dueDate IS NOT NULL
        AND GETDATE() > dueDate
        AND isOverdue = 0;
    
    PRINT 'Updated ' + CAST(@updatedCount AS VARCHAR(10)) + ' jobs to Overdue status';
    
    RETURN @updatedCount;
END
GO

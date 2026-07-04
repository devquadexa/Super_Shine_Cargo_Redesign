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
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000001', N'USER0003', N'Waff_Clerk_01', N'USER0006', N'Test Manager 01', N'BALANCE_RETURN', CAST(1500.00 AS Decimal(18, 2)), N'COMPLETED', CAST(N'2026-03-16T16:58:13.737' AS DateTime), CAST(N'2026-03-16T16:58:25.053' AS DateTime), CAST(N'2026-03-16T16:58:42.040' AS DateTime), N'Balance return for Assignment #51 (JOB0004)', N'', N'[51]', N'USER0003', CAST(N'2026-03-16T16:58:13.737' AS DateTime), N'USER0006', CAST(N'2026-03-16T16:58:42.040' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000002', N'USER0003', N'Waff Clerk Number 01', N'USER0006', N'Test Manager 01', N'BALANCE_RETURN', CAST(3000.00 AS Decimal(18, 2)), N'COMPLETED', CAST(N'2026-03-17T09:31:40.917' AS DateTime), CAST(N'2026-03-17T09:34:56.073' AS DateTime), CAST(N'2026-03-17T09:35:29.137' AS DateTime), N'Balance return for Assignment #55 (JOB0001)', N'', N'[55]', N'USER0003', CAST(N'2026-03-17T09:31:40.917' AS DateTime), N'USER0006', CAST(N'2026-03-17T09:35:29.137' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000003', N'USER0003', N'Waff Clerk Number 01', N'USER0006', N'Test Manager 01', N'BALANCE_RETURN', CAST(3000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-17T09:47:50.827' AS DateTime), CAST(N'2026-03-17T09:48:02.440' AS DateTime), NULL, N'Balance return for Assignment #55 (JOB0001)', N'', N'[55]', N'USER0003', CAST(N'2026-03-17T09:47:50.827' AS DateTime), N'USER0006', CAST(N'2026-03-17T09:48:02.440' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000004', N'USER0004', N'Waff Clerk Number 02', N'USER0006', N'Test Manager 01', N'OVERDUE_COLLECTION', CAST(2000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-17T09:49:39.337' AS DateTime), CAST(N'2026-03-17T09:49:55.237' AS DateTime), NULL, N'Overdue collection for Assignment #56 (JOB0001)', N'', N'[56]', N'USER0004', CAST(N'2026-03-17T09:49:39.337' AS DateTime), N'USER0006', CAST(N'2026-03-17T09:49:55.237' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000005', N'USER0003', N'Waff Clerk Number 01', N'USER0006', N'Test Manager 01', N'BALANCE_RETURN', CAST(3000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-17T09:54:45.587' AS DateTime), CAST(N'2026-03-17T09:58:20.660' AS DateTime), NULL, N'Balance return for Assignment #55 (JOB0001)', N'', N'[55]', N'USER0003', CAST(N'2026-03-17T09:54:45.587' AS DateTime), N'USER0006', CAST(N'2026-03-17T09:58:20.660' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000006', N'USER0003', N'Waff Clerk Number 01', N'USER0006', N'Test Manager 01', N'BALANCE_RETURN', CAST(3000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-17T09:58:05.020' AS DateTime), CAST(N'2026-03-17T09:58:22.323' AS DateTime), NULL, N'Balance return for Assignment #57 (JOB0002)', N'', N'[57]', N'USER0003', CAST(N'2026-03-17T09:58:05.020' AS DateTime), N'USER0006', CAST(N'2026-03-17T09:58:22.323' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000007', N'USER0003', N'Waff Clerk Number 01', N'USER0006', N'Test Manager 01', N'BALANCE_RETURN', CAST(3000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-17T10:07:59.097' AS DateTime), CAST(N'2026-03-17T10:08:10.980' AS DateTime), NULL, N'Balance return for Assignment #57 (JOB0002)', N'', N'[57]', N'USER0003', CAST(N'2026-03-17T10:07:59.097' AS DateTime), N'USER0006', CAST(N'2026-03-17T10:08:10.980' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000008', N'USER0003', N'Waff Clerk Number 01', N'USER0006', N'Test Manager 01', N'BALANCE_RETURN', CAST(3000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-17T16:36:55.530' AS DateTime), CAST(N'2026-03-17T16:37:06.427' AS DateTime), NULL, N'Balance return for Assignment #58 (JOB0003)', N'', N'[58]', N'USER0003', CAST(N'2026-03-17T16:36:55.530' AS DateTime), N'USER0006', CAST(N'2026-03-17T16:37:06.427' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000009', N'USER0005', N'Waff Clerk Number 03', N'USER0006', N'Test Manager 01', N'BALANCE_RETURN', CAST(4000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-17T16:50:29.383' AS DateTime), CAST(N'2026-03-17T16:51:19.663' AS DateTime), NULL, N'Balance return for Assignment #59 (JOB0004)', N'', N'[59]', N'USER0005', CAST(N'2026-03-17T16:50:29.383' AS DateTime), N'USER0006', CAST(N'2026-03-17T16:51:19.663' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000010', N'USER0004', N'Waff Clerk Number 02', N'USER0002', N'Sasmika Devmith', N'OVERDUE_COLLECTION', CAST(2000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-17T17:02:22.327' AS DateTime), CAST(N'2026-03-18T08:45:59.177' AS DateTime), NULL, N'Overdue collection for Assignment #56 (JOB0001)', N'', N'[56]', N'USER0004', CAST(N'2026-03-17T17:02:22.327' AS DateTime), N'USER0002', CAST(N'2026-03-18T08:45:59.177' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000011', N'USER0003', N'Waff Clerk Number 01', N'USER0006', N'Test Manager 01', N'BALANCE_RETURN', CAST(3000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-17T17:42:07.580' AS DateTime), CAST(N'2026-03-17T17:42:24.847' AS DateTime), NULL, N'Balance return for Assignment #65 (JOB0010)', N'', N'[65]', N'USER0003', CAST(N'2026-03-17T17:42:07.580' AS DateTime), N'USER0006', CAST(N'2026-03-17T17:42:24.847' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000012', N'USER0004', N'Waff Clerk Number 02', N'USER0002', N'Sasmika Devmith', N'OVERDUE_COLLECTION', CAST(2000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-17T17:44:40.710' AS DateTime), CAST(N'2026-03-18T08:46:00.027' AS DateTime), NULL, N'Overdue collection for Assignment #66 (JOB0010)', N'', N'[66]', N'USER0004', CAST(N'2026-03-17T17:44:40.710' AS DateTime), N'USER0002', CAST(N'2026-03-18T08:46:00.027' AS DateTime))
INSERT [dbo].[CashBalanceSettlements] ([settlementId], [userId], [userName], [managerId], [managerName], [settlementType], [amount], [status], [requestDate], [approvedDate], [completedDate], [notes], [managerNotes], [relatedAssignments], [createdBy], [createdDate], [updatedBy], [updatedDate]) VALUES (N'CBS000013', N'USER0003', N'Waff Clerk Number 01', N'USER0006', N'Test Manager 01', N'BALANCE_RETURN', CAST(3000.00 AS Decimal(18, 2)), N'APPROVED', CAST(N'2026-03-18T08:48:18.277' AS DateTime), CAST(N'2026-03-18T08:48:26.030' AS DateTime), NULL, N'Balance return for Assignment #67 (JOB0011)', N'', N'[67]', N'USER0003', CAST(N'2026-03-18T08:48:18.277' AS DateTime), N'USER0006', CAST(N'2026-03-18T08:48:26.030' AS DateTime))
GO
SET IDENTITY_INSERT [dbo].[Categories] ON 

INSERT [dbo].[Categories] ([CategoryId], [CategoryName]) VALUES (3, N'Animal Feed')
INSERT [dbo].[Categories] ([CategoryId], [CategoryName]) VALUES (1, N'Chemical / Raw Materials')
INSERT [dbo].[Categories] ([CategoryId], [CategoryName]) VALUES (4, N'Machinery')
INSERT [dbo].[Categories] ([CategoryId], [CategoryName]) VALUES (2, N'Paper')
INSERT [dbo].[Categories] ([CategoryId], [CategoryName]) VALUES (6, N'Raw Material')
INSERT [dbo].[Categories] ([CategoryId], [CategoryName]) VALUES (5, N'Vehicle')
SET IDENTITY_INSERT [dbo].[Categories] OFF
GO
SET IDENTITY_INSERT [dbo].[Cities] ON 

INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (1, N'Colombo', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (2, N'Dehiwala-Mount Lavinia', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (3, N'Moratuwa', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (4, N'Sri Jayawardenepura Kotte', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (5, N'Maharagama', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (6, N'Kesbewa', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (7, N'Kaduwela', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (8, N'Boralesgamuwa', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (9, N'Piliyandala', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (10, N'Nugegoda', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (11, N'Kotte', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (12, N'Rajagiriya', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (13, N'Wellawatte', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (14, N'Bambalapitiya', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (15, N'Pettah', 1, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (16, N'Gampaha', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (17, N'Negombo', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (18, N'Katunayake', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (19, N'Wattala', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (20, N'Kelaniya', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (21, N'Peliyagoda', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (22, N'Minuwangoda', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (23, N'Ja-Ela', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (24, N'Kandana', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (25, N'Kiribathgoda', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (26, N'Ragama', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (27, N'Divulapitiya', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (28, N'Nittambuwa', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (29, N'Veyangoda', 2, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (30, N'Kalutara', 3, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (31, N'Panadura', 3, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (32, N'Horana', 3, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (33, N'Beruwala', 3, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (34, N'Aluthgama', 3, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (35, N'Matugama', 3, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (36, N'Bandaragama', 3, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (37, N'Ingiriya', 3, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (38, N'Kandy', 4, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (39, N'Peradeniya', 4, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (40, N'Gampola', 4, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (41, N'Nawalapitiya', 4, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (42, N'Wattegama', 4, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (43, N'Hatton', 4, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (44, N'Kadugannawa', 4, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (45, N'Matale', 5, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (46, N'Dambulla', 5, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (47, N'Sigiriya', 5, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (48, N'Galewela', 5, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (49, N'Nuwara Eliya', 6, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (50, N'Hatton', 6, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (51, N'Talawakele', 6, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (52, N'Bandarawela', 6, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (53, N'Galle', 7, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (54, N'Hikkaduwa', 7, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (55, N'Ambalangoda', 7, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (56, N'Bentota', 7, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (57, N'Elpitiya', 7, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (58, N'Baddegama', 7, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (59, N'Matara', 8, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (60, N'Weligama', 8, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (61, N'Mirissa', 8, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (62, N'Akuressa', 8, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (63, N'Hakmana', 8, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (64, N'Hambantota', 9, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (65, N'Tangalle', 9, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (66, N'Tissamaharama', 9, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (67, N'Jaffna', 10, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (68, N'Chavakachcheri', 10, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (69, N'Point Pedro', 10, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (70, N'Kurunegala', 18, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (71, N'Kuliyapitiya', 18, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (72, N'Narammala', 18, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (73, N'Wariyapola', 18, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (74, N'Anuradhapura', 20, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (75, N'Kekirawa', 20, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (76, N'Thambuttegama', 20, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (77, N'Batticaloa', 15, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (78, N'Kalmunai', 15, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (79, N'Ratnapura', 24, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (80, N'Embilipitiya', 24, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (81, N'Balangoda', 24, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (82, N'Badulla', 22, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (83, N'Bandarawela', 22, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (84, N'Ella', 22, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (85, N'Haputale', 22, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
INSERT [dbo].[Cities] ([cityId], [cityName], [districtId], [isActive], [createdDate]) VALUES (86, N'Welimada', 22, 1, CAST(N'2026-03-10T15:28:40.927' AS DateTime))
SET IDENTITY_INSERT [dbo].[Cities] OFF
GO
INSERT [dbo].[ContactPersons] ([ContactPersonId], [CustomerId], [Name], [Phone], [Email], [Designation]) VALUES (1, N'CUST0001', N'Sasmika Devmith', N'0711843128', N'sasmikadevmith955@gmail.com', N'Manager')
INSERT [dbo].[ContactPersons] ([ContactPersonId], [CustomerId], [Name], [Phone], [Email], [Designation]) VALUES (1, N'CUST0002', N'Fernando', N'0787843128', N'fernando@gmail.com', N'Manager')
INSERT [dbo].[ContactPersons] ([ContactPersonId], [CustomerId], [Name], [Phone], [Email], [Designation]) VALUES (2, N'CUST0002', N'Perera', N'0718541254', N'perera@gmail.com', N'Director')
GO
INSERT [dbo].[CustomerCategories] ([CustomerId], [CategoryId]) VALUES (N'CUST0001', 5)
INSERT [dbo].[CustomerCategories] ([CustomerId], [CategoryId]) VALUES (N'CUST0002', 1)
INSERT [dbo].[CustomerCategories] ([CustomerId], [CategoryId]) VALUES (N'CUST0002', 4)
GO
INSERT [dbo].[Customers] ([CustomerId], [Name], [MainPhone], [Email], [IsSameLocation], [Website], [RegistrationDate], [IsActive], [creditPeriodDays], [cityId], [districtId], [addressNumber], [addressStreet1], [addressStreet2], [addressCity], [addressDistrict], [officeAddressNumber], [officeAddressStreet1], [officeAddressStreet2], [officeAddressCity], [officeAddressDistrict], [isOfficeAddressSame], [addressCountry], [officeAddressCountry]) VALUES (N'CUST0001', N'Quadexa', N'0711843128', N'sasmikadevmith955@gmail.com', 0, N'https://quadexa.com/', CAST(N'2026-03-10T00:00:00.000' AS DateTime), 1, 30, NULL, NULL, N'124/1 ', N'Campus Road', N'Raththanapitiya', N'Boralesgamuwa', N'Colombo', N'', N'', N'', N'', N'', 1, N'Sri Lanka', N'Sri Lanka')
INSERT [dbo].[Customers] ([CustomerId], [Name], [MainPhone], [Email], [IsSameLocation], [Website], [RegistrationDate], [IsActive], [creditPeriodDays], [cityId], [districtId], [addressNumber], [addressStreet1], [addressStreet2], [addressCity], [addressDistrict], [officeAddressNumber], [officeAddressStreet1], [officeAddressStreet2], [officeAddressCity], [officeAddressDistrict], [isOfficeAddressSame], [addressCountry], [officeAddressCountry]) VALUES (N'CUST0002', N'TDP Thermoline', N'0772222726', N'tdp@gmail.com', 0, NULL, CAST(N'2026-03-13T00:00:00.000' AS DateTime), 1, 30, NULL, NULL, N'123', N'Galle Road', N'Kollupitiya', N'Colombo', N'Colombo', N'', N'', N'', N'', N'', 1, N'Sri Lanka', N'Sri Lanka')
GO
SET IDENTITY_INSERT [dbo].[Districts] ON 

INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (1, N'Colombo', N'Western', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (2, N'Gampaha', N'Western', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (3, N'Kalutara', N'Western', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (4, N'Kandy', N'Central', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (5, N'Matale', N'Central', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (6, N'Nuwara Eliya', N'Central', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (7, N'Galle', N'Southern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (8, N'Matara', N'Southern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (9, N'Hambantota', N'Southern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (10, N'Jaffna', N'Northern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (11, N'Kilinochchi', N'Northern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (12, N'Mannar', N'Northern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (13, N'Mullaitivu', N'Northern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (14, N'Vavuniya', N'Northern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (15, N'Batticaloa', N'Eastern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (16, N'Ampara', N'Eastern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (17, N'Trincomalee', N'Eastern', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (18, N'Kurunegala', N'North Western', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (19, N'Puttalam', N'North Western', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (20, N'Anuradhapura', N'North Central', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (21, N'Polonnaruwa', N'North Central', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (22, N'Badulla', N'Uva', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (23, N'Monaragala', N'Uva', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (24, N'Ratnapura', N'Sabaragamuwa', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
INSERT [dbo].[Districts] ([districtId], [districtName], [province], [isActive], [createdDate]) VALUES (25, N'Kegalle', N'Sabaragamuwa', 1, CAST(N'2026-03-10T15:28:40.890' AS DateTime))
SET IDENTITY_INSERT [dbo].[Districts] OFF
GO
SET IDENTITY_INSERT [dbo].[JobAssignments] ON 

INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (56, N'JOB0001', N'USER0003', CAST(N'2026-03-17T14:05:24.463' AS DateTime), N'USER0006', 1, NULL)
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (57, N'JOB0001', N'USER0004', CAST(N'2026-03-17T14:05:24.463' AS DateTime), N'USER0006', 1, NULL)
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (58, N'JOB0002', N'USER0003', CAST(N'2026-03-17T15:26:54.273' AS DateTime), N'USER0006', 1, NULL)
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (59, N'JOB0003', N'USER0003', CAST(N'2026-03-17T22:06:16.427' AS DateTime), N'USER0006', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (60, N'JOB0004', N'USER0005', CAST(N'2026-03-17T22:18:22.867' AS DateTime), N'USER0006', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (61, N'JOB0005', N'USER0004', CAST(N'2026-03-17T22:31:57.463' AS DateTime), N'USER0006', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (62, N'JOB0006', N'USER0004', CAST(N'2026-03-17T22:44:54.223' AS DateTime), N'USER0006', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (63, N'JOB0007', N'USER0003', CAST(N'2026-03-17T22:50:14.673' AS DateTime), N'USER0006', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (64, N'JOB0008', N'USER0004', CAST(N'2026-03-17T22:54:48.890' AS DateTime), N'USER0006', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (65, N'JOB0008', N'USER0005', CAST(N'2026-03-17T22:54:48.893' AS DateTime), N'USER0006', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (66, N'JOB0009', N'USER0003', CAST(N'2026-03-17T22:59:26.827' AS DateTime), N'USER0006', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (67, N'JOB0009', N'USER0004', CAST(N'2026-03-17T22:59:26.830' AS DateTime), N'USER0006', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (68, N'JOB0010', N'USER0003', CAST(N'2026-03-17T23:03:44.620' AS DateTime), N'USER0002', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (69, N'JOB0010', N'USER0004', CAST(N'2026-03-17T23:03:44.627' AS DateTime), N'USER0002', 1, N'Initial assignment from job creation')
INSERT [dbo].[JobAssignments] ([assignmentId], [jobId], [userId], [assignedDate], [assignedBy], [isActive], [notes]) VALUES (70, N'JOB0011', N'USER0003', CAST(N'2026-03-18T14:17:44.180' AS DateTime), N'USER0006', 1, N'Initial assignment from job creation')
SET IDENTITY_INSERT [dbo].[JobAssignments] OFF
GO
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0001', N'CUST0002', NULL, NULL, CAST(N'2026-03-18' AS Date), N'Air Freight', N'Open', CAST(N'2026-03-17T08:35:24.350' AS DateTime), NULL, NULL, NULL, NULL, NULL, N'Settled', NULL, NULL, CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T08:35:39.140' AS DateTime), N'', N'USER0006', N'[{"description":"DO Charges","amount":10000,"actualCost":10000,"billingAmount":10000,"paidBy":"Test Manager 01","source":"Office Payment","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Airport Handling","amount":5000,"actualCost":5000,"billingAmount":8000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Customs Clearance","amount":2000,"actualCost":2000,"billingAmount":8000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Storage Charges","amount":5000,"actualCost":5000,"billingAmount":8000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Air Freight Charges","amount":5000,"actualCost":5000,"billingAmount":8000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Documentation Fee","amount":1000,"actualCost":1000,"billingAmount":8000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Delivery Charges","amount":1000,"actualCost":1000,"billingAmount":1000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"SLPA","amount":0,"actualCost":0,"billingAmount":10000,"paidBy":"Office","source":"Custom","addedDate":"2026-03-17T08:37:17.333Z"},{"description":"Transport","amount":20000,"actualCost":20000,"billingAmount":25000,"paidBy":"Office","source":"Custom","addedDate":"2026-03-17T08:37:38.943Z"}]', NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0002', N'CUST0001', N'EGLV141501314428', N'I-19583 of  03/02/2026', CAST(N'2026-03-17' AS Date), N'LCL', N'Open', CAST(N'2026-03-17T09:56:54.167' AS DateTime), NULL, NULL, N'Test Exporter', N'345345', N'2321234324', N'Settled', N'Sasmika Devmith', NULL, CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T09:57:28.963' AS DateTime), N'', N'USER0006', N'[{"description":"DO Charges","amount":5000,"actualCost":5000,"billingAmount":5000,"paidBy":"Test Manager 01","source":"Office Payment","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Documentation Fee","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Handling Charges","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Customs Clearance","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Delivery Charges","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Storage Charges","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Fuel","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Agency Fee","amount":1000,"actualCost":1000,"billingAmount":2000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T09:59:12.871Z"},{"description":"Transport","amount":20000,"actualCost":20000,"billingAmount":30000,"paidBy":"Office","source":"Custom","addedDate":"2026-03-17T09:59:29.119Z"}]', NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0003', N'CUST0001', NULL, NULL, CAST(N'2026-03-17' AS Date), N'LCL', N'Open', CAST(N'2026-03-17T16:36:16.380' AS DateTime), NULL, NULL, NULL, NULL, NULL, N'Settled', NULL, N'USER0003', CAST(0.00 AS Decimal(18, 2)), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0004', N'CUST0001', N'EGLV141501314428', N'I-19583 of  03/02/2026', CAST(N'2026-03-18' AS Date), N'Air Freight', N'Open', CAST(N'2026-03-17T16:48:22.810' AS DateTime), NULL, NULL, N'Test Exporter', N'345345', N'2321234324', N'Settled', N'Sasmika Devmith', N'USER0005', CAST(5000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T00:00:00.000' AS DateTime), N'', N'USER0006', N'[{"description":"DO Charges","amount":5000,"actualCost":5000,"billingAmount":6000,"paidBy":"Test Manager 01","source":"Office Payment","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Air Freight Charges","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Airport Handling","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Documentation Fee","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Customs Clearance","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Delivery Charges","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"},{"description":"Storage Charges","amount":1000,"actualCost":1000,"billingAmount":6000,"paidBy":"Waff Clerk Number 03","source":"Petty Cash","addedDate":"2026-03-17T16:51:46.254Z"}]', NULL, NULL, NULL, N'check', N'541214854')
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0005', N'CUST0001', N'EGLV141501314428', N'I-19583 of  03/02/2026', CAST(N'2026-03-17' AS Date), N'LCL', N'Open', CAST(N'2026-03-17T17:01:57.427' AS DateTime), NULL, NULL, N'Test Exporter', N'345345', N'2321234324', N'Settled', N'Sasmika Devmith', N'USER0004', CAST(0.00 AS Decimal(18, 2)), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0006', N'CUST0002', N'EGLV141501314428', N'I-19583 of  03/02/2026', CAST(N'2026-03-17' AS Date), N'FCL', N'Open', CAST(N'2026-03-17T17:14:54.150' AS DateTime), NULL, NULL, N'Test Exporter', N'345345', N'2321234324', N'Settled', N'Sasmika Devmith', N'USER0004', CAST(0.00 AS Decimal(18, 2)), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0007', N'CUST0002', N'EGLV141501314428', N'I-19583 of  03/02/2026', CAST(N'2026-03-17' AS Date), N'LCL', N'Open', CAST(N'2026-03-17T17:20:14.627' AS DateTime), NULL, NULL, N'Test Exporter', N'345345', N'2321234324', N'Settled', N'Sasmika Devmith', N'USER0003', CAST(0.00 AS Decimal(18, 2)), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0008', N'CUST0002', N'EGLV141501314428', N'I-19583 of  03/02/2026', CAST(N'2026-03-17' AS Date), N'Air Freight', N'Open', CAST(N'2026-03-17T17:24:48.850' AS DateTime), NULL, NULL, N'Test Exporter', N'345345', N'2321234324', N'Assigned', N'Sasmika Devmith', N'USER0004', CAST(0.00 AS Decimal(18, 2)), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0009', N'CUST0002', NULL, NULL, CAST(N'2026-03-18' AS Date), N'FCL', N'Open', CAST(N'2026-03-17T17:29:26.647' AS DateTime), NULL, NULL, NULL, NULL, NULL, N'Not Assigned', NULL, N'USER0003', CAST(0.00 AS Decimal(18, 2)), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0010', N'CUST0002', NULL, NULL, CAST(N'2026-03-17' AS Date), N'FCL', N'Open', CAST(N'2026-03-17T17:33:44.353' AS DateTime), NULL, NULL, NULL, NULL, NULL, N'Settled', NULL, N'USER0003', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-18T00:00:00.000' AS DateTime), N'', N'USER0002', N'[{"description":"Refer Payment Module Code (6COSC023C)","amount":65000,"actualCost":65000,"billingAmount":65000,"paidBy":"Sasmika Devmith","source":"Office Payment","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"DO Charges","amount":5000,"actualCost":5000,"billingAmount":5000,"paidBy":"Sasmika Devmith","source":"Office Payment","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Documentation Fee","amount":2000,"actualCost":2000,"billingAmount":3000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Customs Clearance","amount":2000,"actualCost":2000,"billingAmount":6000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Demurrage Charges","amount":8000,"actualCost":8000,"billingAmount":13000,"paidBy":"Waff Clerk Number 02","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Port Charges","amount":1000,"actualCost":1000,"billingAmount":3000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Detention Charges","amount":5000,"actualCost":5000,"billingAmount":6000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"},{"description":"Food","amount":1000,"actualCost":1000,"billingAmount":1000,"paidBy":"Waff Clerk Number 01","source":"Petty Cash","addedDate":"2026-03-17T17:46:08.531Z"}]', NULL, NULL, NULL, N'check', N'2547512')
INSERT [dbo].[Jobs] ([JobId], [CustomerId], [BLNumber], [CUSDECNumber], [OpenDate], [ShipmentCategory], [Status], [CreatedDate], [CreatedBy], [CompletedDate], [Exporter], [LCNumber], [ContainerNumber], [pettyCashStatus], [Transporter], [AssignedTo], [advancePayment], [advancePaymentDate], [advancePaymentNotes], [advancePaymentRecordedBy], [payItems], [assignedUsers], [officePayItems], [metadata], [advancePaymentType], [advancePaymentCheckNo]) VALUES (N'JOB0011', N'CUST0002', NULL, NULL, CAST(N'2026-03-18' AS Date), N'LCL', N'Open', CAST(N'2026-03-18T08:47:44.123' AS DateTime), NULL, NULL, NULL, NULL, NULL, N'Settled', NULL, N'USER0003', CAST(0.00 AS Decimal(18, 2)), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
GO
INSERT [dbo].[OfficePayItems] ([officePayItemId], [jobId], [description], [actualCost], [billingAmount], [paidBy], [paymentDate], [notes], [createdDate], [updatedDate]) VALUES (N'OPI000001', N'JOB0001', N'DO Charges', CAST(10000.00 AS Decimal(18, 2)), NULL, N'USER0006', CAST(N'2026-03-17T14:05:33.807' AS DateTime), NULL, CAST(N'2026-03-17T14:05:33.807' AS DateTime), CAST(N'2026-03-17T14:07:17.310' AS DateTime))
INSERT [dbo].[OfficePayItems] ([officePayItemId], [jobId], [description], [actualCost], [billingAmount], [paidBy], [paymentDate], [notes], [createdDate], [updatedDate]) VALUES (N'OPI000002', N'JOB0002', N'DO Charges', CAST(5000.00 AS Decimal(18, 2)), NULL, N'USER0006', CAST(N'2026-03-17T15:27:23.147' AS DateTime), NULL, CAST(N'2026-03-17T15:27:23.147' AS DateTime), CAST(N'2026-03-17T15:29:12.860' AS DateTime))
INSERT [dbo].[OfficePayItems] ([officePayItemId], [jobId], [description], [actualCost], [billingAmount], [paidBy], [paymentDate], [notes], [createdDate], [updatedDate]) VALUES (N'OPI000003', N'JOB0004', N'DO Charges', CAST(5000.00 AS Decimal(18, 2)), NULL, N'USER0006', CAST(N'2026-03-17T22:19:11.317' AS DateTime), NULL, CAST(N'2026-03-17T22:19:11.317' AS DateTime), CAST(N'2026-03-17T22:21:46.240' AS DateTime))
INSERT [dbo].[OfficePayItems] ([officePayItemId], [jobId], [description], [actualCost], [billingAmount], [paidBy], [paymentDate], [notes], [createdDate], [updatedDate]) VALUES (N'OPI000004', N'JOB0010', N'DO Charges', CAST(5000.00 AS Decimal(18, 2)), NULL, N'USER0002', CAST(N'2026-03-17T23:03:54.920' AS DateTime), NULL, CAST(N'2026-03-17T23:03:54.920' AS DateTime), CAST(N'2026-03-17T23:16:08.520' AS DateTime))
INSERT [dbo].[OfficePayItems] ([officePayItemId], [jobId], [description], [actualCost], [billingAmount], [paidBy], [paymentDate], [notes], [createdDate], [updatedDate]) VALUES (N'OPI000005', N'JOB0010', N'Refer Payment Module Code (6COSC023C)', CAST(65000.00 AS Decimal(18, 2)), NULL, N'USER0002', CAST(N'2026-03-17T23:06:00.170' AS DateTime), NULL, CAST(N'2026-03-17T23:06:00.170' AS DateTime), CAST(N'2026-03-17T23:16:08.510' AS DateTime))
GO
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773736659026_nd2b4ngqe', N'JOB0001', N'DO Charges', CAST(10000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T14:07:39.027' AS DateTime), CAST(10000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773736659028_svlnrmmvq', N'JOB0001', N'Airport Handling', CAST(5000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T14:07:39.030' AS DateTime), CAST(8000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773736659031_oaofp5py2', N'JOB0001', N'Customs Clearance', CAST(2000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T14:07:39.033' AS DateTime), CAST(8000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773736659034_thmvrdo8y', N'JOB0001', N'Storage Charges', CAST(5000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T14:07:39.033' AS DateTime), CAST(8000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773736659037_eqavkoqsj', N'JOB0001', N'Air Freight Charges', CAST(5000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T14:07:39.037' AS DateTime), CAST(8000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773736659039_ize4dt1q7', N'JOB0001', N'Documentation Fee', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T14:07:39.040' AS DateTime), CAST(8000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773736659040_p96b8nsub', N'JOB0001', N'Delivery Charges', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T14:07:39.040' AS DateTime), CAST(1000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773736659040_xfxes9l06', N'JOB0001', N'SLPA', CAST(0.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T14:07:39.040' AS DateTime), CAST(10000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773736659043_shl68wvsq', N'JOB0001', N'Transport', CAST(20000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T14:07:39.043' AS DateTime), CAST(25000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773741569201_8krff6t5e', N'JOB0002', N'DO Charges', CAST(5000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T15:29:29.203' AS DateTime), CAST(5000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773741569204_f7ho990s1', N'JOB0002', N'Documentation Fee', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T15:29:29.203' AS DateTime), CAST(2000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773741569206_q3aokudzk', N'JOB0002', N'Handling Charges', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T15:29:29.207' AS DateTime), CAST(2000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773741569209_y9j7bjf8k', N'JOB0002', N'Customs Clearance', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T15:29:29.210' AS DateTime), CAST(2000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773741569210_bhvwt7hc7', N'JOB0002', N'Delivery Charges', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T15:29:29.210' AS DateTime), CAST(2000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773741569211_prp8nw89k', N'JOB0002', N'Storage Charges', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T15:29:29.210' AS DateTime), CAST(2000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773741569213_4nkjwdj9a', N'JOB0002', N'Fuel', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T15:29:29.213' AS DateTime), CAST(2000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773741569216_jpg0mwfiq', N'JOB0002', N'Agency Fee', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T15:29:29.213' AS DateTime), CAST(2000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773741569217_zh2yt7f7v', N'JOB0002', N'Transport', CAST(20000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T15:29:29.217' AS DateTime), CAST(30000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773766306282_q70h8ya0d', N'JOB0004', N'DO Charges', CAST(5000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T22:21:46.280' AS DateTime), CAST(6000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773766306285_aijmj9j1d', N'JOB0004', N'Air Freight Charges', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T22:21:46.283' AS DateTime), CAST(6000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773766306288_oi8lo1ehk', N'JOB0004', N'Airport Handling', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T22:21:46.287' AS DateTime), CAST(6000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773766306291_71jyzund8', N'JOB0004', N'Documentation Fee', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T22:21:46.290' AS DateTime), CAST(6000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773766306294_z6rr5kzes', N'JOB0004', N'Customs Clearance', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T22:21:46.290' AS DateTime), CAST(6000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773766306295_0m8nocqgy', N'JOB0004', N'Storage Charges', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T22:21:46.293' AS DateTime), CAST(6000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773766306295_66g3xoth2', N'JOB0004', N'Delivery Charges', CAST(1000.00 AS Decimal(10, 2)), N'USER0006', CAST(N'2026-03-17T22:21:46.293' AS DateTime), CAST(6000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773769656506_p5mmygzad', N'JOB0010', N'Refer Payment Module Code (6COSC023C)', CAST(65000.00 AS Decimal(10, 2)), N'USER0002', CAST(N'2026-03-17T23:17:36.507' AS DateTime), CAST(65000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773769656510_mw76gid9s', N'JOB0010', N'DO Charges', CAST(5000.00 AS Decimal(10, 2)), N'USER0002', CAST(N'2026-03-17T23:17:36.510' AS DateTime), CAST(5000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773769656514_sybvrynjo', N'JOB0010', N'Documentation Fee', CAST(2000.00 AS Decimal(10, 2)), N'USER0002', CAST(N'2026-03-17T23:17:36.517' AS DateTime), CAST(3000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773769656518_mfm8azwzy', N'JOB0010', N'Customs Clearance', CAST(2000.00 AS Decimal(10, 2)), N'USER0002', CAST(N'2026-03-17T23:17:36.517' AS DateTime), CAST(6000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773769656519_tcp43uuce', N'JOB0010', N'Demurrage Charges', CAST(8000.00 AS Decimal(10, 2)), N'USER0002', CAST(N'2026-03-17T23:17:36.517' AS DateTime), CAST(13000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773769656520_sqpzs9ocv', N'JOB0010', N'Port Charges', CAST(1000.00 AS Decimal(10, 2)), N'USER0002', CAST(N'2026-03-17T23:17:36.520' AS DateTime), CAST(3000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773769656523_7blxk1tlo', N'JOB0010', N'Detention Charges', CAST(5000.00 AS Decimal(10, 2)), N'USER0002', CAST(N'2026-03-17T23:17:36.520' AS DateTime), CAST(6000.00 AS Decimal(10, 2)), 0)
INSERT [dbo].[PayItems] ([PayItemId], [JobId], [Description], [ActualCost], [AddedBy], [AddedDate], [BillingAmount], [isCustomItem]) VALUES (N'PI1773769656524_l39qbz064', N'JOB0010', N'Food', CAST(1000.00 AS Decimal(10, 2)), N'USER0002', CAST(N'2026-03-17T23:17:36.527' AS DateTime), CAST(1000.00 AS Decimal(10, 2)), 0)
GO
SET IDENTITY_INSERT [dbo].[PayItemTemplates] ON 

INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (1, N'LCL', N'Port Charges', 1, 0, CAST(N'2026-03-03T20:22:14.273' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (2, N'LCL', N'Documentation Fee', 2, 1, CAST(N'2026-03-03T20:22:14.273' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (3, N'LCL', N'Handling Charges', 3, 1, CAST(N'2026-03-03T20:22:14.273' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (4, N'LCL', N'Customs Clearance', 4, 1, CAST(N'2026-03-03T20:22:14.273' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (5, N'LCL', N'Delivery Charges', 5, 1, CAST(N'2026-03-03T20:22:14.273' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (6, N'LCL', N'Storage Charges', 6, 1, CAST(N'2026-03-03T20:22:14.273' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (7, N'FCL', N'Container Charges', 1, 0, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (8, N'FCL', N'Port Charges', 2, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (9, N'FCL', N'Documentation Fee', 3, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (10, N'FCL', N'Customs Clearance', 4, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (11, N'FCL', N'Transport Charges', 5, 0, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (12, N'FCL', N'Detention Charges', 6, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (13, N'FCL', N'Demurrage Charges', 7, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (14, N'Air Freight', N'Air Freight Charges', 1, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (15, N'Air Freight', N'Airport Handling', 2, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (16, N'Air Freight', N'Documentation Fee', 3, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (17, N'Air Freight', N'Customs Clearance', 4, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (18, N'Air Freight', N'Delivery Charges', 5, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (19, N'Air Freight', N'Storage Charges', 6, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (20, N'BOI', N'BOI Processing Fee', 1, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (21, N'BOI', N'Port Charges', 2, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (22, N'BOI', N'Documentation Fee', 3, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (23, N'BOI', N'Customs Clearance', 4, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (24, N'BOI', N'Transport Charges', 5, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (25, N'BOI', N'Handling Charges', 6, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (26, N'Vehicle', N'Vehicle Import Fee', 1, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (27, N'Vehicle', N'Port Charges', 2, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (28, N'Vehicle', N'Documentation Fee', 3, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (29, N'Vehicle', N'Customs Clearance', 4, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (30, N'Vehicle', N'RMV Registration', 5, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (31, N'Vehicle', N'Transport Charges', 6, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (32, N'Vehicle', N'Inspection Fee', 7, 1, CAST(N'2026-03-03T20:22:14.280' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (33, N'TIEP', N'TIEP Processing Fee', 1, 1, CAST(N'2026-03-03T20:22:14.283' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (34, N'TIEP', N'Port Charges', 2, 1, CAST(N'2026-03-03T20:22:14.283' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (35, N'TIEP', N'Documentation Fee', 3, 1, CAST(N'2026-03-03T20:22:14.283' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (36, N'TIEP', N'Customs Clearance', 4, 1, CAST(N'2026-03-03T20:22:14.283' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (37, N'TIEP', N'Bond Charges', 5, 1, CAST(N'2026-03-03T20:22:14.283' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (38, N'TIEP', N'Transport Charges', 6, 1, CAST(N'2026-03-03T20:22:14.283' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (39, N'LCL', N'Fuel', 7, 1, CAST(N'2026-03-03T20:24:07.120' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (40, N'FCL', N'Food', 8, 1, CAST(N'2026-03-03T20:24:13.520' AS DateTime))
INSERT [dbo].[PayItemTemplates] ([templateId], [shipmentCategory], [itemName], [itemOrder], [isActive], [createdDate]) VALUES (41, N'LCL', N'Agency Fee', 8, 1, CAST(N'2026-03-04T03:00:55.210' AS DateTime))
SET IDENTITY_INSERT [dbo].[PayItemTemplates] OFF
GO
SET IDENTITY_INSERT [dbo].[PettyCashAssignments] ON 

INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (55, N'JOB0001', N'USER0003', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T14:05:57.447' AS DateTime), N'Settled', CAST(N'2026-03-17T14:06:28.243' AS DateTime), CAST(7000.00 AS Decimal(18, 2)), CAST(3000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (56, N'JOB0001', N'USER0004', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T14:06:03.650' AS DateTime), N'Settled/Approved', CAST(N'2026-03-17T14:06:46.900' AS DateTime), CAST(12000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(2000.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (57, N'JOB0002', N'USER0003', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T15:27:10.813' AS DateTime), N'Settled', CAST(N'2026-03-17T15:27:57.450' AS DateTime), CAST(7000.00 AS Decimal(18, 2)), CAST(3000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (58, N'JOB0003', N'USER0003', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T22:06:33.413' AS DateTime), N'Balance Returned', CAST(N'2026-03-17T22:06:51.770' AS DateTime), CAST(7000.00 AS Decimal(18, 2)), CAST(3000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (59, N'JOB0004', N'USER0005', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T22:19:35.210' AS DateTime), N'Balance Returned', CAST(N'2026-03-17T22:20:26.863' AS DateTime), CAST(6000.00 AS Decimal(18, 2)), CAST(4000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (60, N'JOB0005', N'USER0004', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T22:32:10.483' AS DateTime), N'Settled', CAST(N'2026-03-17T22:32:41.220' AS DateTime), CAST(8000.00 AS Decimal(18, 2)), CAST(2000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (61, N'JOB0006', N'USER0004', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T22:45:12.100' AS DateTime), N'Settled', CAST(N'2026-03-17T22:45:50.017' AS DateTime), CAST(6000.00 AS Decimal(18, 2)), CAST(4000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (62, N'JOB0007', N'USER0003', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T22:50:23.700' AS DateTime), N'Settled', CAST(N'2026-03-17T22:50:54.980' AS DateTime), CAST(8000.00 AS Decimal(18, 2)), CAST(2000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (63, N'JOB0008', N'USER0004', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T22:54:59.663' AS DateTime), N'Settled', CAST(N'2026-03-17T22:55:35.480' AS DateTime), CAST(6000.00 AS Decimal(18, 2)), CAST(4000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (64, N'JOB0008', N'USER0005', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T22:55:06.217' AS DateTime), N'Assigned', NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (65, N'JOB0010', N'USER0003', N'USER0002', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T23:11:07.330' AS DateTime), N'Balance Returned', CAST(N'2026-03-17T23:11:48.417' AS DateTime), CAST(7000.00 AS Decimal(18, 2)), CAST(3000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (66, N'JOB0010', N'USER0004', N'USER0002', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-17T23:11:14.500' AS DateTime), N'Settled/Approved', CAST(N'2026-03-17T23:14:14.857' AS DateTime), CAST(12000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(2000.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[PettyCashAssignments] ([assignmentId], [jobId], [assignedTo], [assignedBy], [assignedAmount], [assignedDate], [status], [settlementDate], [actualSpent], [balanceAmount], [overAmount], [notes]) VALUES (67, N'JOB0011', N'USER0003', N'USER0006', CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-03-18T14:17:57.907' AS DateTime), N'Settled/Approved', CAST(N'2026-03-18T14:18:14.520' AS DateTime), CAST(7000.00 AS Decimal(18, 2)), CAST(3000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL)
SET IDENTITY_INSERT [dbo].[PettyCashAssignments] OFF
GO
INSERT [dbo].[PettyCashBalance] ([Id], [Balance], [LastUpdated]) VALUES (1, CAST(1000.00 AS Decimal(10, 2)), CAST(N'2026-03-03T21:46:35.073' AS DateTime))
GO
SET IDENTITY_INSERT [dbo].[PettyCashSettlementItems] ON 

INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (192, 55, N'Air Freight Charges', CAST(5000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T14:06:28.220' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (193, 55, N'Documentation Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T14:06:28.230' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (194, 55, N'Delivery Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T14:06:28.237' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (195, 56, N'Airport Handling', CAST(5000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T14:06:46.877' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (196, 56, N'Customs Clearance', CAST(2000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T14:06:46.887' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (197, 56, N'Storage Charges', CAST(5000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T14:06:46.893' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (198, 57, N'Documentation Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T15:27:57.400' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (199, 57, N'Handling Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T15:27:57.410' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (200, 57, N'Customs Clearance', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T15:27:57.413' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (201, 57, N'Delivery Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T15:27:57.417' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (202, 57, N'Storage Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T15:27:57.427' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (203, 57, N'Fuel', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T15:27:57.437' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (204, 57, N'Agency Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T15:27:57.443' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (205, 58, N'Documentation Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:06:51.723' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (206, 58, N'Handling Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:06:51.730' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (207, 58, N'Customs Clearance', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:06:51.733' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (208, 58, N'Delivery Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:06:51.737' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (209, 58, N'Storage Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:06:51.747' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (210, 58, N'Fuel', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:06:51.753' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (211, 58, N'Agency Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:06:51.763' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (212, 59, N'Air Freight Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:20:26.823' AS DateTime), N'USER0005', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (213, 59, N'Airport Handling', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:20:26.833' AS DateTime), N'USER0005', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (214, 59, N'Documentation Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:20:26.843' AS DateTime), N'USER0005', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (215, 59, N'Customs Clearance', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:20:26.847' AS DateTime), N'USER0005', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (216, 59, N'Delivery Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:20:26.847' AS DateTime), N'USER0005', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (217, 59, N'Storage Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:20:26.857' AS DateTime), N'USER0005', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (218, 60, N'Documentation Fee', CAST(2000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:32:41.187' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (219, 60, N'Handling Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:32:41.190' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (220, 60, N'Customs Clearance', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:32:41.190' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (221, 60, N'Delivery Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:32:41.193' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (222, 60, N'Storage Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:32:41.197' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (223, 60, N'Fuel', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:32:41.207' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (224, 60, N'Agency Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:32:41.220' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (225, 61, N'Port Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:45:49.980' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (226, 61, N'Documentation Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:45:49.990' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (227, 61, N'Customs Clearance', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:45:49.990' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (228, 61, N'Detention Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:45:49.993' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (229, 61, N'Demurrage Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:45:49.997' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (230, 61, N'Food', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:45:50.007' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (231, 62, N'Documentation Fee', CAST(2000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:50:54.920' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (232, 62, N'Handling Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:50:54.930' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (233, 62, N'Customs Clearance', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:50:54.933' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (234, 62, N'Delivery Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:50:54.937' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (235, 62, N'Storage Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:50:54.950' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (236, 62, N'Fuel', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:50:54.960' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (237, 62, N'Agency Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:50:54.970' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (238, 63, N'Air Freight Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:55:35.440' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (239, 63, N'Airport Handling', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:55:35.450' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (240, 63, N'Documentation Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:55:35.460' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (241, 63, N'Customs Clearance', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:55:35.460' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (242, 63, N'Delivery Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:55:35.467' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (243, 63, N'Storage Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T22:55:35.473' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (244, 65, N'Port Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T23:11:48.390' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (245, 65, N'Detention Charges', CAST(5000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T23:11:48.400' AS DateTime), N'USER0003', 1)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (246, 65, N'Food', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T23:11:48.410' AS DateTime), N'USER0003', 1)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (247, 66, N'Documentation Fee', CAST(2000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T23:14:14.843' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (248, 66, N'Customs Clearance', CAST(2000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T23:14:14.847' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (249, 66, N'Demurrage Charges', CAST(8000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-17T23:14:14.847' AS DateTime), N'USER0004', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (250, 67, N'Documentation Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-18T14:18:14.457' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (251, 67, N'Handling Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-18T14:18:14.470' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (252, 67, N'Customs Clearance', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-18T14:18:14.470' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (253, 67, N'Delivery Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-18T14:18:14.473' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (254, 67, N'Storage Charges', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-18T14:18:14.487' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (255, 67, N'Fuel', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-18T14:18:14.497' AS DateTime), N'USER0003', 0)
INSERT [dbo].[PettyCashSettlementItems] ([settlementItemId], [assignmentId], [itemName], [actualCost], [isCustomItem], [createdDate], [paidBy], [hasBill]) VALUES (256, 67, N'Agency Fee', CAST(1000.00 AS Decimal(18, 2)), 0, CAST(N'2026-03-18T14:18:14.510' AS DateTime), N'USER0003', 0)
SET IDENTITY_INSERT [dbo].[PettyCashSettlementItems] OFF
GO
INSERT [dbo].[Transporters] ([transporterId], [name], [contactPerson], [phone], [email], [address], [vehicleNumber], [notes], [createdDate], [isActive], [registrationDate], [addressNumber], [addressStreet1], [addressStreet2], [addressDistrict], [addressCity], [addressCountry], [contactPersonsJson]) VALUES (N'TRN0001', N'Sasmika Devmith', N'Sasmika Devmith', N'0711843128', N'sasmikadevmith955@gmail.com', N'124/1 , Campus Road, Raththanapitiya, Colombo, Boralesgamuwa, Sri Lanka', NULL, NULL, CAST(N'2026-03-16T07:34:49.327' AS DateTime), 1, CAST(N'2026-03-16T00:00:00.000' AS DateTime), N'124/1 ', N'Campus Road', N'Raththanapitiya', N'Colombo', N'Boralesgamuwa', N'Sri Lanka', N'[{"name":"Sasmika Devmith","phone":"0711843128","email":"sasmikadevmith955@gmail.com"}]')
INSERT [dbo].[Transporters] ([transporterId], [name], [contactPerson], [phone], [email], [address], [vehicleNumber], [notes], [createdDate], [isActive], [registrationDate], [addressNumber], [addressStreet1], [addressStreet2], [addressDistrict], [addressCity], [addressCountry], [contactPersonsJson]) VALUES (N'TRN0002', N'Test Transporter', N'Test Transporter', N'0711843128', N'test@gmail.com', N'5900 Balcones Drive, STE 100, Gampaha, Gampaha, Sri Lanka', NULL, NULL, CAST(N'2026-03-17T17:32:51.567' AS DateTime), 1, CAST(N'2026-03-17T00:00:00.000' AS DateTime), N'5900 Balcones Drive', N'STE 100', NULL, N'Gampaha', N'Gampaha', N'Sri Lanka', N'[{"name":"Test Transporter","phone":"0711843128","email":"tra@gmail.com"}]')
GO
INSERT [dbo].[Users] ([UserId], [Username], [Password], [FullName], [Role], [Email], [CreatedDate], [IsActive]) VALUES (N'USER0001', N'superadmin', N'admin123', N'Super Admin', N'Super Admin', N'superadmin@supershine.lk', CAST(N'2026-02-26T18:17:25.200' AS DateTime), 1)
INSERT [dbo].[Users] ([UserId], [Username], [Password], [FullName], [Role], [Email], [CreatedDate], [IsActive]) VALUES (N'USER0002', N'Sasmika_Devmith', N'1234@Sasmika', N'Sasmika Devmith', N'Super Admin', N'sasmikadevmith955@gmail.com', CAST(N'2026-02-26T18:34:04.293' AS DateTime), 1)
INSERT [dbo].[Users] ([UserId], [Username], [Password], [FullName], [Role], [Email], [CreatedDate], [IsActive]) VALUES (N'USER0003', N'Waff_Clerk_01', N'1234@Waff', N'Waff Clerk Number 01', N'Waff Clerk', N'waffclerkno01@gmail.com', CAST(N'2026-03-11T19:31:55.363' AS DateTime), 1)
INSERT [dbo].[Users] ([UserId], [Username], [Password], [FullName], [Role], [Email], [CreatedDate], [IsActive]) VALUES (N'USER0004', N'Waff_Clerk_02', N'1234@Waff02', N'Waff Clerk Number 02', N'Waff Clerk', N'waffclerkno02@gmail.com', CAST(N'2026-03-11T19:32:40.457' AS DateTime), 1)
INSERT [dbo].[Users] ([UserId], [Username], [Password], [FullName], [Role], [Email], [CreatedDate], [IsActive]) VALUES (N'USER0005', N'Waff_Clerk_03', N'1234@Waff03', N'Waff Clerk Number 03', N'Waff Clerk', N'waffclerkno03@gmail.com', CAST(N'2026-03-11T19:33:12.623' AS DateTime), 1)
INSERT [dbo].[Users] ([UserId], [Username], [Password], [FullName], [Role], [Email], [CreatedDate], [IsActive]) VALUES (N'USER0006', N'Test_Manager_01', N'1234@Manager', N'Test Manager 01', N'Manager', N'testmanager@gmail.com', CAST(N'2026-03-11T19:40:54.483' AS DateTime), 1)
INSERT [dbo].[Users] ([UserId], [Username], [Password], [FullName], [Role], [Email], [CreatedDate], [IsActive]) VALUES (N'USER0007', N'Test_Office', N'1234@Office', N'Test Office', N'Office Executive', N'test@gmail.com', CAST(N'2026-03-13T20:09:15.483' AS DateTime), 1)
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

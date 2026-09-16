IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Wallets')
BEGIN
  CREATE TABLE [Wallets] (
    [Id] uniqueidentifier NOT NULL PRIMARY KEY,
    [UserId] uniqueidentifier NOT NULL,
    [Balance] decimal(18,2) NOT NULL,
    [Currency] nvarchar(3) NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    [IsDeleted] bit NOT NULL DEFAULT 0,
    [DeletedAt] datetime2 NULL
  );
  CREATE UNIQUE INDEX IX_Wallets_UserId ON [Wallets]([UserId]) WHERE [IsDeleted] = 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WalletTransactions')
BEGIN
  CREATE TABLE [WalletTransactions] (
    [Id] uniqueidentifier NOT NULL PRIMARY KEY,
    [WalletId] uniqueidentifier NOT NULL,
    [Type] int NOT NULL,
    [Amount] decimal(18,2) NOT NULL,
    [BalanceAfter] decimal(18,2) NOT NULL,
    [Description] nvarchar(300) NULL,
    [RelatedPaymentId] uniqueidentifier NULL,
    [RelatedRideId] uniqueidentifier NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    [IsDeleted] bit NOT NULL DEFAULT 0,
    [DeletedAt] datetime2 NULL
  );
  CREATE INDEX IX_WalletTransactions_WalletId ON [WalletTransactions]([WalletId]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Payments')
BEGIN
  CREATE TABLE [Payments] (
    [Id] uniqueidentifier NOT NULL PRIMARY KEY,
    [RideId] uniqueidentifier NOT NULL,
    [PayerUserId] uniqueidentifier NOT NULL,
    [PayeeUserId] uniqueidentifier NULL,
    [Method] int NOT NULL,
    [Status] int NOT NULL,
    [Amount] decimal(18,2) NOT NULL,
    [Currency] nvarchar(3) NOT NULL,
    [BaseFare] decimal(18,2) NOT NULL,
    [DistanceKm] decimal(18,3) NOT NULL,
    [DistanceFare] decimal(18,2) NOT NULL,
    [ParticipantCount] int NOT NULL,
    [SharedFare] decimal(18,2) NOT NULL,
    [ProviderReference] nvarchar(100) NULL,
    [FailureReason] nvarchar(500) NULL,
    [CompletedAt] datetime2 NULL,
    [RefundedAt] datetime2 NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    [IsDeleted] bit NOT NULL DEFAULT 0,
    [DeletedAt] datetime2 NULL
  );
  CREATE INDEX IX_Payments_RideId ON [Payments]([RideId]);
  CREATE INDEX IX_Payments_PayerUserId ON [Payments]([PayerUserId]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChatMessages')
BEGIN
  CREATE TABLE [ChatMessages] (
    [Id] uniqueidentifier NOT NULL PRIMARY KEY,
    [RideId] uniqueidentifier NOT NULL,
    [SenderId] uniqueidentifier NOT NULL,
    [ReceiverId] uniqueidentifier NOT NULL,
    [Message] nvarchar(2000) NOT NULL,
    [SentAt] datetime2 NOT NULL,
    [IsRead] bit NOT NULL,
    [ReadAt] datetime2 NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    [IsDeleted] bit NOT NULL DEFAULT 0,
    [DeletedAt] datetime2 NULL
  );
  CREATE INDEX IX_ChatMessages_RideId ON [ChatMessages]([RideId]);
  CREATE INDEX IX_ChatMessages_RideId_SentAt ON [ChatMessages]([RideId], [SentAt]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
BEGIN
  CREATE TABLE [Notifications] (
    [Id] uniqueidentifier NOT NULL PRIMARY KEY,
    [UserId] uniqueidentifier NOT NULL,
    [Type] int NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Body] nvarchar(1000) NOT NULL,
    [IsRead] bit NOT NULL,
    [ReadAt] datetime2 NULL,
    [RelatedEntityId] uniqueidentifier NULL,
    [LinkUrl] nvarchar(300) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    [IsDeleted] bit NOT NULL DEFAULT 0,
    [DeletedAt] datetime2 NULL
  );
  CREATE INDEX IX_Notifications_User_Read ON [Notifications]([UserId], [IsRead], [CreatedAt]);
END
GO

-- Phase 12: Ratings, Emergency contacts/alerts, User safety columns

IF COL_LENGTH('Users', 'WomenOnlyPreference') IS NULL
  ALTER TABLE Users ADD WomenOnlyPreference bit NOT NULL CONSTRAINT DF_Users_WomenOnly DEFAULT 0;
IF COL_LENGTH('Users', 'AverageRating') IS NULL
  ALTER TABLE Users ADD AverageRating decimal(3,2) NULL;
IF COL_LENGTH('Users', 'RatingCount') IS NULL
  ALTER TABLE Users ADD RatingCount int NOT NULL CONSTRAINT DF_Users_RatingCount DEFAULT 0;
IF COL_LENGTH('Users', 'IsFlaggedForReview') IS NULL
  ALTER TABLE Users ADD IsFlaggedForReview bit NOT NULL CONSTRAINT DF_Users_Flagged DEFAULT 0;
IF COL_LENGTH('Users', 'FlagReason') IS NULL
  ALTER TABLE Users ADD FlagReason nvarchar(500) NULL;
IF COL_LENGTH('Users', 'FlaggedAt') IS NULL
  ALTER TABLE Users ADD FlaggedAt datetime2 NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Ratings')
BEGIN
  CREATE TABLE Ratings (
    Id uniqueidentifier NOT NULL PRIMARY KEY,
    RideId uniqueidentifier NOT NULL,
    FromUserId uniqueidentifier NOT NULL,
    ToUserId uniqueidentifier NOT NULL,
    Stars int NOT NULL,
    Review nvarchar(1000) NULL,
    CreatedAt datetime2 NOT NULL,
    UpdatedAt datetime2 NULL,
    IsDeleted bit NOT NULL DEFAULT 0,
    DeletedAt datetime2 NULL
  );
  CREATE UNIQUE INDEX IX_Ratings_Ride_From_To ON Ratings(RideId, FromUserId, ToUserId) WHERE IsDeleted = 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmergencyContacts')
BEGIN
  CREATE TABLE EmergencyContacts (
    Id uniqueidentifier NOT NULL PRIMARY KEY,
    UserId uniqueidentifier NOT NULL,
    Name nvarchar(120) NOT NULL,
    PhoneNumber nvarchar(30) NOT NULL,
    Relationship nvarchar(80) NULL,
    IsPrimary bit NOT NULL,
    CreatedAt datetime2 NOT NULL,
    UpdatedAt datetime2 NULL,
    IsDeleted bit NOT NULL DEFAULT 0,
    DeletedAt datetime2 NULL
  );
  CREATE INDEX IX_EmergencyContacts_UserId ON EmergencyContacts(UserId);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmergencyAlerts')
BEGIN
  CREATE TABLE EmergencyAlerts (
    Id uniqueidentifier NOT NULL PRIMARY KEY,
    UserId uniqueidentifier NOT NULL,
    RideId uniqueidentifier NOT NULL,
    TriggeredAt datetime2 NOT NULL,
    Latitude float NULL,
    Longitude float NULL,
    Note nvarchar(500) NULL,
    IsResolved bit NOT NULL,
    ResolvedAt datetime2 NULL,
    ResolvedByNote nvarchar(500) NULL,
    CreatedAt datetime2 NOT NULL,
    UpdatedAt datetime2 NULL,
    IsDeleted bit NOT NULL DEFAULT 0,
    DeletedAt datetime2 NULL
  );
  CREATE INDEX IX_EmergencyAlerts_RideId ON EmergencyAlerts(RideId);
END
GO

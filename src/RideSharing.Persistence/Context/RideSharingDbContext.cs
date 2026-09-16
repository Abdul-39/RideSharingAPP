using Microsoft.EntityFrameworkCore;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Context;

public class RideSharingDbContext : DbContext
{
    public RideSharingDbContext(DbContextOptions<RideSharingDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Institution> Institutions => Set<Institution>();
    public DbSet<VehicleType> VehicleTypes => Set<VehicleType>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Route> Routes => Set<Route>();
    public DbSet<RideSchedule> RideSchedules => Set<RideSchedule>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<DriverProfile> DriverProfiles => Set<DriverProfile>();
    public DbSet<RideRequest> RideRequests => Set<RideRequest>();
    public DbSet<RideMatch> RideMatches => Set<RideMatch>();
    public DbSet<Ride> Rides => Set<Ride>();
    public DbSet<RideParticipant> RideParticipants => Set<RideParticipant>();
    public DbSet<RideHistory> RideHistories => Set<RideHistory>();
    public DbSet<UserLocation> UserLocations => Set<UserLocation>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<AppNotification> Notifications => Set<AppNotification>();
    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<EmergencyContact> EmergencyContacts => Set<EmergencyContact>();
    public DbSet<EmergencyAlert> EmergencyAlerts => Set<EmergencyAlert>();

    // Phase 13 — verification
    public DbSet<VerificationRequest> VerificationRequests => Set<VerificationRequest>();
    public DbSet<DriverDocument> DriverDocuments => Set<DriverDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RideSharingDbContext).Assembly);

        var carId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var bikeId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        var vanId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");

        modelBuilder.Entity<VehicleType>().HasData(
            new VehicleType
            {
                Id = carId,
                Name = "Car",
                Description = "Standard car",
                DefaultSeatingCapacity = 4,
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new VehicleType
            {
                Id = bikeId,
                Name = "Bike",
                Description = "Motorcycle / bike",
                DefaultSeatingCapacity = 1,
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new VehicleType
            {
                Id = vanId,
                Name = "Van",
                Description = "Van / minibus",
                DefaultSeatingCapacity = 8,
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<Domain.Common.BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
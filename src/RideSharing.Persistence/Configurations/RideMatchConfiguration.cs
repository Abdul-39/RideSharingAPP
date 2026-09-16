using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class RideMatchConfiguration : IEntityTypeConfiguration<RideMatch>
{
    public void Configure(EntityTypeBuilder<RideMatch> builder)
    {
        builder.ToTable("RideMatches");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.MatchScore).HasPrecision(8, 4);
        builder.Property(m => m.ScoreBreakdown).HasMaxLength(1000);
        builder.Property(m => m.Status).HasConversion<int>();

        builder.HasIndex(m => m.RideRequestId);
        builder.HasIndex(m => m.MatchedUserId);

        // Unique only among non-deleted rows (allows re-run matching after soft-delete)
        builder.HasIndex(m => new { m.RideRequestId, m.MatchedUserId })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");

        builder.HasOne(m => m.RideRequest)
            .WithMany(r => r.Matches)
            .HasForeignKey(m => m.RideRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.MatchedUser)
            .WithMany()
            .HasForeignKey(m => m.MatchedUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Vehicle)
            .WithMany()
            .HasForeignKey(m => m.VehicleId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(m => m.MatchedRoute)
            .WithMany()
            .HasForeignKey(m => m.MatchedRouteId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasQueryFilter(m => !m.IsDeleted);
    }
}

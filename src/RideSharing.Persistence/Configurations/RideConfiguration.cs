using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;
namespace RideSharing.Persistence.Configurations;
public class RideConfiguration : IEntityTypeConfiguration<Ride>
{
    public void Configure(EntityTypeBuilder<Ride> builder)
    {
        builder.ToTable("Rides");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Status).HasConversion<int>();
        builder.Property(r => r.CancellationReason).HasMaxLength(500);
        builder.Property(r => r.Notes).HasMaxLength(500);
        builder.Property(r => r.FareAmount).HasPrecision(18, 2);
        builder.HasIndex(r => r.Status);
        builder.HasOne(r => r.RideRequest).WithMany().HasForeignKey(r => r.RideRequestId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(r => r.RideMatch).WithMany().HasForeignKey(r => r.RideMatchId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(r => r.Route).WithMany().HasForeignKey(r => r.RouteId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(r => r.Vehicle).WithMany().HasForeignKey(r => r.VehicleId).OnDelete(DeleteBehavior.SetNull);
        builder.HasQueryFilter(r => !r.IsDeleted);
    }
}
public class RideParticipantConfiguration : IEntityTypeConfiguration<RideParticipant>
{
    public void Configure(EntityTypeBuilder<RideParticipant> builder)
    {
        builder.ToTable("RideParticipants");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Role).HasConversion<int>();
        builder.HasIndex(p => new { p.RideId, p.UserId }).IsUnique();
        builder.HasOne(p => p.Ride).WithMany(r => r.Participants).HasForeignKey(p => p.RideId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(p => !p.IsDeleted);
    }
}
public class RideHistoryConfiguration : IEntityTypeConfiguration<RideHistory>
{
    public void Configure(EntityTypeBuilder<RideHistory> builder)
    {
        builder.ToTable("RideHistories");
        builder.HasKey(h => h.Id);
        builder.Property(h => h.FromStatus).HasConversion<int>();
        builder.Property(h => h.ToStatus).HasConversion<int>();
        builder.Property(h => h.Note).HasMaxLength(500);
        builder.HasOne(h => h.Ride).WithMany(r => r.History).HasForeignKey(h => h.RideId).OnDelete(DeleteBehavior.Cascade);
        // No soft-delete query filter — avoids concurrency on history inserts
    }
}

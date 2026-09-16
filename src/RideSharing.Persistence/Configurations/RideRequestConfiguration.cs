using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class RideRequestConfiguration : IEntityTypeConfiguration<RideRequest>
{
    public void Configure(EntityTypeBuilder<RideRequest> builder)
    {
        builder.ToTable("RideRequests");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.SeatsNeeded).IsRequired();
        builder.Property(r => r.TimeToleranceMinutes).HasDefaultValue(15);
        builder.Property(r => r.GenderPreference).HasConversion<int>();
        builder.Property(r => r.Status).HasConversion<int>();
        builder.Property(r => r.Notes).HasMaxLength(500);

        builder.HasIndex(r => r.UserId);
        builder.HasIndex(r => r.TravelDate);
        builder.HasIndex(r => r.Status);

        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Route)
            .WithMany()
            .HasForeignKey(r => r.RouteId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(r => !r.IsDeleted);
    }
}

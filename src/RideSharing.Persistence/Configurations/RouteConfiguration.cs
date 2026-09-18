using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class RouteConfiguration : IEntityTypeConfiguration<Route>
{
    public void Configure(EntityTypeBuilder<Route> builder)
    {
        builder.ToTable("Routes");

        builder.HasKey(r => r.Id);

        // GPS coordinates – high precision
        builder.Property(r => r.SourceLatitude)
            .HasPrecision(9, 6)
            .IsRequired();

        builder.Property(r => r.SourceLongitude)
            .HasPrecision(9, 6)
            .IsRequired();

        builder.Property(r => r.DestinationLatitude)
            .HasPrecision(9, 6)
            .IsRequired();

        builder.Property(r => r.RoutePolylineJson).HasColumnType("nvarchar(max)");
        builder.Property(r => r.DistanceKm);
        builder.Property(r => r.DurationMinutes);

    builder.Property(r => r.DestinationLongitude)
            .HasPrecision(9, 6)
            .IsRequired();

        builder.Property(r => r.SourceAddress)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(r => r.DestinationAddress)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(r => r.PreferredDepartureTime)
            .IsRequired();

        builder.Property(r => r.MaximumTimeToleranceMinutes)
            .HasDefaultValue(15);

        builder.Property(r => r.IsActive)
            .HasDefaultValue(true);

        // Indexes for matching queries
        builder.HasIndex(r => r.UserId);
        builder.HasIndex(r => r.PreferredDepartureTime);
        builder.HasIndex(r => new { r.SourceLatitude, r.SourceLongitude });
        builder.HasIndex(r => new { r.DestinationLatitude, r.DestinationLongitude });

        // Relationship
        builder.HasOne(r => r.User)
            .WithMany(u => u.Routes)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(r => !r.IsDeleted);
    }
}

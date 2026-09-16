using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class VehicleConfiguration : IEntityTypeConfiguration<Vehicle>
{
    public void Configure(EntityTypeBuilder<Vehicle> builder)
    {
        builder.ToTable("Vehicles");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.Make)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(v => v.Model)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(v => v.RegistrationNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(v => v.RegistrationNumber)
            .IsUnique();

        builder.Property(v => v.Color)
            .HasMaxLength(50);

        builder.Property(v => v.SeatingCapacity)
            .IsRequired();

        builder.Property(v => v.IsActive)
            .HasDefaultValue(true);

        // Relationships
        builder.HasOne(v => v.Driver)
            .WithMany(u => u.Vehicles)
            .HasForeignKey(v => v.DriverId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(v => v.VehicleType)
            .WithMany(vt => vt.Vehicles)
            .HasForeignKey(v => v.VehicleTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(v => !v.IsDeleted);
    }
}

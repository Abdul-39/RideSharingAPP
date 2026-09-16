using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class VehicleTypeConfiguration : IEntityTypeConfiguration<VehicleType>
{
    public void Configure(EntityTypeBuilder<VehicleType> builder)
    {
        builder.ToTable("VehicleTypes");

        builder.HasKey(vt => vt.Id);

        builder.Property(vt => vt.Name)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(vt => vt.Name)
            .IsUnique();

        builder.Property(vt => vt.Description)
            .HasMaxLength(250);

        builder.Property(vt => vt.DefaultSeatingCapacity)
            .IsRequired();

        builder.HasQueryFilter(vt => !vt.IsDeleted);
    }
}

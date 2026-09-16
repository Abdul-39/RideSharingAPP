using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class DriverProfileConfiguration : IEntityTypeConfiguration<DriverProfile>
{
    public void Configure(EntityTypeBuilder<DriverProfile> builder)
    {
        builder.ToTable("DriverProfiles");
        builder.HasKey(d => d.Id);

        builder.HasIndex(d => d.UserId).IsUnique();
        builder.Property(d => d.LicenseNumber).HasMaxLength(50);
        builder.Property(d => d.Notes).HasMaxLength(500);
        builder.Property(d => d.VerificationStatus).HasConversion<int>();
        builder.Property(d => d.IsAvailable).HasDefaultValue(true);

        builder.HasOne(d => d.User)
            .WithOne()
            .HasForeignKey<DriverProfile>(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(d => !d.IsDeleted);
    }
}

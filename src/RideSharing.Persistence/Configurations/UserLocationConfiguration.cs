using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class UserLocationConfiguration : IEntityTypeConfiguration<UserLocation>
{
    public void Configure(EntityTypeBuilder<UserLocation> builder)
    {
        builder.ToTable("UserLocations");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Latitude).HasPrecision(9, 6);
        builder.Property(x => x.Longitude).HasPrecision(9, 6);
        builder.Property(x => x.Label).HasMaxLength(200);
        builder.Property(x => x.ShareMode).HasConversion<int>();

        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => new { x.UserId, x.IsCurrent });
        builder.HasIndex(x => x.RecordedAt);

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}

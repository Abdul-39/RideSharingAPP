using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class RatingConfiguration : IEntityTypeConfiguration<Rating>
{
    public void Configure(EntityTypeBuilder<Rating> builder)
    {
        builder.ToTable("Ratings");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Stars).IsRequired();
        builder.Property(x => x.Review).HasMaxLength(1000);
        builder.HasIndex(x => new { x.RideId, x.FromUserId, x.ToUserId }).IsUnique();
        builder.HasIndex(x => x.ToUserId);
        builder.HasOne(x => x.Ride).WithMany().HasForeignKey(x => x.RideId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.FromUser).WithMany().HasForeignKey(x => x.FromUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ToUser).WithMany().HasForeignKey(x => x.ToUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}

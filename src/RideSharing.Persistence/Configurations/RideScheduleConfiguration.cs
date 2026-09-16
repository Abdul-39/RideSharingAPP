using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class RideScheduleConfiguration : IEntityTypeConfiguration<RideSchedule>
{
    public void Configure(EntityTypeBuilder<RideSchedule> builder)
    {
        builder.ToTable("RideSchedules");

        builder.HasKey(rs => rs.Id);

        builder.Property(rs => rs.IsActive)
            .HasDefaultValue(true);

        // Relationships
        builder.HasOne(rs => rs.User)
            .WithMany(u => u.RideSchedules)
            .HasForeignKey(rs => rs.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(rs => rs.Route)
            .WithMany(r => r.RideSchedules)
            .HasForeignKey(rs => rs.RouteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(rs => rs.UserId);
        builder.HasIndex(rs => rs.RouteId);

        builder.HasQueryFilter(rs => !rs.IsDeleted);
    }
}

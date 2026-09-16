using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class EmergencyAlertConfiguration : IEntityTypeConfiguration<EmergencyAlert>
{
    public void Configure(EntityTypeBuilder<EmergencyAlert> builder)
    {
        builder.ToTable("EmergencyAlerts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.ResolvedByNote).HasMaxLength(500);
        builder.HasIndex(x => x.RideId);
        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => x.TriggeredAt);
        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Ride).WithMany().HasForeignKey(x => x.RideId).OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.BaseFare).HasPrecision(18, 2);
        builder.Property(x => x.DistanceKm).HasPrecision(18, 3);
        builder.Property(x => x.DistanceFare).HasPrecision(18, 2);
        builder.Property(x => x.SharedFare).HasPrecision(18, 2);
        builder.Property(x => x.Currency).HasMaxLength(3);
        builder.Property(x => x.Method).HasConversion<int>();
        builder.Property(x => x.Status).HasConversion<int>();
        builder.Property(x => x.ProviderReference).HasMaxLength(100);
        builder.Property(x => x.FailureReason).HasMaxLength(500);
        builder.HasIndex(x => x.RideId);
        builder.HasIndex(x => x.PayerUserId);
        builder.HasIndex(x => x.Status);
        builder.HasOne(x => x.Ride).WithMany().HasForeignKey(x => x.RideId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Payer).WithMany().HasForeignKey(x => x.PayerUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Payee).WithMany().HasForeignKey(x => x.PayeeUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}

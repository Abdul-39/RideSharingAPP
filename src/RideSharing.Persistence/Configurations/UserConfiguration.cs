using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(u => u.LastName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.PhoneNumber)
            .HasMaxLength(20);

        builder.HasIndex(u => u.PhoneNumber);

        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(u => u.ProfileImageUrl)
            .HasMaxLength(500);

        builder.Property(u => u.Gender)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(u => u.IsVerified)
            .HasDefaultValue(false);

        builder.Property(u => u.IsActive)
            .HasDefaultValue(true);

        // Soft delete filter
        builder.Property(x => x.FlagReason).HasMaxLength(500);
        builder.Property(x => x.AverageRating).HasPrecision(3, 2);
        builder.HasQueryFilter(u => !u.IsDeleted);

        // Relationships
        builder.HasOne(u => u.Institution)
            .WithMany(i => i.Users)
            .HasForeignKey(u => u.InstitutionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

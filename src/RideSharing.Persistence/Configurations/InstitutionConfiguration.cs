using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class InstitutionConfiguration : IEntityTypeConfiguration<Institution>
{
    public void Configure(EntityTypeBuilder<Institution> builder)
    {
        builder.ToTable("Institutions");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(i => i.Name);

        builder.Property(i => i.Type)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(i => i.Address)
            .HasMaxLength(500);

        builder.Property(i => i.VerificationStatus)
            .HasConversion<int>()
            .HasDefaultValue(Domain.Enums.VerificationStatus.Pending);

        builder.HasQueryFilter(i => !i.IsDeleted);
    }
}

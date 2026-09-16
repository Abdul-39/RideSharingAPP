using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class VerificationRequestConfiguration : IEntityTypeConfiguration<VerificationRequest>
{
    public void Configure(EntityTypeBuilder<VerificationRequest> b)
    {
        b.ToTable("VerificationRequests");
        b.HasKey(x => x.Id);
        b.Property(x => x.StudentOrEmployeeId).HasMaxLength(64);
        b.Property(x => x.CnicLast4).HasMaxLength(4);
        b.Property(x => x.CnicEncryptedOrPlain).HasMaxLength(32);
        b.Property(x => x.ApplicantNote).HasMaxLength(500);
        b.Property(x => x.AdminNote).HasMaxLength(500);
        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Institution).WithMany().HasForeignKey(x => x.InstitutionId).OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(x => x.UserId);
        b.HasIndex(x => x.Status);
    }
}

public class DriverDocumentConfiguration : IEntityTypeConfiguration<DriverDocument>
{
    public void Configure(EntityTypeBuilder<DriverDocument> b)
    {
        b.ToTable("DriverDocuments");
        b.HasKey(x => x.Id);
        b.Property(x => x.FileName).HasMaxLength(260);
        b.Property(x => x.StoragePath).HasMaxLength(500);
        b.Property(x => x.ContentType).HasMaxLength(100);
        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.VerificationRequest).WithMany(r => r.Documents).HasForeignKey(x => x.VerificationRequestId)
            .OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(x => x.UserId);
    }
}

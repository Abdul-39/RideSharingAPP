using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RideSharing.Domain.Entities;

namespace RideSharing.Persistence.Configurations;

public class WalletTransactionConfiguration : IEntityTypeConfiguration<WalletTransaction>
{
    public void Configure(EntityTypeBuilder<WalletTransaction> builder)
    {
        builder.ToTable("WalletTransactions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.BalanceAfter).HasPrecision(18, 2);
        builder.Property(x => x.Type).HasConversion<int>();
        builder.Property(x => x.Description).HasMaxLength(300);
        builder.HasIndex(x => x.WalletId);
        builder.HasIndex(x => x.CreatedAt);
        builder.HasOne(x => x.Wallet).WithMany(w => w.Transactions).HasForeignKey(x => x.WalletId).OnDelete(DeleteBehavior.Cascade);
        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}

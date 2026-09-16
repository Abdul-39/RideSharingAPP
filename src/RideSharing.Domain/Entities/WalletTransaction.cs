using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

public class WalletTransaction : BaseEntity
{
    public Guid WalletId { get; set; }
    public Wallet Wallet { get; set; } = null!;
    public WalletTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? Description { get; set; }
    public Guid? RelatedPaymentId { get; set; }
    public Guid? RelatedRideId { get; set; }
}

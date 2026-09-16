using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

public class Wallet : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "PKR";
    public bool IsActive { get; set; } = true;
    public ICollection<WalletTransaction> Transactions { get; set; } = new List<WalletTransaction>();
}

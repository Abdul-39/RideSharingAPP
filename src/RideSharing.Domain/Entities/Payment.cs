using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

public class Payment : BaseEntity
{
    public Guid RideId { get; set; }
    public Ride Ride { get; set; } = null!;
    public Guid PayerUserId { get; set; }
    public User Payer { get; set; } = null!;
    public Guid? PayeeUserId { get; set; }
    public User? Payee { get; set; }

    public PaymentMethodType Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "PKR";

    public decimal BaseFare { get; set; }
    public decimal DistanceKm { get; set; }
    public decimal DistanceFare { get; set; }
    public int ParticipantCount { get; set; }
    public decimal SharedFare { get; set; }

    public string? ProviderReference { get; set; }
    public string? FailureReason { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? RefundedAt { get; set; }
}

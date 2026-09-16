namespace RideSharing.Application.DTOs.Payments;

public class WalletDto
{
    public Guid Id { get; set; }
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "PKR";
    public bool IsActive { get; set; }
}

public class WalletTransactionDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? Description { get; set; }
    public Guid? RelatedRideId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DepositRequest
{
    public decimal Amount { get; set; }
    public string? Note { get; set; }
}

public class FareBreakdownDto
{
    public decimal BaseFare { get; set; }
    public decimal DistanceKm { get; set; }
    public decimal DistanceFare { get; set; }
    public int ParticipantCount { get; set; }
    public decimal TotalFare { get; set; }
    public decimal SharedFarePerPassenger { get; set; }
    public string Currency { get; set; } = "PKR";
}

public class PaymentDto
{
    public Guid Id { get; set; }
    public Guid RideId { get; set; }
    public Guid PayerUserId { get; set; }
    public Guid? PayeeUserId { get; set; }
    public string Method { get; set; } = "";
    public string Status { get; set; } = "";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "PKR";
    public decimal BaseFare { get; set; }
    public decimal DistanceKm { get; set; }
    public decimal DistanceFare { get; set; }
    public int ParticipantCount { get; set; }
    public decimal SharedFare { get; set; }
    public string? FailureReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class CreatePaymentRequest
{
    public Guid RideId { get; set; }
    /// <summary>Cash | MockWallet</summary>
    public string Method { get; set; } = "Cash";
}

public class FareSettings
{
    public decimal BaseFare { get; set; } = 50m;
    public decimal PerKmRate { get; set; } = 15m;
    public string Currency { get; set; } = "PKR";
}

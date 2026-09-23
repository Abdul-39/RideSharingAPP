using RideSharing.Application.Interfaces;
using RideSharing.Domain.Enums;

namespace RideSharing.Infrastructure.Payment;

/// <summary>
/// Simulated JazzCash provider (free FYP mode).
/// Real merchant HTTP calls can replace ProcessAsync later when keys exist.
/// </summary>
public class JazzCashPaymentProvider : IPaymentProvider
{
  public PaymentMethodType Method => PaymentMethodType.JazzCash;

  public Task<(bool Success, string? Reference, string? Error)> ProcessAsync(
      Guid paymentId, Guid payerUserId, Guid? payeeUserId, decimal amount, CancellationToken ct = default)
  {
    // Simulation success after OTP was verified by PaymentService
    var reference = $"JC-{DateTime.UtcNow:yyyyMMddHHmmss}-{paymentId.ToString("N")[..8].ToUpperInvariant()}";
    return Task.FromResult<(bool, string?, string?)>((true, reference, null));
  }
}

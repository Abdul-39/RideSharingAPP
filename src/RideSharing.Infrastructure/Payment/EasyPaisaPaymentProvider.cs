using RideSharing.Application.Interfaces;
using RideSharing.Domain.Enums;

namespace RideSharing.Infrastructure.Payment;

/// <summary>
/// Simulated EasyPaisa provider (free FYP mode).
/// </summary>
public class EasyPaisaPaymentProvider : IPaymentProvider
{
  public PaymentMethodType Method => PaymentMethodType.EasyPaisa;

  public Task<(bool Success, string? Reference, string? Error)> ProcessAsync(
      Guid paymentId, Guid payerUserId, Guid? payeeUserId, decimal amount, CancellationToken ct = default)
  {
    var reference = $"EP-{DateTime.UtcNow:yyyyMMddHHmmss}-{paymentId.ToString("N")[..8].ToUpperInvariant()}";
    return Task.FromResult<(bool, string?, string?)>((true, reference, null));
  }
}

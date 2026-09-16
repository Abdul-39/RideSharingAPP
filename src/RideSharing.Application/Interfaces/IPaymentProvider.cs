using RideSharing.Domain.Enums;

namespace RideSharing.Application.Interfaces;

/// <summary>
/// Provider-specific payment execution (Cash, MockWallet, future JazzCash…).
/// Ride logic depends on IPaymentService, not on concrete providers.
/// </summary>
public interface IPaymentProvider
{
    PaymentMethodType Method { get; }
    Task<(bool Success, string? Reference, string? Error)> ProcessAsync(
        Guid paymentId,
        Guid payerUserId,
        Guid? payeeUserId,
        decimal amount,
        CancellationToken ct = default);
}

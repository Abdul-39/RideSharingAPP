using RideSharing.Application.Interfaces;
using RideSharing.Domain.Enums;

namespace RideSharing.Infrastructure.Payment;

/// <summary>Cash is settled offline; marking completed is confirmation-only.</summary>
public class CashPaymentProvider : IPaymentProvider
{
    public PaymentMethodType Method => PaymentMethodType.Cash;

    public Task<(bool Success, string? Reference, string? Error)> ProcessAsync(
        Guid paymentId, Guid payerUserId, Guid? payeeUserId, decimal amount, CancellationToken ct = default)
        => Task.FromResult<(bool, string?, string?)>((true, $"CASH-{paymentId:N}"[..20], null));
}

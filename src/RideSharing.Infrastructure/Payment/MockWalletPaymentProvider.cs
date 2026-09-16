using RideSharing.Application.Interfaces;
using RideSharing.Domain.Enums;

namespace RideSharing.Infrastructure.Payment;

public class MockWalletPaymentProvider : IPaymentProvider
{
    private readonly IWalletService _wallets;
    public MockWalletPaymentProvider(IWalletService wallets) => _wallets = wallets;
    public PaymentMethodType Method => PaymentMethodType.MockWallet;

    public async Task<(bool Success, string? Reference, string? Error)> ProcessAsync(
        Guid paymentId, Guid payerUserId, Guid? payeeUserId, decimal amount, CancellationToken ct = default)
    {
        var (ok, err) = await _wallets.DebitForPaymentAsync(payerUserId, amount, paymentId, Guid.Empty, ct);
        if (!ok) return (false, null, err ?? "Wallet debit failed");
        if (payeeUserId.HasValue)
            await _wallets.CreditRefundAsync(payeeUserId.Value, amount, paymentId, Guid.Empty, ct);
        return (true, $"WALLET-{paymentId:N}"[..24], null);
    }
}

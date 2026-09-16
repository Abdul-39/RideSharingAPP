using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Payments;

namespace RideSharing.Application.Interfaces;

public interface IWalletService
{
    Task<ApiResponse<WalletDto>> GetOrCreateAsync(Guid userId);
    Task<ApiResponse<WalletDto>> DepositAsync(Guid userId, DepositRequest request);
    Task<ApiResponse<List<WalletTransactionDto>>> GetTransactionsAsync(Guid userId, int take = 50);
    Task<(bool Ok, string? Error)> DebitForPaymentAsync(Guid userId, decimal amount, Guid paymentId, Guid rideId, CancellationToken ct = default);
    Task CreditRefundAsync(Guid userId, decimal amount, Guid paymentId, Guid rideId, CancellationToken ct = default);
}

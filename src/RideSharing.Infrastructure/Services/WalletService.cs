using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Payments;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class WalletService : IWalletService
{
    private readonly RideSharingDbContext _db;
    public WalletService(RideSharingDbContext db) => _db = db;

    public async Task<ApiResponse<WalletDto>> GetOrCreateAsync(Guid userId)
    {
        var w = await GetOrCreateEntityAsync(userId);
        return ApiResponse<WalletDto>.SuccessResponse(Map(w));
    }

    public async Task<ApiResponse<WalletDto>> DepositAsync(Guid userId, DepositRequest request)
    {
        if (request.Amount <= 0 || request.Amount > 100_000)
            return ApiResponse<WalletDto>.FailureResponse("Deposit amount must be between 1 and 100000.");

        var w = await GetOrCreateEntityAsync(userId);
        w.Balance += request.Amount;
        w.UpdatedAt = DateTime.UtcNow;
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Id = Guid.NewGuid(),
            WalletId = w.Id,
            Type = WalletTransactionType.Deposit,
            Amount = request.Amount,
            BalanceAfter = w.Balance,
            Description = request.Note ?? "Mock wallet deposit",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return ApiResponse<WalletDto>.SuccessResponse(Map(w), "Deposit successful.");
    }

    public async Task<ApiResponse<List<WalletTransactionDto>>> GetTransactionsAsync(Guid userId, int take = 50)
    {
        var w = await _db.Wallets.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);
        if (w == null) return ApiResponse<List<WalletTransactionDto>>.SuccessResponse(new());

        var list = await _db.WalletTransactions.AsNoTracking()
            .Where(t => t.WalletId == w.Id)
            .OrderByDescending(t => t.CreatedAt)
            .Take(Math.Clamp(take, 1, 100))
            .ToListAsync();

        return ApiResponse<List<WalletTransactionDto>>.SuccessResponse(list.Select(t => new WalletTransactionDto
        {
            Id = t.Id,
            Type = t.Type.ToString(),
            Amount = t.Amount,
            BalanceAfter = t.BalanceAfter,
            Description = t.Description,
            RelatedRideId = t.RelatedRideId,
            CreatedAt = t.CreatedAt
        }).ToList());
    }

    public async Task<(bool Ok, string? Error)> DebitForPaymentAsync(Guid userId, decimal amount, Guid paymentId, Guid rideId, CancellationToken ct = default)
    {
        var w = await GetOrCreateEntityAsync(userId);
        if (w.Balance < amount)
            return (false, $"Insufficient wallet balance. Need {amount:0.00}, have {w.Balance:0.00}.");
        w.Balance -= amount;
        w.UpdatedAt = DateTime.UtcNow;
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Id = Guid.NewGuid(),
            WalletId = w.Id,
            Type = WalletTransactionType.Payment,
            Amount = -amount,
            BalanceAfter = w.Balance,
            Description = "Ride payment",
            RelatedPaymentId = paymentId,
            RelatedRideId = rideId == Guid.Empty ? null : rideId,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }

    public async Task CreditRefundAsync(Guid userId, decimal amount, Guid paymentId, Guid rideId, CancellationToken ct = default)
    {
        var w = await GetOrCreateEntityAsync(userId);
        w.Balance += amount;
        w.UpdatedAt = DateTime.UtcNow;
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Id = Guid.NewGuid(),
            WalletId = w.Id,
            Type = WalletTransactionType.Refund,
            Amount = amount,
            BalanceAfter = w.Balance,
            Description = "Ride payment credit / refund",
            RelatedPaymentId = paymentId,
            RelatedRideId = rideId == Guid.Empty ? null : rideId,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
    }

    private async Task<Wallet> GetOrCreateEntityAsync(Guid userId)
    {
        var w = await _db.Wallets.FirstOrDefaultAsync(x => x.UserId == userId);
        if (w != null) return w;
        w = new Wallet
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Balance = 0,
            Currency = "PKR",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Wallets.Add(w);
        await _db.SaveChangesAsync();
        return w;
    }

    private static WalletDto Map(Wallet w) => new()
    {
        Id = w.Id, Balance = w.Balance, Currency = w.Currency, IsActive = w.IsActive
    };
}

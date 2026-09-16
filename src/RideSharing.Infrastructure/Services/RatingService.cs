using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Ratings;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class RatingService : IRatingService
{
    private readonly RideSharingDbContext _db;
    private readonly INotificationService _notifications;
    private readonly decimal _lowRatingThreshold;

    public RatingService(RideSharingDbContext db, INotificationService notifications, IConfiguration config)
    {
        _db = db;
        _notifications = notifications;
        _lowRatingThreshold = config.GetValue("RatingSettings:LowRatingThreshold", 2.5m);
    }

    public async Task<ApiResponse<RatingDto>> SubmitAsync(Guid fromUserId, SubmitRatingRequest request)
    {
        if (request.Stars is < 1 or > 5)
            return ApiResponse<RatingDto>.FailureResponse("Stars must be between 1 and 5.");
        if (request.ToUserId == fromUserId)
            return ApiResponse<RatingDto>.FailureResponse("Cannot rate yourself.");

        var ride = await _db.Rides.Include(r => r.Participants)
            .FirstOrDefaultAsync(r => r.Id == request.RideId && !r.IsDeleted);
        if (ride == null) return ApiResponse<RatingDto>.FailureResponse("Ride not found.");
        if (ride.Status != RideStatus.Completed)
            return ApiResponse<RatingDto>.FailureResponse("You can only rate after the ride is completed.");

        var parts = ride.Participants.Where(p => !p.IsDeleted).ToList();
        if (!parts.Any(p => p.UserId == fromUserId) || !parts.Any(p => p.UserId == request.ToUserId))
            return ApiResponse<RatingDto>.FailureResponse("Both users must be participants of this ride.");

        var exists = await _db.Ratings.AnyAsync(r =>
            r.RideId == request.RideId && r.FromUserId == fromUserId && r.ToUserId == request.ToUserId);
        if (exists)
            return ApiResponse<RatingDto>.FailureResponse("You already rated this user for this ride.");

        var entity = new Rating
        {
            Id = Guid.NewGuid(),
            RideId = request.RideId,
            FromUserId = fromUserId,
            ToUserId = request.ToUserId,
            Stars = request.Stars,
            Review = string.IsNullOrWhiteSpace(request.Review) ? null : request.Review.Trim()[..Math.Min(request.Review.Trim().Length, 1000)],
            CreatedAt = DateTime.UtcNow
        };
        _db.Ratings.Add(entity);

        var target = await _db.Users.FirstAsync(u => u.Id == request.ToUserId);
        var prevCount = target.RatingCount;
        var prevAvg = target.AverageRating ?? 0m;
        var newCount = prevCount + 1;
        var newAvg = Math.Round(((prevAvg * prevCount) + request.Stars) / newCount, 2);
        target.RatingCount = newCount;
        target.AverageRating = newAvg;
        target.UpdatedAt = DateTime.UtcNow;

        // Flag for review only — never auto-ban
        if (newAvg < _lowRatingThreshold && newCount >= 3)
        {
            target.IsFlaggedForReview = true;
            target.FlagReason = $"Average rating {newAvg} below threshold {_lowRatingThreshold} after {newCount} ratings.";
            target.FlaggedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        await _notifications.CreateForUserAsync(
            request.ToUserId,
            NotificationType.RatingReminder,
            "New rating received",
            $"You received {request.Stars} star(s).",
            request.RideId,
            $"/app/rides/{request.RideId}");

        return ApiResponse<RatingDto>.SuccessResponse(Map(entity), "Rating submitted.");
    }

    public async Task<ApiResponse<List<RatingDto>>> GetForRideAsync(Guid rideId, Guid userId)
    {
        var isPart = await _db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == userId && !p.IsDeleted);
        if (!isPart) return ApiResponse<List<RatingDto>>.FailureResponse("Not allowed.");

        var list = await _db.Ratings.AsNoTracking()
            .Where(r => r.RideId == rideId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
        return ApiResponse<List<RatingDto>>.SuccessResponse(list.Select(Map).ToList());
    }

    public async Task<ApiResponse<bool>> HasRatedAsync(Guid rideId, Guid fromUserId, Guid toUserId)
    {
        var has = await _db.Ratings.AnyAsync(r =>
            r.RideId == rideId && r.FromUserId == fromUserId && r.ToUserId == toUserId);
        return ApiResponse<bool>.SuccessResponse(has);
    }

    private static RatingDto Map(Rating r) => new()
    {
        Id = r.Id, RideId = r.RideId, FromUserId = r.FromUserId, ToUserId = r.ToUserId,
        Stars = r.Stars, Review = r.Review, CreatedAt = r.CreatedAt
    };
}

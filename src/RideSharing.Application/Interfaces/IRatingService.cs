using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Ratings;

namespace RideSharing.Application.Interfaces;

public interface IRatingService
{
    Task<ApiResponse<RatingDto>> SubmitAsync(Guid fromUserId, SubmitRatingRequest request);
    Task<ApiResponse<List<RatingDto>>> GetForRideAsync(Guid rideId, Guid userId);
    Task<ApiResponse<bool>> HasRatedAsync(Guid rideId, Guid fromUserId, Guid toUserId);
}

using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Rides;

namespace RideSharing.Application.Interfaces;

public interface IRideRequestService
{
    Task<ApiResponse<RideRequestDto>> CreateAsync(Guid userId, CreateRideRequestDto request);
    Task<ApiResponse<List<RideRequestDto>>> GetMyAsync(Guid userId);
    Task<ApiResponse<RideRequestDto>> GetByIdAsync(Guid id, Guid userId, bool isAdmin);
    Task<ApiResponse> CancelAsync(Guid id, Guid userId);
    Task<ApiResponse<List<MatchResultDto>>> RunMatchingAsync(Guid requestId, Guid userId);
    Task<ApiResponse<List<MatchResultDto>>> GetMatchesAsync(Guid requestId, Guid userId);
    Task<ApiResponse> RespondToMatchAsync(Guid matchId, Guid userId, bool accept);
}

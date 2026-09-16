using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Rides;
namespace RideSharing.Application.Interfaces;
public interface IRideService
{
    Task<ApiResponse<RideDto>> CreateFromMatchAsync(Guid userId, Guid matchId);
    Task<ApiResponse<List<RideDto>>> GetMyRidesAsync(Guid userId, string? filter = null);
    Task<ApiResponse<RideDto>> GetByIdAsync(Guid id, Guid userId, bool isAdmin);
    Task<ApiResponse<RideDto>> ConfirmAsync(Guid id, Guid userId);
    Task<ApiResponse<RideDto>> MarkDriverArrivingAsync(Guid id, Guid userId);
    Task<ApiResponse<RideDto>> MarkDriverArrivedAsync(Guid id, Guid userId);
    Task<ApiResponse<RideDto>> StartAsync(Guid id, Guid userId);
    Task<ApiResponse<RideDto>> CompleteAsync(Guid id, Guid userId);
    Task<ApiResponse<RideDto>> CancelAsync(Guid id, Guid userId, string? reason);
}

using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Drivers;

namespace RideSharing.Application.Interfaces;

public interface IDriverService
{
    Task<ApiResponse<DriverProfileDto>> GetMyDriverProfileAsync(Guid userId);
    Task<ApiResponse<DriverProfileDto>> UpsertMyDriverProfileAsync(Guid userId, UpdateDriverProfileRequest request);
}

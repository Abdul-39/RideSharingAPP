using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Users;

namespace RideSharing.Application.Interfaces;

public interface IUserService
{
    Task<ApiResponse<UserProfileDto>> GetMyProfileAsync(Guid userId);
    Task<ApiResponse<UserProfileDto>> UpdateMyProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<ApiResponse<UserProfileDto>> UpdateProfileImageAsync(Guid userId, string imageUrl);
}

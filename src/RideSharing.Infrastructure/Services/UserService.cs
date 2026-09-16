using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Users;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly RideSharingDbContext _db;

    public UserService(RideSharingDbContext db) => _db = db;

    public async Task<ApiResponse<UserProfileDto>> GetMyProfileAsync(Guid userId)
    {
        var user = await _db.Users
            .Include(u => u.Institution)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null)
            return ApiResponse<UserProfileDto>.FailureResponse("User not found.");

        return ApiResponse<UserProfileDto>.SuccessResponse(Map(user));
    }

    public async Task<ApiResponse<UserProfileDto>> UpdateMyProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _db.Users
            .Include(u => u.Institution)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null)
            return ApiResponse<UserProfileDto>.FailureResponse("User not found.");

        if (request.InstitutionId.HasValue)
        {
            var exists = await _db.Institutions.AnyAsync(i => i.Id == request.InstitutionId.Value && !i.IsDeleted);
            if (!exists)
                return ApiResponse<UserProfileDto>.FailureResponse("Institution not found.");
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.PhoneNumber = request.PhoneNumber;
        user.Gender = (Gender)request.Gender;
        user.DateOfBirth = request.DateOfBirth;
        user.InstitutionId = request.InstitutionId;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // reload institution name
        if (user.InstitutionId.HasValue)
            await _db.Entry(user).Reference(u => u.Institution).LoadAsync();

        return ApiResponse<UserProfileDto>.SuccessResponse(Map(user), "Profile updated.");
    }

    public async Task<ApiResponse<UserProfileDto>> UpdateProfileImageAsync(Guid userId, string imageUrl)
    {
        var user = await _db.Users
            .Include(u => u.Institution)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null)
            return ApiResponse<UserProfileDto>.FailureResponse("User not found.");

        user.ProfileImageUrl = imageUrl;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponse<UserProfileDto>.SuccessResponse(Map(user), "Profile image updated.");
    }

    private static UserProfileDto Map(Domain.Entities.User user) => new()
    {
        Id = user.Id,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        PhoneNumber = user.PhoneNumber,
        Gender = user.Gender.ToString(),
        DateOfBirth = user.DateOfBirth,
        ProfileImageUrl = user.ProfileImageUrl,
        IsVerified = user.IsVerified,
        IsActive = user.IsActive,
        InstitutionId = user.InstitutionId,
        InstitutionName = user.Institution?.Name,
        Roles = user.UserRoles?.Select(ur => ur.Role.Name).ToList() ?? new()
    };
}

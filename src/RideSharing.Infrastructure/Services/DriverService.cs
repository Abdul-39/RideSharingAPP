using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Drivers;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class DriverService : IDriverService
{
    private readonly RideSharingDbContext _db;

    public DriverService(RideSharingDbContext db) => _db = db;

    public async Task<ApiResponse<DriverProfileDto>> GetMyDriverProfileAsync(Guid userId)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null)
            return ApiResponse<DriverProfileDto>.FailureResponse("User not found.");

        var isDriver = user.UserRoles.Any(ur => ur.Role.Name == "Driver" || ur.Role.Name == "Admin");
        if (!isDriver)
            return ApiResponse<DriverProfileDto>.FailureResponse("Only drivers can access driver profile.");

        var profile = await _db.DriverProfiles.FirstOrDefaultAsync(d => d.UserId == userId && !d.IsDeleted);
        if (profile == null)
        {
            // return empty shell
            return ApiResponse<DriverProfileDto>.SuccessResponse(new DriverProfileDto
            {
                UserId = userId,
                FullName = $"{user.FirstName} {user.LastName}",
                Email = user.Email,
                VerificationStatus = VerificationStatus.Pending.ToString(),
                IsAvailable = true
            });
        }

        return ApiResponse<DriverProfileDto>.SuccessResponse(Map(profile, user));
    }

    public async Task<ApiResponse<DriverProfileDto>> UpsertMyDriverProfileAsync(Guid userId, UpdateDriverProfileRequest request)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null)
            return ApiResponse<DriverProfileDto>.FailureResponse("User not found.");

        var isDriver = user.UserRoles.Any(ur => ur.Role.Name == "Driver" || ur.Role.Name == "Admin");
        if (!isDriver)
            return ApiResponse<DriverProfileDto>.FailureResponse("Only drivers can update driver profile.");

        var profile = await _db.DriverProfiles.FirstOrDefaultAsync(d => d.UserId == userId && !d.IsDeleted);
        if (profile == null)
        {
            profile = new DriverProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            _db.DriverProfiles.Add(profile);
        }

        profile.LicenseNumber = request.LicenseNumber;
        profile.LicenseExpiryDate = request.LicenseExpiryDate;
        profile.YearsOfExperience = request.YearsOfExperience;
        profile.IsAvailable = request.IsAvailable;
        profile.Notes = request.Notes;
        profile.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ApiResponse<DriverProfileDto>.SuccessResponse(Map(profile, user), "Driver profile saved.");
    }

    private static DriverProfileDto Map(DriverProfile p, User user) => new()
    {
        Id = p.Id,
        UserId = p.UserId,
        LicenseNumber = p.LicenseNumber,
        LicenseExpiryDate = p.LicenseExpiryDate,
        YearsOfExperience = p.YearsOfExperience,
        VerificationStatus = p.VerificationStatus.ToString(),
        IsAvailable = p.IsAvailable,
        Notes = p.Notes,
        FullName = $"{user.FirstName} {user.LastName}",
        Email = user.Email
    };
}

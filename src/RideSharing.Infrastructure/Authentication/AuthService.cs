using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Auth;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Authentication;

public class AuthService : IAuthService
{
    private readonly RideSharingDbContext _db;
    private readonly IJwtTokenService _jwt;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        RideSharingDbContext db,
        IJwtTokenService jwt,
        IOptions<JwtSettings> jwtSettings)
    {
        _db = db;
        _jwt = jwt;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request, string? ipAddress = null)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return ApiResponse<AuthResponse>.FailureResponse("Email is already registered.");

        var roleName = request.Role is "Driver" or "Passenger" ? request.Role : "Passenger";
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (role == null)
        {
            role = new Role
            {
                Id = Guid.NewGuid(),
                Name = roleName,
                Description = $"{roleName} role",
                CreatedAt = DateTime.UtcNow
            };
            _db.Roles.Add(role);
            await _db.SaveChangesAsync();
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Gender = request.Gender,
            IsActive = true,
            IsVerified = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        _db.UserRoles.Add(new UserRole
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoleId = role.Id,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return await BuildAuthResponseAsync(user, ipAddress);
    }

    public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request, string? ipAddress = null)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user == null || !user.IsActive)
            return ApiResponse<AuthResponse>.FailureResponse("Invalid email or password.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return ApiResponse<AuthResponse>.FailureResponse("Invalid email or password.");

        return await BuildAuthResponseAsync(user, ipAddress);
    }

    public async Task<ApiResponse<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress = null)
    {
        var principal = _jwt.GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null)
            return ApiResponse<AuthResponse>.FailureResponse("Invalid access token.");

        var userIdStr = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
            return ApiResponse<AuthResponse>.FailureResponse("Invalid token claims.");

        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted && u.IsActive);

        if (user == null)
            return ApiResponse<AuthResponse>.FailureResponse("User not found or inactive.");

        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken && rt.UserId == userId);

        if (stored == null || !stored.IsActive)
            return ApiResponse<AuthResponse>.FailureResponse("Invalid or expired refresh token.");

        // Rotate
        stored.RevokedAt = DateTime.UtcNow;
        stored.RevokedByIp = ipAddress;
        var newTokenValue = _jwt.GenerateRefreshToken();
        stored.ReplacedByToken = newTokenValue;

        var newRefresh = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = newTokenValue,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays),
            CreatedByIp = ipAddress,
            CreatedAt = DateTime.UtcNow
        };
        _db.RefreshTokens.Add(newRefresh);
        await _db.SaveChangesAsync();

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var accessToken = _jwt.GenerateAccessToken(user, roles);

        return ApiResponse<AuthResponse>.SuccessResponse(new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = newTokenValue,
            AccessTokenExpiration = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationMinutes),
            User = MapUser(user, roles)
        }, "Token refreshed successfully.");
    }

    public async Task<ApiResponse> RevokeTokenAsync(string refreshToken, string? ipAddress = null)
    {
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == refreshToken);
        if (token == null || !token.IsActive)
            return ApiResponse.FailureResponse("Invalid refresh token.");

        token.RevokedAt = DateTime.UtcNow;
        token.RevokedByIp = ipAddress;
        await _db.SaveChangesAsync();
        return ApiResponse.SuccessResponse("Token revoked successfully.");
    }

    private async Task<ApiResponse<AuthResponse>> BuildAuthResponseAsync(User user, string? ipAddress)
    {
        // Ensure roles loaded
        if (user.UserRoles == null || !user.UserRoles.Any())
        {
            user = await _db.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstAsync(u => u.Id == user.Id);
        }

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var accessToken = _jwt.GenerateAccessToken(user, roles);
        var refreshValue = _jwt.GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = refreshValue,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays),
            CreatedByIp = ipAddress,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return ApiResponse<AuthResponse>.SuccessResponse(new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshValue,
            AccessTokenExpiration = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationMinutes),
            User = MapUser(user, roles)
        }, "Authentication successful.");
    }

    private static UserDto MapUser(User user, List<string> roles) => new()
    {
        Id = user.Id,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        PhoneNumber = user.PhoneNumber,
        Gender = user.Gender.ToString(),
        IsVerified = user.IsVerified,
        Roles = roles
    };
}

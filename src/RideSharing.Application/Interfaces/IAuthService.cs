using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Auth;

namespace RideSharing.Application.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request, string? ipAddress = null);
    Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request, string? ipAddress = null);
    Task<ApiResponse<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress = null);
    Task<ApiResponse> RevokeTokenAsync(string refreshToken, string? ipAddress = null);
}

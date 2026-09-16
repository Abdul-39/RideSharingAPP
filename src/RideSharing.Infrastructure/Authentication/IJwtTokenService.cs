using System.Security.Claims;
using RideSharing.Domain.Entities;

namespace RideSharing.Infrastructure.Authentication;

public interface IJwtTokenService
{
    string GenerateAccessToken(User user, IList<string> roles);
    string GenerateRefreshToken();
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
}

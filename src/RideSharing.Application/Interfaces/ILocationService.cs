using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Location;

namespace RideSharing.Application.Interfaces;

public interface ILocationService
{
    Task<ApiResponse<UserLocationDto>> UpdateMyLocationAsync(Guid userId, UpdateLocationRequest request);
    Task<ApiResponse<UserLocationDto?>> GetMyCurrentLocationAsync(Guid userId);
    Task<ApiResponse<RouteCalculationResultDto>> CalculateRouteAsync(RouteCalculationRequest request);
    Task<ApiResponse<List<NearbyDriverDto>>> GetNearbyDriversAsync(Guid requesterId, double lat, double lng, double radiusKm = 5);
    Task<ApiResponse<List<PlaceSearchResultDto>>> SearchPlacesAsync(string query);
}

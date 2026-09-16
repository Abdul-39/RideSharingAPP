using RideSharing.Application.DTOs.Location;

namespace RideSharing.Application.Interfaces;

/// <summary>Abstraction over Google Maps / routing providers. Keys stay in configuration.</summary>
public interface IMapsService
{
    Task<RouteCalculationResultDto> CalculateRouteAsync(RouteCalculationRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<PlaceSearchResultDto>> SearchPlacesAsync(string query, CancellationToken ct = default);
}

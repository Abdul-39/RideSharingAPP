using RideSharing.Application.DTOs.Geo;
namespace RideSharing.Application.Interfaces;
public interface IRoutingService
{
    Task<RouteGeometryResult> GetRouteAsync(double sourceLat, double sourceLng, double destLat, double destLng, CancellationToken ct = default);
}

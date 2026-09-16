using RideSharing.Application.DTOs.Geo;
namespace RideSharing.Application.Interfaces;
public interface IGeocodingService
{
    Task<IReadOnlyList<GeocodingResult>> SearchAsync(string placeName, CancellationToken ct = default);
    Task<GeocodingResult?> GeocodeAsync(string placeName, CancellationToken ct = default);
    Task<GeocodingResult?> ReverseGeocodeAsync(double latitude, double longitude, CancellationToken ct = default);
}

using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RideSharing.Application.DTOs.Location;
using RideSharing.Application.Interfaces;

namespace RideSharing.Infrastructure.Services;

/// <summary>
/// Free-first maps provider:
/// 1) Optional Google if key configured
/// 2) Free OSRM public routing (no key)
/// 3) Haversine estimate fallback
/// </summary>
public class GoogleMapsService : IMapsService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<GoogleMapsService> _logger;

    public GoogleMapsService(HttpClient http, IConfiguration config, ILogger<GoogleMapsService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    private string? GoogleKey => _config["GoogleMaps:ApiKey"]
        ?? Environment.GetEnvironmentVariable("GOOGLE_MAPS_API_KEY");

    public async Task<RouteCalculationResultDto> CalculateRouteAsync(RouteCalculationRequest request, CancellationToken ct = default)
    {
        // Prefer free OSRM (no billing)
        try
        {
            var osrm = await TryOsrmAsync(request, ct);
            if (osrm != null) return osrm;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OSRM routing failed");
        }

        // Optional Google if key present
        var key = GoogleKey;
        if (!string.IsNullOrWhiteSpace(key))
        {
            try
            {
                var google = await TryGoogleAsync(request, key, ct);
                if (google != null) return google;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Google Directions failed");
            }
        }

        return HaversineEstimate(request);
    }

    public async Task<IReadOnlyList<PlaceSearchResultDto>> SearchPlacesAsync(string query, CancellationToken ct = default)
    {
        // Free Nominatim (OpenStreetMap) — usage policy: identify app, moderate rate
        if (string.IsNullOrWhiteSpace(query)) return Array.Empty<PlaceSearchResultDto>();
        try
        {
            var url = "https://nominatim.openstreetmap.org/search"
                + $"?format=json&limit=8&countrycodes=pk&q={Uri.EscapeDataString(query)}";
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.TryAddWithoutValidation("User-Agent", "RideSharingFYP/1.0 (university-project)");
            using var resp = await _http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode) return Array.Empty<PlaceSearchResultDto>();
            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var list = new List<PlaceSearchResultDto>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                list.Add(new PlaceSearchResultDto
                {
                    PlaceId = item.TryGetProperty("osm_id", out var id) ? id.ToString() : "",
                    Description = item.GetProperty("display_name").GetString() ?? "",
                    Latitude = item.TryGetProperty("lat", out var lat) ? double.Parse(lat.GetString()!, CultureInfo.InvariantCulture) : null,
                    Longitude = item.TryGetProperty("lon", out var lon) ? double.Parse(lon.GetString()!, CultureInfo.InvariantCulture) : null
                });
            }
            return list;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Nominatim search failed");
            return Array.Empty<PlaceSearchResultDto>();
        }
    }

    private async Task<RouteCalculationResultDto?> TryOsrmAsync(RouteCalculationRequest request, CancellationToken ct)
    {
        // OSRM expects lon,lat
        var coords =
            $"{request.OriginLng.ToString(CultureInfo.InvariantCulture)},{request.OriginLat.ToString(CultureInfo.InvariantCulture)};" +
            $"{request.DestinationLng.ToString(CultureInfo.InvariantCulture)},{request.DestinationLat.ToString(CultureInfo.InvariantCulture)}";
        var url = $"https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson";

        using var resp = await _http.GetAsync(url, ct);
        if (!resp.IsSuccessStatusCode) return null;
        await using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        var root = doc.RootElement;
        if (root.GetProperty("code").GetString() != "Ok") return null;

        var route = root.GetProperty("routes")[0];
        var distanceM = route.GetProperty("distance").GetDouble();
        var durationS = route.GetProperty("duration").GetDouble();
        var points = new List<GeoPointDto>();
        if (route.TryGetProperty("geometry", out var geom) &&
            geom.TryGetProperty("coordinates", out var coordsEl))
        {
            foreach (var c in coordsEl.EnumerateArray())
            {
                // GeoJSON: [lon, lat]
                var lon = c[0].GetDouble();
                var lat = c[1].GetDouble();
                points.Add(new GeoPointDto { Latitude = lat, Longitude = lon });
            }
        }
        if (points.Count == 0)
        {
            points.Add(new GeoPointDto { Latitude = request.OriginLat, Longitude = request.OriginLng });
            points.Add(new GeoPointDto { Latitude = request.DestinationLat, Longitude = request.DestinationLng });
        }

        return new RouteCalculationResultDto
        {
            DistanceKm = Math.Round(distanceM / 1000.0, 2),
            DurationMinutes = Math.Max(1, (int)Math.Ceiling(durationS / 60.0)),
            Summary = "Free OSRM driving route",
            PolylinePoints = points,
            UsedLiveMapsProvider = true,
            Provider = "OSRM-Free"
        };
    }

    private async Task<RouteCalculationResultDto?> TryGoogleAsync(RouteCalculationRequest request, string key, CancellationToken ct)
    {
        var origin = $"{request.OriginLat.ToString(CultureInfo.InvariantCulture)},{request.OriginLng.ToString(CultureInfo.InvariantCulture)}";
        var dest = $"{request.DestinationLat.ToString(CultureInfo.InvariantCulture)},{request.DestinationLng.ToString(CultureInfo.InvariantCulture)}";
        var url = $"https://maps.googleapis.com/maps/api/directions/json?origin={origin}&destination={dest}&key={key}";
        using var resp = await _http.GetAsync(url, ct);
        if (!resp.IsSuccessStatusCode) return null;
        await using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        var root = doc.RootElement;
        if (root.GetProperty("status").GetString() != "OK") return null;
        var route = root.GetProperty("routes")[0];
        var leg = route.GetProperty("legs")[0];
        var distanceM = leg.GetProperty("distance").GetProperty("value").GetDouble();
        var durationS = leg.GetProperty("duration").GetProperty("value").GetDouble();
        return new RouteCalculationResultDto
        {
            DistanceKm = Math.Round(distanceM / 1000.0, 2),
            DurationMinutes = (int)Math.Ceiling(durationS / 60.0),
            Summary = route.TryGetProperty("summary", out var s) ? s.GetString() : "Google route",
            PolylinePoints = new List<GeoPointDto>
            {
                new() { Latitude = request.OriginLat, Longitude = request.OriginLng },
                new() { Latitude = request.DestinationLat, Longitude = request.DestinationLng }
            },
            UsedLiveMapsProvider = true,
            Provider = "GoogleDirections"
        };
    }

    private static RouteCalculationResultDto HaversineEstimate(RouteCalculationRequest request)
    {
        var km = HaversineKm(request.OriginLat, request.OriginLng, request.DestinationLat, request.DestinationLng);
        var minutes = Math.Max(1, (int)Math.Ceiling(km / 28.0 * 60.0));
        return new RouteCalculationResultDto
        {
            DistanceKm = Math.Round(km, 2),
            DurationMinutes = minutes,
            Summary = "Straight-line estimate",
            PolylinePoints = new List<GeoPointDto>
            {
                new() { Latitude = request.OriginLat, Longitude = request.OriginLng },
                new() { Latitude = request.DestinationLat, Longitude = request.DestinationLng }
            },
            UsedLiveMapsProvider = false,
            Provider = "HaversineEstimate"
        };
    }

    public static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371.0;
        static double Rad(double d) => d * Math.PI / 180.0;
        var dLat = Rad(lat2 - lat1);
        var dLon = Rad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(Rad(lat1)) * Math.Cos(Rad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}

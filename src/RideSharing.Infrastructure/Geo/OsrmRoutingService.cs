using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using RideSharing.Application.DTOs.Geo;
using RideSharing.Application.Interfaces;

namespace RideSharing.Infrastructure.Geo;

/// <summary>
/// Public OSRM demo server for road geometry. Falls back to densified straight line.
/// Replaceable via IRoutingService (e.g. GraphHopper, Google Directions later).
/// </summary>
public class OsrmRoutingService : IRoutingService
{
    private readonly HttpClient _http;
    private readonly ILogger<OsrmRoutingService> _log;

    public OsrmRoutingService(HttpClient http, ILogger<OsrmRoutingService> log)
    {
        _http = http;
        _log = log;
    }

    public async Task<RouteGeometryResult> GetRouteAsync(
        double sourceLatitude,
        double sourceLongitude,
        double destinationLatitude,
        double destinationLongitude,
        CancellationToken ct = default)
    {
        var inv = CultureInfo.InvariantCulture;
        // OSRM expects lon,lat
        var url =
            $"route/v1/driving/{sourceLongitude.ToString(inv)},{sourceLatitude.ToString(inv)};" +
            $"{destinationLongitude.ToString(inv)},{destinationLatitude.ToString(inv)}" +
            "?overview=full&geometries=geojson";

        try
        {
            using var resp = await _http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _log.LogWarning("OSRM status {Status}", resp.StatusCode);
                return Fallback(sourceLatitude, sourceLongitude, destinationLatitude, destinationLongitude);
            }

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var root = doc.RootElement;
            var routes = root.GetProperty("routes");
            if (routes.GetArrayLength() == 0)
                return Fallback(sourceLatitude, sourceLongitude, destinationLatitude, destinationLongitude);

            var route = routes[0];
            var distanceM = route.GetProperty("distance").GetDouble();
            var durationS = route.GetProperty("duration").GetDouble();
            var coords = route.GetProperty("geometry").GetProperty("coordinates");
            var points = new List<GeoPoint>();
            foreach (var c in coords.EnumerateArray())
            {
                var lon = c[0].GetDouble();
                var lat = c[1].GetDouble();
                points.Add(new GeoPoint(lat, lon));
            }

            return new RouteGeometryResult
            {
                DistanceKm = distanceM / 1000.0,
                DurationMinutes = durationS / 60.0,
                Points = points
            };
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "OSRM routing failed — using straight-line fallback");
            return Fallback(sourceLatitude, sourceLongitude, destinationLatitude, destinationLongitude);
        }
    }

    private static RouteGeometryResult Fallback(double lat1, double lon1, double lat2, double lon2)
    {
        var a = new GeoPoint(lat1, lon1);
        var b = new GeoPoint(lat2, lon2);
        var pts = GeoMath.StraightLine(a, b, 24);
        var km = GeoMath.HaversineKm(lat1, lon1, lat2, lon2);
        return new RouteGeometryResult
        {
            DistanceKm = km,
            DurationMinutes = km / 0.5, // rough
            Points = pts
        };
    }
}

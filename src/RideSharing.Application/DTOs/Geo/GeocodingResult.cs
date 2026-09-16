namespace RideSharing.Application.DTOs.Geo;

public class GeocodingResult
{
    public string DisplayName { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class RouteGeometryResult
{
    public double DistanceKm { get; set; }
    public double DurationMinutes { get; set; }
    public IReadOnlyList<GeoPoint> Points { get; set; } = Array.Empty<GeoPoint>();
}

public record GeoPoint(double Latitude, double Longitude);

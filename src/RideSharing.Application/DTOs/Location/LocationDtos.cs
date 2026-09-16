namespace RideSharing.Application.DTOs.Location;

public class GeoPointDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class UpdateLocationRequest
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public string? Label { get; set; }
    public int ShareMode { get; set; } = 1; // ActiveRideOnly
    public Guid? ActiveRideId { get; set; }
}

public class UserLocationDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public DateTime RecordedAt { get; set; }
    public string? Label { get; set; }
    public bool IsCurrent { get; set; }
    public string ShareMode { get; set; } = string.Empty;
    public Guid? ActiveRideId { get; set; }
}

public class RouteCalculationRequest
{
    public double OriginLat { get; set; }
    public double OriginLng { get; set; }
    public double DestinationLat { get; set; }
    public double DestinationLng { get; set; }
}

public class RouteCalculationResultDto
{
    public double DistanceKm { get; set; }
    public int DurationMinutes { get; set; }
    public string? Summary { get; set; }
    public List<GeoPointDto> PolylinePoints { get; set; } = new();
    public bool UsedLiveMapsProvider { get; set; }
    public string Provider { get; set; } = "HaversineEstimate";
}

public class NearbyDriverDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double DistanceKm { get; set; }
    public DateTime RecordedAt { get; set; }
    public string? VehicleInfo { get; set; }
}

public class PlaceSearchResultDto
{
    public string PlaceId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

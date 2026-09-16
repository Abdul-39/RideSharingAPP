namespace RideSharing.Application.DTOs.Rides;

public class CorridorMatchDto
{
    public Guid MatchId { get; set; }
    public Guid RideRequestId { get; set; }
    public Guid MatchedUserId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public string SourcePlaceName { get; set; } = string.Empty;
    public string DestinationPlaceName { get; set; } = string.Empty;
    public double DistanceFromRouteKm { get; set; }
    public double DestinationDistanceKm { get; set; }
    public int DepartureDifferenceMinutes { get; set; }
    public int AvailableSeats { get; set; }
    public int RequestedSeats { get; set; }
    public decimal MatchScore { get; set; }
    public bool WomenOnly { get; set; }
    public bool IsVerified { get; set; }
    public IReadOnlyList<string> MatchReasons { get; set; } = Array.Empty<string>();
    public string? VehicleInfo { get; set; }
    public string Status { get; set; } = "Pending";
}

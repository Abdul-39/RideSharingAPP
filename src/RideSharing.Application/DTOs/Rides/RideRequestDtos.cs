using RideSharing.Domain.Enums;

namespace RideSharing.Application.DTOs.Rides;

public class CreateRideRequestDto
{
    public Guid RouteId { get; set; }
    public DateOnly TravelDate { get; set; }
    public string PreferredDepartureTime { get; set; } = string.Empty; // HH:mm
    public int SeatsNeeded { get; set; } = 1;
    public GenderPreference GenderPreference { get; set; } = GenderPreference.Any;
    public int TimeToleranceMinutes { get; set; } = 15;
    public string? Notes { get; set; }
}

public class RideRequestDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid RouteId { get; set; }
    public string SourceAddress { get; set; } = string.Empty;
    public string DestinationAddress { get; set; } = string.Empty;
    public decimal SourceLatitude { get; set; }
    public decimal SourceLongitude { get; set; }
    public decimal DestinationLatitude { get; set; }
    public decimal DestinationLongitude { get; set; }
    public DateOnly TravelDate { get; set; }
    public string PreferredDepartureTime { get; set; } = string.Empty;
    public int SeatsNeeded { get; set; }
    public string GenderPreference { get; set; } = string.Empty;
    public int TimeToleranceMinutes { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public int MatchCount { get; set; }
}

public class MatchResultDto
{
    public Guid MatchId { get; set; }
    public Guid RideRequestId { get; set; }
    public Guid MatchedUserId { get; set; }
    public string MatchedUserName { get; set; } = string.Empty;
    public bool IsVerified { get; set; }
    public string Gender { get; set; } = string.Empty;
    public Guid? VehicleId { get; set; }
    public string? VehicleInfo { get; set; }
    public int? SeatingCapacity { get; set; }
    public string? MatchedRouteSource { get; set; }
    public string? MatchedRouteDestination { get; set; }
    public string? MatchedDepartureTime { get; set; }
    public decimal MatchScore { get; set; }
    public string? ScoreBreakdown { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class RespondMatchRequest
{
    public bool Accept { get; set; }
}

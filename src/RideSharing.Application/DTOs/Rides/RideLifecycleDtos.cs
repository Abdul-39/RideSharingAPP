namespace RideSharing.Application.DTOs.Rides;
public class CreateRideFromMatchRequest { public Guid MatchId { get; set; } }
public class CancelRideRequest { public string? Reason { get; set; } }
public class RideParticipantDto { public Guid UserId { get; set; } public string FullName { get; set; } = ""; public string Role { get; set; } = ""; public bool HasConfirmed { get; set; } }
public class RideHistoryItemDto { public string FromStatus { get; set; } = ""; public string ToStatus { get; set; } = ""; public string? Note { get; set; } public DateTime ChangedAt { get; set; } }
public class RideDto
{
    public Guid Id { get; set; } public Guid RouteId { get; set; }
    public string SourceAddress { get; set; } = ""; public string DestinationAddress { get; set; } = "";
    public DateOnly TravelDate { get; set; } public string ScheduledDepartureTime { get; set; } = "";
    public string Status { get; set; } = ""; public Guid? VehicleId { get; set; } public string? VehicleInfo { get; set; }
    public decimal? FareAmount { get; set; } public string? CancellationReason { get; set; }
    public DateTime? ConfirmedAt { get; set; } public DateTime? StartedAt { get; set; } public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<RideParticipantDto> Participants { get; set; } = new();
    public List<RideHistoryItemDto> History { get; set; } = new();
}

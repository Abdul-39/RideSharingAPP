using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;
namespace RideSharing.Domain.Entities;
public class Ride : BaseEntity
{
    public Guid? RideRequestId { get; set; }
    public RideRequest? RideRequest { get; set; }
    public Guid? RideMatchId { get; set; }
    public RideMatch? RideMatch { get; set; }
    public Guid RouteId { get; set; }
    public Route Route { get; set; } = null!;
    public Guid? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }
    public DateOnly TravelDate { get; set; }
    public TimeOnly ScheduledDepartureTime { get; set; }
    public RideStatus Status { get; set; } = RideStatus.Matched;
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public decimal? FareAmount { get; set; }
    public string? Notes { get; set; }
    public ICollection<RideParticipant> Participants { get; set; } = new List<RideParticipant>();
    public ICollection<RideHistory> History { get; set; } = new List<RideHistory>();
}

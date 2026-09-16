using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

public class RideRequest : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid RouteId { get; set; }
    public Route Route { get; set; } = null!;

    public DateOnly TravelDate { get; set; }
    public TimeOnly PreferredDepartureTime { get; set; }
    public int SeatsNeeded { get; set; } = 1;
    public GenderPreference GenderPreference { get; set; } = GenderPreference.Any;
    public int TimeToleranceMinutes { get; set; } = 15;
    public RideRequestStatus Status { get; set; } = RideRequestStatus.Open;
    public string? Notes { get; set; }

    public ICollection<RideMatch> Matches { get; set; } = new List<RideMatch>();
}

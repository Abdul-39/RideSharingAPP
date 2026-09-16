using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

public class RideMatch : BaseEntity
{
    public Guid RideRequestId { get; set; }
    public RideRequest RideRequest { get; set; } = null!;

    public Guid MatchedUserId { get; set; }
    public User MatchedUser { get; set; } = null!;

    public Guid? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public Guid? MatchedRouteId { get; set; }
    public Route? MatchedRoute { get; set; }

    public decimal MatchScore { get; set; }
    public string? ScoreBreakdown { get; set; }
    public MatchStatus Status { get; set; } = MatchStatus.Pending;
}

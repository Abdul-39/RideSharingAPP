using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

/// <summary>
/// One rating from a user to another for a specific completed ride.
/// Unique on (RideId, FromUserId, ToUserId).
/// </summary>
public class Rating : BaseEntity
{
    public Guid RideId { get; set; }
    public Ride Ride { get; set; } = null!;

    public Guid FromUserId { get; set; }
    public User FromUser { get; set; } = null!;

    public Guid ToUserId { get; set; }
    public User ToUser { get; set; } = null!;

    /// <summary>1–5 stars</summary>
    public int Stars { get; set; }

    public string? Review { get; set; }
}

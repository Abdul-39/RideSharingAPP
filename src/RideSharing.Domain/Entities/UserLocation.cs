using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

/// <summary>
/// Dedicated location storage. Do not store continuously changing GPS on Users.
/// </summary>
public class UserLocation : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Optional label (e.g. Home, Office, Last known).</summary>
    public string? Label { get; set; }

    public bool IsCurrent { get; set; } = true;
    public LocationShareMode ShareMode { get; set; } = LocationShareMode.ActiveRideOnly;

    /// <summary>When set, this ping is associated with an active ride for tracking privacy rules.</summary>
    public Guid? ActiveRideId { get; set; }
}

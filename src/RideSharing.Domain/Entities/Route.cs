using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

public class Route : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // Source
    public decimal SourceLatitude { get; set; }
    public decimal SourceLongitude { get; set; }
    public string SourceAddress { get; set; } = string.Empty;

    // Destination
    public decimal DestinationLatitude { get; set; }
    public decimal DestinationLongitude { get; set; }
    public string DestinationAddress { get; set; } = string.Empty;

    // Preferred departure time (local time of day)
    public TimeOnly PreferredDepartureTime { get; set; }

    // Time tolerance in minutes (default ±15 as per requirements)
    public int MaximumTimeToleranceMinutes { get; set; } = 15;

    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<RideSchedule> RideSchedules { get; set; } = new List<RideSchedule>();
}

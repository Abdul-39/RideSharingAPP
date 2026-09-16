using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

/// <summary>
/// Supports recurring daily/weekly commuting schedules.
/// Linked to a Route and a User.
/// </summary>
public class RideSchedule : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid RouteId { get; set; }
    public Route Route { get; set; } = null!;

    // Days of week the user travels this route
    public bool Monday { get; set; }
    public bool Tuesday { get; set; }
    public bool Wednesday { get; set; }
    public bool Thursday { get; set; }
    public bool Friday { get; set; }
    public bool Saturday { get; set; }
    public bool Sunday { get; set; }

    public bool IsActive { get; set; } = true;

    // Optional: effective date range for the schedule
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
}

using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

/// <summary>
/// Full property set so existing Safety/SOS code compiles.
/// </summary>
public class EmergencyAlert : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? RideId { get; set; }
    public Ride? Ride { get; set; }

    public EmergencyType Type { get; set; } = EmergencyType.General;
    public EmergencyStatus Status { get; set; } = EmergencyStatus.Active;

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? PlaceName { get; set; }

    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }

    public string? Note { get; set; }
    public string? ResolvedByNote { get; set; }

    /// <summary>True when Status is Resolved or Cancelled.</summary>
    public bool IsResolved
    {
        get => Status == EmergencyStatus.Resolved
               || Status == EmergencyStatus.Cancelled
               || ResolvedAt.HasValue;
        set
        {
            if (value)
            {
                Status = EmergencyStatus.Resolved;
                ResolvedAt ??= DateTime.UtcNow;
            }
            else
            {
                Status = EmergencyStatus.Active;
                ResolvedAt = null;
            }
        }
    }

    // Aliases used by newer Phase 5 code
    public DateTime ActivatedAt
    {
        get => TriggeredAt;
        set => TriggeredAt = value;
    }

    public string? Notes
    {
        get => Note;
        set => Note = value;
    }
}

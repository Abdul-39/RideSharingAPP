using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

public class EmergencyContact : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Relationship { get; set; }
    public bool IsPrimary { get; set; }
}

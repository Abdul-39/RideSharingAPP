using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

/// <summary>
/// Extended profile for users with the Driver role.
/// </summary>
public class DriverProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string? LicenseNumber { get; set; }
    public DateOnly? LicenseExpiryDate { get; set; }
    public int YearsOfExperience { get; set; }
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;
    public bool IsAvailable { get; set; } = true;  // accepting rides
    public string? Notes { get; set; }
}

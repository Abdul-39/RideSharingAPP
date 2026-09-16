using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

public class Institution : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public InstitutionType Type { get; set; }
    public string? Address { get; set; }
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
}

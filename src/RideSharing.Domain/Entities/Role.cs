using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

public class Role : BaseEntity
{
    public string Name { get; set; } = string.Empty;          // Passenger, Driver, Admin
    public string? Description { get; set; }

    // Navigation
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

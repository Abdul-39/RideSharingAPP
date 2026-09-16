using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

/// <summary>
/// Join entity for many-to-many relationship between Users and Roles.
/// </summary>
public class UserRole : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
}

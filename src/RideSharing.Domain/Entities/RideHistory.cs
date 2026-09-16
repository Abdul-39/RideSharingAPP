using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;
namespace RideSharing.Domain.Entities;
public class RideHistory : BaseEntity
{
    public Guid RideId { get; set; }
    public Ride Ride { get; set; } = null!;
    public RideStatus FromStatus { get; set; }
    public RideStatus ToStatus { get; set; }
    public Guid? ChangedByUserId { get; set; }
    public string? Note { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}

using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;
namespace RideSharing.Domain.Entities;
public class RideParticipant : BaseEntity
{
    public Guid RideId { get; set; }
    public Ride Ride { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public ParticipantRole Role { get; set; }
    public bool HasConfirmed { get; set; }
    public DateTime? ConfirmedAt { get; set; }
}

using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

public class ChatMessage : BaseEntity
{
    public Guid RideId { get; set; }
    public Ride Ride { get; set; } = null!;

    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public Guid ReceiverId { get; set; }
    public User Receiver { get; set; } = null!;

    public string Message { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
}

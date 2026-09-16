using RideSharing.Domain.Common;
using RideSharing.Domain.Enums;

namespace RideSharing.Domain.Entities;

public class AppNotification : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public NotificationType Type { get; set; } = NotificationType.General;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }

    /// <summary>Optional related ride / match / payment id.</summary>
    public Guid? RelatedEntityId { get; set; }
    public string? LinkUrl { get; set; }
}

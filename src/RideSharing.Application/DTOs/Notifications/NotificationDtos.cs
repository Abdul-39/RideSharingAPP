namespace RideSharing.Application.DTOs.Notifications;

public class NotificationDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public bool IsRead { get; set; }
    public Guid? RelatedEntityId { get; set; }
    public string? LinkUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UnreadCountDto
{
    public int Count { get; set; }
}

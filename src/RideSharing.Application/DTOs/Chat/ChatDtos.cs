namespace RideSharing.Application.DTOs.Chat;

public class ChatMessageDto
{
    public Guid Id { get; set; }
    public Guid RideId { get; set; }
    public Guid SenderId { get; set; }
    public string SenderName { get; set; } = "";
    public Guid ReceiverId { get; set; }
    public string Message { get; set; } = "";
    public DateTime SentAt { get; set; }
    public bool IsRead { get; set; }
    public bool IsMine { get; set; }
}

public class SendChatMessageRequest
{
    public string Message { get; set; } = "";
    public Guid? ReceiverId { get; set; }
}

public class ChatThreadDto
{
    public Guid RideId { get; set; }
    public string Title { get; set; } = "";
    public string Status { get; set; } = "";
    public string? LastMessage { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
}

using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Chat;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class ChatService : IChatService
{
    private readonly RideSharingDbContext _db;
    private readonly IRideRealtimeNotifier _realtime;
    private readonly INotificationService _notifications;

    public ChatService(RideSharingDbContext db, IRideRealtimeNotifier realtime, INotificationService notifications)
    {
        _db = db;
        _realtime = realtime;
        _notifications = notifications;
    }

    public async Task<ApiResponse<List<ChatThreadDto>>> GetMyThreadsAsync(Guid userId)
    {
        var rideIds = await _db.RideParticipants.AsNoTracking()
            .Where(p => p.UserId == userId && !p.IsDeleted)
            .Select(p => p.RideId)
            .Distinct()
            .ToListAsync();

        var rides = await _db.Rides.AsNoTracking()
            .Include(r => r.Route)
            .Where(r => rideIds.Contains(r.Id) && !r.IsDeleted)
            .OrderByDescending(r => r.UpdatedAt ?? r.CreatedAt)
            .ToListAsync();

        var list = new List<ChatThreadDto>();
        foreach (var r in rides)
        {
            var last = await _db.ChatMessages.AsNoTracking()
                .Where(m => m.RideId == r.Id)
                .OrderByDescending(m => m.SentAt)
                .FirstOrDefaultAsync();
            var unread = await _db.ChatMessages.AsNoTracking()
                .CountAsync(m => m.RideId == r.Id && m.ReceiverId == userId && !m.IsRead);

            list.Add(new ChatThreadDto
            {
                RideId = r.Id,
                Title = $"{r.Route?.SourceAddress} → {r.Route?.DestinationAddress}",
                Status = r.Status.ToString(),
                LastMessage = last?.Message,
                LastMessageAt = last?.SentAt,
                UnreadCount = unread
            });
        }
        return ApiResponse<List<ChatThreadDto>>.SuccessResponse(list);
    }

    public async Task<ApiResponse<List<ChatMessageDto>>> GetMessagesAsync(Guid rideId, Guid userId)
    {
        if (!await IsParticipant(rideId, userId))
            return ApiResponse<List<ChatMessageDto>>.FailureResponse("Not allowed.");

        var messages = await _db.ChatMessages.AsNoTracking()
            .Include(m => m.Sender)
            .Where(m => m.RideId == rideId)
            .OrderBy(m => m.SentAt)
            .Take(200)
            .ToListAsync();

        var dtos = messages.Select(m => Map(m, userId)).ToList();
        return ApiResponse<List<ChatMessageDto>>.SuccessResponse(dtos);
    }

    public async Task<ApiResponse<ChatMessageDto>> SendAsync(Guid rideId, Guid senderId, SendChatMessageRequest request)
    {
        var text = (request.Message ?? "").Trim();
        if (string.IsNullOrWhiteSpace(text))
            return ApiResponse<ChatMessageDto>.FailureResponse("Message is required.");
        if (text.Length > 2000)
            return ApiResponse<ChatMessageDto>.FailureResponse("Message too long.");

        var ride = await _db.Rides.Include(r => r.Participants)
            .FirstOrDefaultAsync(r => r.Id == rideId && !r.IsDeleted);
        if (ride == null) return ApiResponse<ChatMessageDto>.FailureResponse("Ride not found.");

        var parts = ride.Participants.Where(p => !p.IsDeleted).ToList();
        if (!parts.Any(p => p.UserId == senderId))
            return ApiResponse<ChatMessageDto>.FailureResponse("Only ride participants can chat.");

        Guid receiverId;
        if (request.ReceiverId.HasValue && parts.Any(p => p.UserId == request.ReceiverId.Value))
            receiverId = request.ReceiverId.Value;
        else
        {
            var other = parts.FirstOrDefault(p => p.UserId != senderId);
            if (other == null)
                return ApiResponse<ChatMessageDto>.FailureResponse("No receiver on this ride.");
            receiverId = other.UserId;
        }

        if (receiverId == senderId)
            return ApiResponse<ChatMessageDto>.FailureResponse("Cannot message yourself.");

        var entity = new ChatMessage
        {
            Id = Guid.NewGuid(),
            RideId = rideId,
            SenderId = senderId,
            ReceiverId = receiverId,
            Message = text,
            SentAt = DateTime.UtcNow,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.ChatMessages.Add(entity);
        await _db.SaveChangesAsync();

        var sender = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == senderId);
        entity.Sender = sender;
        var dto = Map(entity, senderId);

        await _realtime.NotifyChatMessageAsync(rideId, dto);
        await _notifications.CreateForUserAsync(
            receiverId,
            NotificationType.ChatMessage,
            "New message",
            text.Length > 80 ? text[..80] + "…" : text,
            rideId,
            $"/app/chat/{rideId}");

        return ApiResponse<ChatMessageDto>.SuccessResponse(dto, "Sent.");
    }

    public async Task<ApiResponse<object>> MarkReadAsync(Guid rideId, Guid userId)
    {
        if (!await IsParticipant(rideId, userId))
            return ApiResponse<object>.FailureResponse("Not allowed.");

        var unread = await _db.ChatMessages
            .Where(m => m.RideId == rideId && m.ReceiverId == userId && !m.IsRead)
            .ToListAsync();
        foreach (var m in unread)
        {
            m.IsRead = true;
            m.ReadAt = DateTime.UtcNow;
            m.UpdatedAt = DateTime.UtcNow;
        }
        if (unread.Count > 0) await _db.SaveChangesAsync();
        return ApiResponse<object>.SuccessResponse(new { marked = unread.Count });
    }

    private async Task<bool> IsParticipant(Guid rideId, Guid userId) =>
        await _db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == userId && !p.IsDeleted);

    private static ChatMessageDto Map(ChatMessage m, Guid currentUserId) => new()
    {
        Id = m.Id,
        RideId = m.RideId,
        SenderId = m.SenderId,
        SenderName = m.Sender != null ? $"{m.Sender.FirstName} {m.Sender.LastName}".Trim() : "",
        ReceiverId = m.ReceiverId,
        Message = m.Message,
        SentAt = m.SentAt,
        IsRead = m.IsRead,
        IsMine = m.SenderId == currentUserId
    };
}

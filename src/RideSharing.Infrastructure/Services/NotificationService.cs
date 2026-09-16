using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Notifications;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly RideSharingDbContext _db;
    private readonly IRideRealtimeNotifier _realtime;

    public NotificationService(RideSharingDbContext db, IRideRealtimeNotifier realtime)
    {
        _db = db;
        _realtime = realtime;
    }

    public async Task<ApiResponse<List<NotificationDto>>> GetMyAsync(Guid userId, int take = 50)
    {
        var list = await _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(Math.Clamp(take, 1, 100))
            .ToListAsync();
        return ApiResponse<List<NotificationDto>>.SuccessResponse(list.Select(Map).ToList());
    }

    public async Task<ApiResponse<UnreadCountDto>> GetUnreadCountAsync(Guid userId)
    {
        var count = await _db.Notifications.AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead);
        return ApiResponse<UnreadCountDto>.SuccessResponse(new UnreadCountDto { Count = count });
    }

    public async Task<ApiResponse<object>> MarkReadAsync(Guid userId, Guid notificationId)
    {
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId);
        if (n == null) return ApiResponse<object>.FailureResponse("Not found.");
        n.IsRead = true;
        n.ReadAt = DateTime.UtcNow;
        n.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ApiResponse<object>.SuccessResponse(new { });
    }

    public async Task<ApiResponse<object>> MarkAllReadAsync(Guid userId)
    {
        var list = await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        foreach (var n in list)
        {
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
            n.UpdatedAt = DateTime.UtcNow;
        }
        if (list.Count > 0) await _db.SaveChangesAsync();
        return ApiResponse<object>.SuccessResponse(new { marked = list.Count });
    }

    public async Task CreateForUserAsync(Guid userId, NotificationType type, string title, string body, Guid? relatedId = null, string? link = null)
    {
        var entity = new AppNotification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Title = title,
            Body = body,
            RelatedEntityId = relatedId,
            LinkUrl = link,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.Notifications.Add(entity);
        await _db.SaveChangesAsync();
        try { await _realtime.NotifyUserAsync(userId, Map(entity)); } catch { /* */ }
    }

    public async Task CreateForRideParticipantsAsync(Guid rideId, Guid? excludeUserId, NotificationType type, string title, string body, string? link = null)
    {
        var userIds = await _db.RideParticipants.AsNoTracking()
            .Where(p => p.RideId == rideId && !p.IsDeleted)
            .Select(p => p.UserId)
            .ToListAsync();
        foreach (var uid in userIds)
        {
            if (excludeUserId.HasValue && uid == excludeUserId.Value) continue;
            await CreateForUserAsync(uid, type, title, body, rideId, link ?? $"/app/rides/{rideId}");
        }
    }

    private static NotificationDto Map(AppNotification n) => new()
    {
        Id = n.Id,
        Type = n.Type.ToString(),
        Title = n.Title,
        Body = n.Body,
        IsRead = n.IsRead,
        RelatedEntityId = n.RelatedEntityId,
        LinkUrl = n.LinkUrl,
        CreatedAt = n.CreatedAt
    };
}

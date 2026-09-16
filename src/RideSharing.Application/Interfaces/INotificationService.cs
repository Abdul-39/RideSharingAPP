using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Notifications;
using RideSharing.Domain.Enums;

namespace RideSharing.Application.Interfaces;

public interface INotificationService
{
    Task<ApiResponse<List<NotificationDto>>> GetMyAsync(Guid userId, int take = 50);
    Task<ApiResponse<UnreadCountDto>> GetUnreadCountAsync(Guid userId);
    Task<ApiResponse<object>> MarkReadAsync(Guid userId, Guid notificationId);
    Task<ApiResponse<object>> MarkAllReadAsync(Guid userId);
    Task CreateForUserAsync(Guid userId, NotificationType type, string title, string body, Guid? relatedId = null, string? link = null);
    Task CreateForRideParticipantsAsync(Guid rideId, Guid? excludeUserId, NotificationType type, string title, string body, string? link = null);
}

using RideSharing.Application.DTOs.Chat;
using RideSharing.Application.DTOs.Notifications;
using RideSharing.Application.DTOs.Realtime;
using RideSharing.Application.DTOs.Safety;

namespace RideSharing.Application.Interfaces;

public interface IRideRealtimeNotifier
{
    Task NotifyRideStatusAsync(Guid rideId, RideStatusChangedEvent evt, CancellationToken ct = default);
    Task NotifyNotificationAsync(Guid rideId, RideNotificationEvent evt, CancellationToken ct = default);
    Task NotifyChatMessageAsync(Guid rideId, ChatMessageDto message, CancellationToken ct = default);
    Task NotifyUserAsync(Guid userId, NotificationDto notification, CancellationToken ct = default);
    Task NotifySosAsync(Guid rideId, SosBroadcastEvent evt, CancellationToken ct = default);
}

using Microsoft.AspNetCore.SignalR;
using RideSharing.Application.DTOs.Chat;
using RideSharing.Application.DTOs.Notifications;
using RideSharing.Application.DTOs.Realtime;
using RideSharing.Application.DTOs.Safety;
using RideSharing.Application.Interfaces;

namespace RideSharing.Infrastructure.SignalR;

public class RideRealtimeNotifier : IRideRealtimeNotifier
{
    private readonly IHubContext<RideHub> _hub;
    public RideRealtimeNotifier(IHubContext<RideHub> hub) => _hub = hub;

    public Task NotifyRideStatusAsync(Guid rideId, RideStatusChangedEvent evt, CancellationToken ct = default)
        => _hub.Clients.Group(RideHub.GroupName(rideId)).SendAsync("ReceiveRideStatus", evt, ct);

    public Task NotifyNotificationAsync(Guid rideId, RideNotificationEvent evt, CancellationToken ct = default)
        => _hub.Clients.Group(RideHub.GroupName(rideId)).SendAsync("ReceiveNotification", evt, ct);

    public Task NotifyChatMessageAsync(Guid rideId, ChatMessageDto message, CancellationToken ct = default)
        => _hub.Clients.Group(RideHub.GroupName(rideId)).SendAsync("ReceiveChatMessage", message, ct);

    public Task NotifyUserAsync(Guid userId, NotificationDto notification, CancellationToken ct = default)
        => _hub.Clients.Group(RideHub.UserGroup(userId)).SendAsync("ReceiveUserNotification", notification, ct);

    public Task NotifySosAsync(Guid rideId, SosBroadcastEvent evt, CancellationToken ct = default)
        => _hub.Clients.Group(RideHub.GroupName(rideId)).SendAsync("ReceiveSos", evt, ct);
}

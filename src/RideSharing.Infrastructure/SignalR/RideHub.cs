using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RideSharing.Application.DTOs.Realtime;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.SignalR;

[Authorize]
public class RideHub : Hub
{
    public const string GroupPrefix = "ride-";
    public const string UserPrefix = "user-";

    private readonly RideSharingDbContext _db;
    private readonly ILogger<RideHub> _logger;

    public RideHub(RideSharingDbContext db, ILogger<RideHub> logger)
    {
        _db = db;
        _logger = logger;
    }

    public static string GroupName(Guid rideId) => $"{GroupPrefix}{rideId}";
    public static string UserGroup(Guid userId) => $"{UserPrefix}{userId}";

    private Guid? CurrentUserId
    {
        get
        {
            var id = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(id, out var g) ? g : null;
        }
    }

    public override async Task OnConnectedAsync()
    {
        if (CurrentUserId == null)
        {
            Context.Abort();
            return;
        }
        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(CurrentUserId.Value));
        await base.OnConnectedAsync();
    }

    public async Task JoinRide(string rideId)
    {
        if (!Guid.TryParse(rideId, out var id))
            throw new HubException("Invalid ride ID.");
        var userId = CurrentUserId ?? throw new HubException("Unauthorized.");

        var participant = await _db.RideParticipants.AsNoTracking()
            .FirstOrDefaultAsync(p => p.RideId == id && p.UserId == userId && !p.IsDeleted);
        if (participant == null)
            throw new HubException("You are not a participant of this ride.");

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(id));
        await Clients.Caller.SendAsync("JoinedRide", new { rideId = id, role = participant.Role.ToString() });
    }

    public async Task LeaveRide(string rideId)
    {
        if (!Guid.TryParse(rideId, out var id)) return;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(id));
        await Clients.Caller.SendAsync("LeftRide", new { rideId = id });
    }

    public async Task SendLocation(string rideId, double latitude, double longitude, double? accuracyMeters = null)
    {
        if (!Guid.TryParse(rideId, out var id))
            throw new HubException("Invalid ride ID.");
        if (latitude is < -90 or > 90 || longitude is < -180 or > 180)
            throw new HubException("Invalid coordinates.");

        var userId = CurrentUserId ?? throw new HubException("Unauthorized.");
        var ride = await _db.Rides.AsNoTracking().Include(r => r.Participants)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted)
            ?? throw new HubException("Ride not found.");

        var participant = ride.Participants.FirstOrDefault(p => p.UserId == userId && !p.IsDeleted)
            ?? throw new HubException("You are not a participant of this ride.");

        var allowed = ride.Status is RideStatus.Confirmed or RideStatus.DriverArriving
            or RideStatus.DriverArrived or RideStatus.InProgress;
        if (!allowed)
            throw new HubException($"Live location is not enabled for status {ride.Status}.");

        var payload = new RideLocationEvent
        {
            RideId = id, UserId = userId, Role = participant.Role.ToString(),
            Latitude = latitude, Longitude = longitude, AccuracyMeters = accuracyMeters, At = DateTime.UtcNow
        };
        await Clients.OthersInGroup(GroupName(id)).SendAsync("ReceiveLocation", payload);
    }
}

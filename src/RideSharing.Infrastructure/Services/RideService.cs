using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Rides;
using RideSharing.Application.Interfaces;
using RideSharing.Application.DTOs.Realtime;
using RideSharing.Domain.Common;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class RideService : IRideService
{
    private readonly RideSharingDbContext _db;
    private readonly IRideRealtimeNotifier _realtime;
    private readonly INotificationService _notifications;

    public RideService(RideSharingDbContext db, IRideRealtimeNotifier realtime, INotificationService notifications)
    {
        _db = db;
        _realtime = realtime;
        _notifications = notifications;
    }

    private async Task PublishStatusAsync(Guid rideId, string status, string? previous, string message, Guid? byUser)
    {
        try
        {
            await _realtime.NotifyRideStatusAsync(rideId, new RideStatusChangedEvent
            {
                RideId = rideId,
                Status = status,
                PreviousStatus = previous,
                Message = message,
                ChangedByUserId = byUser,
                At = DateTime.UtcNow
            });
            await _realtime.NotifyNotificationAsync(rideId, new RideNotificationEvent
            {
                RideId = rideId,
                Type = "status",
                Title = "Ride update",
                Message = message,
                At = DateTime.UtcNow
            });
        }
        catch { /* realtime must not break HTTP */ }

        try
        {
            var type = status switch
            {
                "Confirmed" => NotificationType.RideConfirmed,
                "DriverArriving" => NotificationType.DriverArriving,
                "DriverArrived" => NotificationType.DriverArrived,
                "InProgress" => NotificationType.RideStarted,
                "Completed" => NotificationType.RideCompleted,
                "Cancelled" => NotificationType.Cancellation,
                _ => NotificationType.General
            };
            await _notifications.CreateForRideParticipantsAsync(
                rideId, byUser, type, "Ride update", message, $"/app/rides/{rideId}");
        }
        catch { /* ignore notification failures */ }
    }

    public async Task<ApiResponse<RideDto>> CreateFromMatchAsync(Guid userId, Guid matchId)
    {
        var match = await _db.RideMatches
            .Include(m => m.RideRequest).ThenInclude(r => r!.Route)
            .Include(m => m.Vehicle)
            .FirstOrDefaultAsync(m => m.Id == matchId && !m.IsDeleted);

        if (match == null) return ApiResponse<RideDto>.FailureResponse("Match not found.");
        if (match.RideRequest.UserId != userId)
            return ApiResponse<RideDto>.FailureResponse("Only the passenger can create the ride from this match.");
        if (match.MatchedUserId == match.RideRequest.UserId)
            return ApiResponse<RideDto>.FailureResponse("Invalid match: driver and passenger are the same user.");
        if (match.Status != MatchStatus.Accepted && match.Status != MatchStatus.Pending)
            return ApiResponse<RideDto>.FailureResponse("Match must be pending or accepted.");

        if (match.Status == MatchStatus.Pending)
        {
            match.Status = MatchStatus.Accepted;
            match.UpdatedAt = DateTime.UtcNow;
            match.RideRequest.Status = RideRequestStatus.Matched;
        }

        if (await _db.Rides.AsNoTracking().AnyAsync(r => r.RideMatchId == matchId && !r.IsDeleted))
            return ApiResponse<RideDto>.FailureResponse("A ride already exists for this match.");

        var route = match.RideRequest.Route;
        var rideId = Guid.NewGuid();
        _db.Rides.Add(new Ride
        {
            Id = rideId,
            RideRequestId = match.RideRequestId,
            RideMatchId = match.Id,
            RouteId = route.Id,
            VehicleId = match.VehicleId,
            TravelDate = match.RideRequest.TravelDate,
            ScheduledDepartureTime = match.RideRequest.PreferredDepartureTime,
            Status = RideStatus.Matched,
            CreatedAt = DateTime.UtcNow
        });
        _db.RideParticipants.Add(new RideParticipant
        {
            Id = Guid.NewGuid(), RideId = rideId, UserId = match.RideRequest.UserId,
            Role = ParticipantRole.Passenger, CreatedAt = DateTime.UtcNow
        });
        _db.RideParticipants.Add(new RideParticipant
        {
            Id = Guid.NewGuid(), RideId = rideId, UserId = match.MatchedUserId,
            Role = ParticipantRole.Driver, CreatedAt = DateTime.UtcNow
        });
        _db.RideHistories.Add(new RideHistory
        {
            Id = Guid.NewGuid(), RideId = rideId,
            FromStatus = RideStatus.Requested, ToStatus = RideStatus.Matched,
            ChangedByUserId = userId, Note = "Ride created from accepted match",
            ChangedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return ApiResponse<RideDto>.SuccessResponse(await LoadDto(rideId), "Ride created.");
    }

    public async Task<ApiResponse<List<RideDto>>> GetMyRidesAsync(Guid userId, string? filter = null)
    {
        var query = _db.Rides.AsNoTracking()
            .Include(r => r.Route).Include(r => r.Vehicle)
            .Include(r => r.Participants).ThenInclude(p => p.User)
            .Include(r => r.History)
            .Where(r => !r.IsDeleted && r.Participants.Any(p => p.UserId == userId && !p.IsDeleted));

        filter = filter?.ToLowerInvariant();
        query = filter switch
        {
            "upcoming" => query.Where(r => r.Status == RideStatus.Matched || r.Status == RideStatus.Confirmed
                || r.Status == RideStatus.DriverArriving || r.Status == RideStatus.DriverArrived),
            "active" => query.Where(r => r.Status == RideStatus.DriverArriving || r.Status == RideStatus.DriverArrived
                || r.Status == RideStatus.InProgress),
            "history" => query.Where(r => r.Status == RideStatus.Completed || r.Status == RideStatus.Cancelled),
            _ => query
        };
        var list = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return ApiResponse<List<RideDto>>.SuccessResponse(list.Select(Map).ToList());
    }

    public async Task<ApiResponse<RideDto>> GetByIdAsync(Guid id, Guid userId, bool isAdmin)
    {
        var ride = await LoadRide(id);
        if (ride == null) return ApiResponse<RideDto>.FailureResponse("Ride not found.");
        if (!isAdmin && !ride.Participants.Any(p => p.UserId == userId))
            return ApiResponse<RideDto>.FailureResponse("Not allowed.");
        return ApiResponse<RideDto>.SuccessResponse(Map(ride));
    }

    public async Task<ApiResponse<RideDto>> ConfirmAsync(Guid id, Guid userId)
    {
        _db.ChangeTracker.Clear();
        var ride = await _db.Rides.Include(r => r.Participants)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        if (ride == null) return ApiResponse<RideDto>.FailureResponse("Ride not found.");

        var participant = ride.Participants.FirstOrDefault(p => p.UserId == userId && !p.IsDeleted);
        if (participant == null) return ApiResponse<RideDto>.FailureResponse("Not allowed.");
        if (ride.Status != RideStatus.Matched)
            return ApiResponse<RideDto>.FailureResponse($"Cannot confirm from status {ride.Status}.");
        if (participant.HasConfirmed)
            return ApiResponse<RideDto>.SuccessResponse(await LoadDto(id), "Already confirmed.");

        participant.HasConfirmed = true;
        participant.ConfirmedAt = DateTime.UtcNow;
        participant.UpdatedAt = DateTime.UtcNow;

        var allConfirmed = ride.Participants.Where(p => !p.IsDeleted).All(p => p.HasConfirmed);
        if (allConfirmed)
        {
            try { RideStateMachine.EnsureCanTransition(ride.Status, RideStatus.Confirmed); }
            catch (InvalidOperationException ex) { return ApiResponse<RideDto>.FailureResponse(ex.Message); }
            var from = ride.Status;
            ride.Status = RideStatus.Confirmed;
            ride.ConfirmedAt = DateTime.UtcNow;
            ride.UpdatedAt = DateTime.UtcNow;
            _db.RideHistories.Add(new RideHistory
            {
                Id = Guid.NewGuid(), RideId = ride.Id, FromStatus = from, ToStatus = RideStatus.Confirmed,
                ChangedByUserId = userId, Note = "Both parties confirmed",
                ChangedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            _db.RideHistories.Add(new RideHistory
            {
                Id = Guid.NewGuid(), RideId = ride.Id, FromStatus = ride.Status, ToStatus = ride.Status,
                ChangedByUserId = userId, Note = $"{participant.Role} confirmed",
                ChangedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow
            });
        }

        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            _db.ChangeTracker.Clear();
            return ApiResponse<RideDto>.FailureResponse("Data changed. Refresh and try Confirm again.");
        }

        var confirmMsg = allConfirmed
            ? "Both parties confirmed. Ride is confirmed."
            : "Your confirmation recorded. Waiting for the other party.";
        var dto = await LoadDto(id);
        await PublishStatusAsync(id, dto.Status, null, confirmMsg, userId);
        return ApiResponse<RideDto>.SuccessResponse(dto, confirmMsg);
    }

    public Task<ApiResponse<RideDto>> MarkDriverArrivingAsync(Guid id, Guid userId)
        => SimpleTransition(id, userId, RideStatus.DriverArriving, true, "Driver is arriving");

    public Task<ApiResponse<RideDto>> MarkDriverArrivedAsync(Guid id, Guid userId)
        => SimpleTransition(id, userId, RideStatus.DriverArrived, true, "Driver arrived");

    public async Task<ApiResponse<RideDto>> StartAsync(Guid id, Guid userId)
    {
        var result = await SimpleTransition(id, userId, RideStatus.InProgress, false, "Ride started");
        if (!result.Success) return result;
        var ride = await _db.Rides.FirstOrDefaultAsync(r => r.Id == id);
        if (ride != null) { ride.StartedAt = DateTime.UtcNow; await _db.SaveChangesAsync(); }
        return ApiResponse<RideDto>.SuccessResponse(await LoadDto(id), "Ride started.");
    }

    public async Task<ApiResponse<RideDto>> CompleteAsync(Guid id, Guid userId)
    {
        var result = await SimpleTransition(id, userId, RideStatus.Completed, false, "Ride completed");
        if (!result.Success) return result;
        var ride = await _db.Rides.FirstOrDefaultAsync(r => r.Id == id);
        if (ride != null) { ride.CompletedAt = DateTime.UtcNow; ride.FareAmount ??= 0; await _db.SaveChangesAsync(); }
        return ApiResponse<RideDto>.SuccessResponse(await LoadDto(id), "Ride completed.");
    }

    public async Task<ApiResponse<RideDto>> CancelAsync(Guid id, Guid userId, string? reason)
    {
        _db.ChangeTracker.Clear();
        var ride = await _db.Rides.Include(r => r.Participants).FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        if (ride == null) return ApiResponse<RideDto>.FailureResponse("Ride not found.");
        if (!ride.Participants.Any(p => p.UserId == userId && !p.IsDeleted))
            return ApiResponse<RideDto>.FailureResponse("Not allowed.");
        try { RideStateMachine.EnsureCanTransition(ride.Status, RideStatus.Cancelled); }
        catch (InvalidOperationException ex) { return ApiResponse<RideDto>.FailureResponse(ex.Message); }

        var from = ride.Status;
        ride.Status = RideStatus.Cancelled;
        ride.CancelledAt = DateTime.UtcNow;
        ride.CancellationReason = reason;
        ride.UpdatedAt = DateTime.UtcNow;
        _db.RideHistories.Add(new RideHistory
        {
            Id = Guid.NewGuid(), RideId = ride.Id, FromStatus = from, ToStatus = RideStatus.Cancelled,
            ChangedByUserId = userId, Note = reason ?? "Cancelled by user",
            ChangedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow
        });
        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            return ApiResponse<RideDto>.FailureResponse("Concurrent update. Refresh and try again.");
        }
        await PublishStatusAsync(id, RideStatus.Cancelled.ToString(), from.ToString(), "Ride cancelled.", userId);
        return ApiResponse<RideDto>.SuccessResponse(await LoadDto(id), "Ride cancelled.");
    }

    private async Task<ApiResponse<RideDto>> SimpleTransition(Guid id, Guid userId, RideStatus to, bool driverOnly, string note)
    {
        _db.ChangeTracker.Clear();
        var ride = await _db.Rides.Include(r => r.Participants).FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        if (ride == null) return ApiResponse<RideDto>.FailureResponse("Ride not found.");
        var isDriver = ride.Participants.Any(p => p.UserId == userId && p.Role == ParticipantRole.Driver && !p.IsDeleted);
        var isPart = ride.Participants.Any(p => p.UserId == userId && !p.IsDeleted);
        if (driverOnly && !isDriver) return ApiResponse<RideDto>.FailureResponse("Only the driver can perform this action.");
        if (!driverOnly && !isPart) return ApiResponse<RideDto>.FailureResponse("Not allowed.");
        try { RideStateMachine.EnsureCanTransition(ride.Status, to); }
        catch (InvalidOperationException ex) { return ApiResponse<RideDto>.FailureResponse(ex.Message); }

        var from = ride.Status;
        ride.Status = to;
        ride.UpdatedAt = DateTime.UtcNow;
        _db.RideHistories.Add(new RideHistory
        {
            Id = Guid.NewGuid(), RideId = ride.Id, FromStatus = from, ToStatus = to,
            ChangedByUserId = userId, Note = note, ChangedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow
        });
        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            return ApiResponse<RideDto>.FailureResponse("Concurrent update. Refresh and try again.");
        }
        await PublishStatusAsync(id, to.ToString(), from.ToString(), note, userId);
        return ApiResponse<RideDto>.SuccessResponse(await LoadDto(id), note);
    }

    private async Task<Ride?> LoadRide(Guid id) =>
        await _db.Rides.AsNoTracking()
            .Include(r => r.Route).Include(r => r.Vehicle)
            .Include(r => r.Participants).ThenInclude(p => p.User)
            .Include(r => r.History)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

    private async Task<RideDto> LoadDto(Guid id) => Map((await LoadRide(id))!);

    private static RideDto Map(Ride r) => new()
    {
        Id = r.Id, RouteId = r.RouteId,
        SourceAddress = r.Route?.SourceAddress ?? "", DestinationAddress = r.Route?.DestinationAddress ?? "",
        TravelDate = r.TravelDate, ScheduledDepartureTime = r.ScheduledDepartureTime.ToString("HH:mm"),
        Status = r.Status.ToString(), VehicleId = r.VehicleId,
        VehicleInfo = r.Vehicle != null ? $"{r.Vehicle.Make} {r.Vehicle.Model}" : null,
        FareAmount = r.FareAmount, CancellationReason = r.CancellationReason,
        ConfirmedAt = r.ConfirmedAt, StartedAt = r.StartedAt, CompletedAt = r.CompletedAt, CreatedAt = r.CreatedAt,
        Participants = r.Participants?.Where(p => !p.IsDeleted).Select(p => new RideParticipantDto
        {
            UserId = p.UserId,
            FullName = p.User != null ? $"{p.User.FirstName} {p.User.LastName}" : "",
            Role = p.Role.ToString(), HasConfirmed = p.HasConfirmed
        }).ToList() ?? new(),
        History = r.History?.OrderBy(h => h.ChangedAt).Select(h => new RideHistoryItemDto
        {
            FromStatus = h.FromStatus.ToString(), ToStatus = h.ToStatus.ToString(),
            Note = h.Note, ChangedAt = h.ChangedAt
        }).ToList() ?? new()
    };
}

using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Safety;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class SafetyService : ISafetyService
{
    private readonly RideSharingDbContext _db;
    private readonly IRideRealtimeNotifier _realtime;
    private readonly INotificationService _notifications;

    public SafetyService(RideSharingDbContext db, IRideRealtimeNotifier realtime, INotificationService notifications)
    {
        _db = db;
        _realtime = realtime;
        _notifications = notifications;
    }

    public async Task<ApiResponse<SafetySettingsDto>> GetSettingsAsync(Guid userId)
    {
        var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId);
        if (u == null) return ApiResponse<SafetySettingsDto>.FailureResponse("User not found.");
        return ApiResponse<SafetySettingsDto>.SuccessResponse(new SafetySettingsDto
        {
            WomenOnlyPreference = u.WomenOnlyPreference,
            Gender = u.Gender.ToString(),
            AverageRating = u.AverageRating,
            RatingCount = u.RatingCount,
            IsFlaggedForReview = u.IsFlaggedForReview
        });
    }

    public async Task<ApiResponse<SafetySettingsDto>> UpdateSettingsAsync(Guid userId, UpdateSafetySettingsRequest request)
    {
        var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (u == null) return ApiResponse<SafetySettingsDto>.FailureResponse("User not found.");

        if (request.WomenOnlyPreference && u.Gender != Gender.Female)
            return ApiResponse<SafetySettingsDto>.FailureResponse("Women-only preference is only available for female accounts.");

        u.WomenOnlyPreference = request.WomenOnlyPreference;
        u.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetSettingsAsync(userId);
    }

    public async Task<ApiResponse<List<EmergencyContactDto>>> GetContactsAsync(Guid userId)
    {
        var list = await _db.EmergencyContacts.AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.IsPrimary)
            .ThenBy(c => c.Name)
            .ToListAsync();
        return ApiResponse<List<EmergencyContactDto>>.SuccessResponse(list.Select(MapContact).ToList());
    }

    public async Task<ApiResponse<EmergencyContactDto>> AddContactAsync(Guid userId, UpsertEmergencyContactRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.PhoneNumber))
            return ApiResponse<EmergencyContactDto>.FailureResponse("Name and phone are required.");

        if (request.IsPrimary)
        {
            var existing = await _db.EmergencyContacts.Where(c => c.UserId == userId && c.IsPrimary).ToListAsync();
            foreach (var c in existing) c.IsPrimary = false;
        }

        var entity = new EmergencyContact
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Relationship = request.Relationship?.Trim(),
            IsPrimary = request.IsPrimary,
            CreatedAt = DateTime.UtcNow
        };
        _db.EmergencyContacts.Add(entity);
        await _db.SaveChangesAsync();
        return ApiResponse<EmergencyContactDto>.SuccessResponse(MapContact(entity), "Contact saved.");
    }

    public async Task<ApiResponse<object>> DeleteContactAsync(Guid userId, Guid contactId)
    {
        var c = await _db.EmergencyContacts.FirstOrDefaultAsync(x => x.Id == contactId && x.UserId == userId);
        if (c == null) return ApiResponse<object>.FailureResponse("Not found.");
        c.IsDeleted = true;
        c.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ApiResponse<object>.SuccessResponse(new { });
    }

    public async Task<ApiResponse<EmergencyAlertDto>> TriggerSosAsync(Guid userId, TriggerSosRequest request)
    {
        var ride = await _db.Rides.Include(r => r.Participants).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(r => r.Id == request.RideId && !r.IsDeleted);
        if (ride == null) return ApiResponse<EmergencyAlertDto>.FailureResponse("Ride not found.");

        if (!ride.Participants.Any(p => p.UserId == userId && !p.IsDeleted))
            return ApiResponse<EmergencyAlertDto>.FailureResponse("Only ride participants can trigger SOS.");

        var active = ride.Status is RideStatus.Confirmed or RideStatus.DriverArriving
            or RideStatus.DriverArrived or RideStatus.InProgress;
        if (!active)
            return ApiResponse<EmergencyAlertDto>.FailureResponse("SOS is only available during an active ride.");

        var user = ride.Participants.First(p => p.UserId == userId).User;
        var alert = new EmergencyAlert
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RideId = ride.Id,
            TriggeredAt = DateTime.UtcNow,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Note = request.Note?.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        _db.EmergencyAlerts.Add(alert);
        await _db.SaveChangesAsync();

        var evt = new SosBroadcastEvent
        {
            AlertId = alert.Id,
            RideId = ride.Id,
            UserId = userId,
            UserName = $"{user.FirstName} {user.LastName}".Trim(),
            Latitude = alert.Latitude,
            Longitude = alert.Longitude,
            Note = alert.Note,
            TriggeredAt = alert.TriggeredAt
        };

        // Real-time to ride participants only (not global)
        await _realtime.NotifySosAsync(ride.Id, evt);

        // Notify other participants + store system notifications
        foreach (var p in ride.Participants.Where(p => !p.IsDeleted && p.UserId != userId))
        {
            await _notifications.CreateForUserAsync(
                p.UserId,
                NotificationType.Sos,
                "SOS alert",
                $"{evt.UserName} triggered SOS on your ride.",
                ride.Id,
                $"/app/rides/{ride.Id}");
        }
        return ApiResponse<EmergencyAlertDto>.SuccessResponse(new EmergencyAlertDto
        {
            Id = alert.Id,
            RideId = ride.Id,
            UserId = userId,
            UserName = evt.UserName,
            TriggeredAt = alert.TriggeredAt,
            Latitude = alert.Latitude,
            Longitude = alert.Longitude,
            Note = alert.Note,
            IsResolved = false
        }, "SOS sent to ride participants and recorded.");
    }

    public async Task<ApiResponse<List<EmergencyAlertDto>>> GetRideAlertsAsync(Guid rideId, Guid userId)
    {
        var isPart = await _db.RideParticipants.AnyAsync(p => p.RideId == rideId && p.UserId == userId && !p.IsDeleted);
        var isAdmin = await _db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.Role.Name == "Admin");
        if (!isPart && !isAdmin)
            return ApiResponse<List<EmergencyAlertDto>>.FailureResponse("Not allowed.");

        var list = await _db.EmergencyAlerts.AsNoTracking()
            .Include(a => a.User)
            .Where(a => a.RideId == rideId)
            .OrderByDescending(a => a.TriggeredAt)
            .ToListAsync();

        return ApiResponse<List<EmergencyAlertDto>>.SuccessResponse(
    list.Select(a => new EmergencyAlertDto
    {
        Id = a.Id,
        RideId = rideId,
        UserId = a.UserId,
        UserName = a.User != null
            ? $"{a.User.FirstName} {a.User.LastName}".Trim()
            : "",
        TriggeredAt = a.TriggeredAt,
        Latitude = a.Latitude,
        Longitude = a.Longitude,
        Note = a.Note,
        IsResolved = a.IsResolved
    }).ToList());
    }

    private static EmergencyContactDto MapContact(EmergencyContact c) => new()
    {
        Id = c.Id, Name = c.Name, PhoneNumber = c.PhoneNumber,
        Relationship = c.Relationship, IsPrimary = c.IsPrimary
    };
}

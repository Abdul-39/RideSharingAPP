using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RideSharing.Application.DTOs.Emergency;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Emergency;

public class EmergencyService : IEmergencyService
{
    private readonly RideSharingDbContext _db;
    private readonly ILogger<EmergencyService> _log;
    private readonly IHubContext? _hub;

    public EmergencyService(RideSharingDbContext db, ILogger<EmergencyService> log, IServiceProvider sp)
    {
        _db = db;
        _log = log;
        try
        {
            var hubType = AppDomain.CurrentDomain.GetAssemblies()
                .SelectMany(a =>
                {
                    try { return a.GetTypes(); }
                    catch { return Type.EmptyTypes; }
                })
                .FirstOrDefault(t => t.Name == "RideHub");
            if (hubType != null)
            {
                var ctxType = typeof(IHubContext<>).MakeGenericType(hubType);
                _hub = sp.GetService(ctxType) as IHubContext;
            }
        }
        catch { /* SignalR optional */ }
    }

    public async Task<SosDto> ActivateSosAsync(Guid userId, ActivateSosRequest request, CancellationToken ct = default)
    {
        // RideId is Guid? — only use when has value
        Guid? rideId = request.RideId;

        var alert = new EmergencyAlert
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RideId = rideId, // Guid? ok on entity
            Type = request.Type,
            Status = EmergencyStatus.Active,
            IsResolved = false,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Note = request.Notes,
            TriggeredAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<EmergencyAlert>().Add(alert);
        await _db.SaveChangesAsync(ct);

        var contactCount = await _db.Set<EmergencyContact>()
            .CountAsync(c => c.UserId == userId, ct);

        _log.LogWarning(
            "SOS TriggeredAt={Time} user={User} ride={Ride} contacts={Count}. Contact notification only.",
            alert.TriggeredAt, userId, rideId, contactCount);

        if (_hub != null && rideId.HasValue)
        {
            try
            {
                // Use .Value — Guid not Guid?
                Guid rideIdValue = rideId.Value;
                await _hub.Clients.Group($"ride-{rideIdValue}").SendAsync("SosActivated", new
                {
                    alertId = alert.Id,
                    rideId = rideIdValue,
                    userId,
                    latitude = request.Latitude,
                    longitude = request.Longitude,
                    triggeredAt = alert.TriggeredAt
                }, ct);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "SignalR SOS failed");
            }
        }

        return ToDto(alert,
            "Emergency alert activated. Authorized contacts can be notified. " +
            "This does not automatically dispatch police or Rescue 1122.");
    }

    public async Task<IReadOnlyList<SosDto>> GetMyAlertsAsync(Guid userId, CancellationToken ct = default)
    {
        var list = await _db.Set<EmergencyAlert>().AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.TriggeredAt)
            .ToListAsync(ct);
        return list.Select(a => ToDto(a, "")).ToList();
    }

    public async Task<SosDto?> GetAsync(Guid userId, Guid alertId, CancellationToken ct = default)
    {
        var a = await _db.Set<EmergencyAlert>().AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == alertId && x.UserId == userId, ct);
        return a == null ? null : ToDto(a, "");
    }

    public async Task<SosDto> ResolveAsync(Guid userId, Guid alertId, CancellationToken ct = default)
    {
        var a = await _db.Set<EmergencyAlert>()
            .FirstOrDefaultAsync(x => x.Id == alertId && x.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Alert not found");

        a.IsResolved = true;
        a.Status = EmergencyStatus.Resolved;
        a.ResolvedAt = DateTime.UtcNow;
        a.ResolvedByNote = "Resolved by user";
        a.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return ToDto(a, "Emergency marked resolved.");
    }

    public async Task<IReadOnlyList<EmergencyContactDto>> GetContactsAsync(Guid userId, CancellationToken ct = default)
    {
        return await _db.Set<EmergencyContact>().AsNoTracking()
            .Where(c => c.UserId == userId)
            .Select(c => new EmergencyContactDto
            {
                Id = c.Id,
                Name = c.Name,
                PhoneNumber = c.PhoneNumber,
                Relationship = c.Relationship,
                IsPrimary = c.IsPrimary
            }).ToListAsync(ct);
    }

    public async Task<EmergencyContactDto> AddContactAsync(
        Guid userId, CreateEmergencyContactRequest req, CancellationToken ct = default)
    {
        var c = new EmergencyContact
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = req.Name.Trim(),
            PhoneNumber = req.PhoneNumber.Trim(),
            Relationship = req.Relationship,
            IsPrimary = req.IsPrimary,
            CreatedAt = DateTime.UtcNow
        };
        _db.Set<EmergencyContact>().Add(c);
        await _db.SaveChangesAsync(ct);
        return new EmergencyContactDto
        {
            Id = c.Id,
            Name = c.Name,
            PhoneNumber = c.PhoneNumber,
            Relationship = c.Relationship,
            IsPrimary = c.IsPrimary
        };
    }

    private static SosDto ToDto(EmergencyAlert a, string msg) => new()
    {
        Id = a.Id,
        UserId = a.UserId,
        RideId = a.RideId, // Guid? on DTO if defined as Guid?
        Type = a.Type.ToString(),
        Status = a.Status.ToString(),
        Latitude = a.Latitude,
        Longitude = a.Longitude,
        PlaceName = a.PlaceName,
        ActivatedAt = a.TriggeredAt,
        ResolvedAt = a.ResolvedAt,
        Message = msg
    };
}

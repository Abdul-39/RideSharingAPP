using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Routes;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class RouteService : IRouteService
{
    private readonly RideSharingDbContext _db;

    public RouteService(RideSharingDbContext db) => _db = db;

    public async Task<ApiResponse<List<RouteDto>>> GetMyRoutesAsync(Guid userId)
    {
        var routes = await _db.Routes
            .Include(r => r.RideSchedules.Where(s => !s.IsDeleted))
            .Where(r => r.UserId == userId && !r.IsDeleted)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return ApiResponse<List<RouteDto>>.SuccessResponse(routes.Select(Map).ToList());
    }

    public async Task<ApiResponse<RouteDto>> GetByIdAsync(Guid id, Guid userId, bool isAdmin)
    {
        var route = await _db.Routes
            .Include(r => r.RideSchedules.Where(s => !s.IsDeleted))
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (route == null)
            return ApiResponse<RouteDto>.FailureResponse("Route not found.");

        if (!isAdmin && route.UserId != userId)
            return ApiResponse<RouteDto>.FailureResponse("You are not allowed to view this route.");

        return ApiResponse<RouteDto>.SuccessResponse(Map(route));
    }

    public async Task<ApiResponse<RouteDto>> CreateAsync(Guid userId, CreateRouteRequest request)
    {
        if (!TimeOnly.TryParse(request.PreferredDepartureTime, out var departure))
            return ApiResponse<RouteDto>.FailureResponse("Invalid departure time.");

        var route = new Route
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SourceLatitude = request.SourceLatitude,
            SourceLongitude = request.SourceLongitude,
            SourceAddress = request.SourceAddress.Trim(),
            DestinationLatitude = request.DestinationLatitude,
            DestinationLongitude = request.DestinationLongitude,
            DestinationAddress = request.DestinationAddress.Trim(),
            PreferredDepartureTime = departure,
            MaximumTimeToleranceMinutes = request.MaximumTimeToleranceMinutes,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var s in request.Schedules ?? new())
        {
            if (!s.HasAnyDay) continue;
            route.RideSchedules.Add(new RideSchedule
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                RouteId = route.Id,
                Monday = s.Monday,
                Tuesday = s.Tuesday,
                Wednesday = s.Wednesday,
                Thursday = s.Thursday,
                Friday = s.Friday,
                Saturday = s.Saturday,
                Sunday = s.Sunday,
                IsActive = s.IsActive,
                EffectiveFrom = s.EffectiveFrom,
                EffectiveTo = s.EffectiveTo,
                CreatedAt = DateTime.UtcNow
            });
        }

        _db.Routes.Add(route);
        await _db.SaveChangesAsync();

        return ApiResponse<RouteDto>.SuccessResponse(Map(route), "Route created.");
    }

    public async Task<ApiResponse<RouteDto>> UpdateAsync(Guid id, Guid userId, bool isAdmin, UpdateRouteRequest request)
    {
        // Avoid soft-delete + query-filter concurrency issues
        _db.ChangeTracker.Clear();

        var route = await _db.Routes
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (route == null)
            return ApiResponse<RouteDto>.FailureResponse("Route not found.");

        if (!isAdmin && route.UserId != userId)
            return ApiResponse<RouteDto>.FailureResponse("You are not allowed to modify this route.");

        if (!TimeOnly.TryParse(request.PreferredDepartureTime, out var departure))
            return ApiResponse<RouteDto>.FailureResponse("Invalid departure time.");

        route.SourceLatitude = request.SourceLatitude;
        route.SourceLongitude = request.SourceLongitude;
        route.SourceAddress = request.SourceAddress.Trim();
        route.DestinationLatitude = request.DestinationLatitude;
        route.DestinationLongitude = request.DestinationLongitude;
        route.DestinationAddress = request.DestinationAddress.Trim();
        route.PreferredDepartureTime = departure;
        route.MaximumTimeToleranceMinutes = request.MaximumTimeToleranceMinutes;
        route.IsActive = request.IsActive;
        route.UpdatedAt = DateTime.UtcNow;

        // Soft-delete existing schedules via ExecuteUpdate (no tracked entity conflict)
        await _db.RideSchedules
            .IgnoreQueryFilters()
            .Where(s => s.RouteId == id && !s.IsDeleted)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.IsDeleted, true)
                .SetProperty(s => s.DeletedAt, DateTime.UtcNow)
                .SetProperty(s => s.IsActive, false)
                .SetProperty(s => s.UpdatedAt, DateTime.UtcNow));

        // Add new schedules
        foreach (var s in request.Schedules ?? new())
        {
            if (!s.HasAnyDay) continue;
            _db.RideSchedules.Add(new RideSchedule
            {
                Id = Guid.NewGuid(),
                UserId = route.UserId,
                RouteId = route.Id,
                Monday = s.Monday,
                Tuesday = s.Tuesday,
                Wednesday = s.Wednesday,
                Thursday = s.Thursday,
                Friday = s.Friday,
                Saturday = s.Saturday,
                Sunday = s.Sunday,
                IsActive = s.IsActive,
                EffectiveFrom = s.EffectiveFrom,
                EffectiveTo = s.EffectiveTo,
                CreatedAt = DateTime.UtcNow
            });
        }

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            _db.ChangeTracker.Clear();
            return ApiResponse<RouteDto>.FailureResponse(
                "Could not update route (concurrent change). Refresh and try again.");
        }

        // Reload for response
        var updated = await _db.Routes.AsNoTracking()
            .Include(r => r.RideSchedules.Where(s => !s.IsDeleted))
            .FirstAsync(r => r.Id == id);

        return ApiResponse<RouteDto>.SuccessResponse(Map(updated), "Route updated.");
    }

    public async Task<ApiResponse> DeleteAsync(Guid id, Guid userId, bool isAdmin)
    {
        var route = await _db.Routes
            .Include(r => r.RideSchedules)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (route == null)
            return ApiResponse.FailureResponse("Route not found.");

        if (!isAdmin && route.UserId != userId)
            return ApiResponse.FailureResponse("You are not allowed to delete this route.");

        route.IsDeleted = true;
        route.DeletedAt = DateTime.UtcNow;
        route.IsActive = false;
        route.UpdatedAt = DateTime.UtcNow;

        foreach (var s in route.RideSchedules.Where(x => !x.IsDeleted))
        {
            s.IsDeleted = true;
            s.DeletedAt = DateTime.UtcNow;
            s.IsActive = false;
        }

        await _db.SaveChangesAsync();
        return ApiResponse.SuccessResponse("Route deleted.");
    }

    private static RouteDto Map(Route r) => new()
    {
        Id = r.Id,
        UserId = r.UserId,
        SourceLatitude = r.SourceLatitude,
        SourceLongitude = r.SourceLongitude,
        SourceAddress = r.SourceAddress,
        DestinationLatitude = r.DestinationLatitude,
        DestinationLongitude = r.DestinationLongitude,
        DestinationAddress = r.DestinationAddress,
        PreferredDepartureTime = r.PreferredDepartureTime.ToString("HH:mm"),
        MaximumTimeToleranceMinutes = r.MaximumTimeToleranceMinutes,
        IsActive = r.IsActive,
        CreatedAt = r.CreatedAt,
        Schedules = r.RideSchedules?
            .Where(s => !s.IsDeleted)
            .Select(s => new ScheduleDto
            {
                Id = s.Id,
                Monday = s.Monday,
                Tuesday = s.Tuesday,
                Wednesday = s.Wednesday,
                Thursday = s.Thursday,
                Friday = s.Friday,
                Saturday = s.Saturday,
                Sunday = s.Sunday,
                IsActive = s.IsActive,
                EffectiveFrom = s.EffectiveFrom,
                EffectiveTo = s.EffectiveTo
            }).ToList() ?? new()
    };
}

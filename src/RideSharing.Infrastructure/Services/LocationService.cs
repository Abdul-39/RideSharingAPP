using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Location;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class LocationService : ILocationService
{
    private readonly RideSharingDbContext _db;
    private readonly IMapsService _maps;

    public LocationService(RideSharingDbContext db, IMapsService maps)
    {
        _db = db;
        _maps = maps;
    }

    public async Task<ApiResponse<UserLocationDto>> UpdateMyLocationAsync(Guid userId, UpdateLocationRequest request)
    {
        if (request.Latitude is < -90 or > 90 || request.Longitude is < -180 or > 180)
            return ApiResponse<UserLocationDto>.FailureResponse("Invalid coordinates.");

        // Privacy: active-ride tracking only when ride is in progress-like states and user is participant
        if (request.ActiveRideId.HasValue)
        {
            var ride = await _db.Rides.Include(r => r.Participants)
                .FirstOrDefaultAsync(r => r.Id == request.ActiveRideId && !r.IsDeleted);
            if (ride == null)
                return ApiResponse<UserLocationDto>.FailureResponse("Active ride not found.");
            if (!ride.Participants.Any(p => p.UserId == userId && !p.IsDeleted))
                return ApiResponse<UserLocationDto>.FailureResponse("Not a participant of this ride.");
            var allowed = ride.Status is RideStatus.Confirmed or RideStatus.DriverArriving
                or RideStatus.DriverArrived or RideStatus.InProgress;
            if (!allowed)
                return ApiResponse<UserLocationDto>.FailureResponse("Live tracking is only enabled during an active ride.");
        }

        // Mark previous current locations as not current
        var previous = await _db.UserLocations
            .Where(l => l.UserId == userId && l.IsCurrent && !l.IsDeleted)
            .ToListAsync();
        foreach (var p in previous)
        {
            p.IsCurrent = false;
            p.UpdatedAt = DateTime.UtcNow;
        }

        var shareMode = Enum.IsDefined(typeof(LocationShareMode), request.ShareMode)
            ? (LocationShareMode)request.ShareMode
            : LocationShareMode.ActiveRideOnly;

        var entity = new UserLocation
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Latitude = (decimal)request.Latitude,
            Longitude = (decimal)request.Longitude,
            AccuracyMeters = request.AccuracyMeters,
            RecordedAt = DateTime.UtcNow,
            Label = request.Label,
            IsCurrent = true,
            ShareMode = shareMode,
            ActiveRideId = request.ActiveRideId,
            CreatedAt = DateTime.UtcNow
        };
        _db.UserLocations.Add(entity);
        await _db.SaveChangesAsync();
        return ApiResponse<UserLocationDto>.SuccessResponse(Map(entity), "Location updated.");
    }

    public async Task<ApiResponse<UserLocationDto?>> GetMyCurrentLocationAsync(Guid userId)
    {
        var loc = await _db.UserLocations.AsNoTracking()
            .Where(l => l.UserId == userId && l.IsCurrent && !l.IsDeleted)
            .OrderByDescending(l => l.RecordedAt)
            .FirstOrDefaultAsync();
        return ApiResponse<UserLocationDto?>.SuccessResponse(loc == null ? null : Map(loc));
    }

    public async Task<ApiResponse<RouteCalculationResultDto>> CalculateRouteAsync(RouteCalculationRequest request)
    {
        var result = await _maps.CalculateRouteAsync(request);
        return ApiResponse<RouteCalculationResultDto>.SuccessResponse(result);
    }

    public async Task<ApiResponse<List<NearbyDriverDto>>> GetNearbyDriversAsync(Guid requesterId, double lat, double lng, double radiusKm = 5)
    {
        // Only drivers who opted into sharing and have a recent current location
        var cutoff = DateTime.UtcNow.AddMinutes(-15);
        var candidates = await _db.UserLocations.AsNoTracking()
            .Include(l => l.User)
            .Where(l => l.IsCurrent && !l.IsDeleted
                && l.UserId != requesterId
                && l.RecordedAt >= cutoff
                && (l.ShareMode == LocationShareMode.AlwaysWhileOnline
                    || (l.ShareMode == LocationShareMode.ActiveRideOnly && l.ActiveRideId != null)))
            .ToListAsync();

        var driverIds = await _db.UserRoles.AsNoTracking()
            .Include(ur => ur.Role)
            .Where(ur => ur.Role.Name == "Driver")
            .Select(ur => ur.UserId)
            .ToListAsync();

        var available = await _db.DriverProfiles.AsNoTracking()
            .Where(d => d.IsAvailable && !d.IsDeleted)
            .Select(d => d.UserId)
            .ToListAsync();

        var vehicles = await _db.Vehicles.AsNoTracking()
            .Where(v => v.IsActive && !v.IsDeleted)
            .ToListAsync();

        var list = new List<NearbyDriverDto>();
        foreach (var loc in candidates)
        {
            if (!driverIds.Contains(loc.UserId) || !available.Contains(loc.UserId))
                continue;
            var dist = GoogleMapsService.HaversineKm(lat, lng,
                (double)loc.Latitude, (double)loc.Longitude);
            if (dist > radiusKm) continue;
            var v = vehicles.FirstOrDefault(x => x.DriverId == loc.UserId);
            list.Add(new NearbyDriverDto
            {
                UserId = loc.UserId,
                FullName = $"{loc.User.FirstName} {loc.User.LastName}",
                Latitude = (double)loc.Latitude,
                Longitude = (double)loc.Longitude,
                DistanceKm = Math.Round(dist, 2),
                RecordedAt = loc.RecordedAt,
                VehicleInfo = v != null ? $"{v.Make} {v.Model}" : null
            });
        }

        return ApiResponse<List<NearbyDriverDto>>.SuccessResponse(
            list.OrderBy(x => x.DistanceKm).Take(20).ToList());
    }

    public async Task<ApiResponse<List<PlaceSearchResultDto>>> SearchPlacesAsync(string query)
    {
        var results = await _maps.SearchPlacesAsync(query ?? "");
        return ApiResponse<List<PlaceSearchResultDto>>.SuccessResponse(results.ToList());
    }

    private static UserLocationDto Map(UserLocation l) => new()
    {
        Id = l.Id,
        UserId = l.UserId,
        Latitude = (double)l.Latitude,
        Longitude = (double)l.Longitude,
        AccuracyMeters = l.AccuracyMeters,
        RecordedAt = l.RecordedAt,
        Label = l.Label,
        IsCurrent = l.IsCurrent,
        ShareMode = l.ShareMode.ToString(),
        ActiveRideId = l.ActiveRideId
    };
}

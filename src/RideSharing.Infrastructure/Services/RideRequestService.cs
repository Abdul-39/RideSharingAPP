using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Rides;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class RideRequestService : IRideRequestService
{
  private readonly RideSharingDbContext _db;
  private readonly IMatchingService _matching;
  private readonly INotificationService _notifications;

  public RideRequestService(
      RideSharingDbContext db,
      IMatchingService matching,
      INotificationService notifications)
  {
    _db = db;
    _matching = matching;
    _notifications = notifications;
  }

  public async Task<ApiResponse<RideRequestDto>> CreateAsync(Guid userId, CreateRideRequestDto request)
  {
    var route = await _db.Routes.FirstOrDefaultAsync(r => r.Id == request.RouteId && r.UserId == userId && !r.IsDeleted);
    if (route == null)
      return ApiResponse<RideRequestDto>.FailureResponse("Route not found or not owned by you.");

    if (!TimeOnly.TryParse(request.PreferredDepartureTime, out var time))
      return ApiResponse<RideRequestDto>.FailureResponse("Invalid departure time.");

    if (request.SeatsNeeded < 1 || request.SeatsNeeded > 20)
      return ApiResponse<RideRequestDto>.FailureResponse("Seats needed must be between 1 and 20.");

    if (request.TimeToleranceMinutes < 0 || request.TimeToleranceMinutes > 120)
      return ApiResponse<RideRequestDto>.FailureResponse("Time tolerance must be 0–120 minutes.");

    var entity = new RideRequest
    {
      Id = Guid.NewGuid(),
      UserId = userId,
      RouteId = request.RouteId,
      TravelDate = request.TravelDate,
      PreferredDepartureTime = time,
      SeatsNeeded = request.SeatsNeeded,
      GenderPreference = request.GenderPreference,
      TimeToleranceMinutes = request.TimeToleranceMinutes <= 0 ? 15 : request.TimeToleranceMinutes,
      Status = RideRequestStatus.Open,
      Notes = request.Notes,
      CreatedAt = DateTime.UtcNow
    };

    _db.RideRequests.Add(entity);
    await _db.SaveChangesAsync();

    entity.Route = route;
    return ApiResponse<RideRequestDto>.SuccessResponse(Map(entity), "Ride request created.");
  }

  public async Task<ApiResponse<List<RideRequestDto>>> GetMyAsync(Guid userId)
  {
    var list = await _db.RideRequests
        .Include(r => r.Route)
        .Include(r => r.Matches.Where(m => !m.IsDeleted))
        .Where(r => r.UserId == userId && !r.IsDeleted)
        .OrderByDescending(r => r.CreatedAt)
        .ToListAsync();

    return ApiResponse<List<RideRequestDto>>.SuccessResponse(list.Select(Map).ToList());
  }

  public async Task<ApiResponse<RideRequestDto>> GetByIdAsync(Guid id, Guid userId, bool isAdmin)
  {
    var entity = await _db.RideRequests
        .Include(r => r.Route)
        .Include(r => r.Matches.Where(m => !m.IsDeleted))
        .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

    if (entity == null)
      return ApiResponse<RideRequestDto>.FailureResponse("Request not found.");

    if (!isAdmin && entity.UserId != userId)
      return ApiResponse<RideRequestDto>.FailureResponse("Not allowed.");

    return ApiResponse<RideRequestDto>.SuccessResponse(Map(entity));
  }

  public async Task<ApiResponse> CancelAsync(Guid id, Guid userId)
  {
    var entity = await _db.RideRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
    if (entity == null)
      return ApiResponse.FailureResponse("Request not found.");
    if (entity.UserId != userId)
      return ApiResponse.FailureResponse("Not allowed.");

    entity.Status = RideRequestStatus.Cancelled;
    entity.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
    return ApiResponse.SuccessResponse("Request cancelled.");
  }

  public async Task<ApiResponse<List<MatchResultDto>>> RunMatchingAsync(Guid requestId, Guid userId)
  {
    var entity = await _db.RideRequests
        .Include(r => r.Route)
        .Include(r => r.User)
        .FirstOrDefaultAsync(r => r.Id == requestId && !r.IsDeleted);

    if (entity == null)
      return ApiResponse<List<MatchResultDto>>.FailureResponse("Request not found.");
    if (entity.UserId != userId)
      return ApiResponse<List<MatchResultDto>>.FailureResponse("Not allowed.");
    if (entity.Status == RideRequestStatus.Cancelled)
      return ApiResponse<List<MatchResultDto>>.FailureResponse("Request is cancelled.");

    var matches = await _matching.FindMatchesAsync(entity);

    // Notify each matched DRIVER that a passenger is interested
    foreach (var m in matches)
    {
      try
      {
        await _notifications.CreateForUserAsync(
            m.MatchedUserId,
            NotificationType.NewMatch,
            "New ride match",
            $"A passenger matched your route ({m.MatchedRouteSource} → {m.MatchedRouteDestination}). Score: {m.MatchScore}.",
            m.MatchId,
            "/app/notifications");
      }
      catch { /* ignore */ }
    }

    return ApiResponse<List<MatchResultDto>>.SuccessResponse(matches.ToList(),
        matches.Count == 0 ? "No matches found." : $"Found {matches.Count} match(es).");
  }

  public async Task<ApiResponse<List<MatchResultDto>>> GetMatchesAsync(Guid requestId, Guid userId)
  {
    var entity = await _db.RideRequests.FirstOrDefaultAsync(r => r.Id == requestId && !r.IsDeleted);
    if (entity == null)
      return ApiResponse<List<MatchResultDto>>.FailureResponse("Request not found.");
    if (entity.UserId != userId)
      return ApiResponse<List<MatchResultDto>>.FailureResponse("Not allowed.");

    var matches = await _db.RideMatches
        .Include(m => m.MatchedUser)
        .Include(m => m.Vehicle)
        .Include(m => m.MatchedRoute)
        .Where(m => m.RideRequestId == requestId && !m.IsDeleted)
        .OrderByDescending(m => m.MatchScore)
        .ToListAsync();

    var dtos = matches.Select(m => new MatchResultDto
    {
      MatchId = m.Id,
      RideRequestId = m.RideRequestId,
      MatchedUserId = m.MatchedUserId,
      MatchedUserName = m.MatchedUser != null ? $"{m.MatchedUser.FirstName} {m.MatchedUser.LastName[0]}." : "",
      IsVerified = m.MatchedUser?.IsVerified ?? false,
      Gender = m.MatchedUser?.Gender.ToString() ?? "",
      VehicleId = m.VehicleId,
      VehicleInfo = m.Vehicle != null ? $"{m.Vehicle.Make} {m.Vehicle.Model}" : null,
      SeatingCapacity = m.Vehicle?.SeatingCapacity,
      MatchedRouteSource = m.MatchedRoute?.SourceAddress,
      MatchedRouteDestination = m.MatchedRoute?.DestinationAddress,
      MatchedDepartureTime = m.MatchedRoute?.PreferredDepartureTime.ToString("HH:mm"),
      MatchScore = m.MatchScore,
      ScoreBreakdown = m.ScoreBreakdown,
      Status = m.Status.ToString()
    }).ToList();

    return ApiResponse<List<MatchResultDto>>.SuccessResponse(dtos);
  }

  public async Task<ApiResponse> RespondToMatchAsync(Guid matchId, Guid userId, bool accept)
  {
    var match = await _db.RideMatches
        .Include(m => m.RideRequest).ThenInclude(r => r!.Route)
        .FirstOrDefaultAsync(m => m.Id == matchId && !m.IsDeleted);

    if (match == null)
      return ApiResponse.FailureResponse("Match not found.");
    if (match.RideRequest.UserId != userId)
      return ApiResponse.FailureResponse("Not allowed.");
    if (match.Status != MatchStatus.Pending)
      return ApiResponse.FailureResponse("Match is no longer pending.");

    match.Status = accept ? MatchStatus.Accepted : MatchStatus.Rejected;
    match.UpdatedAt = DateTime.UtcNow;
    Guid? createdRideId = null;

    if (accept)
    {
      match.RideRequest.Status = RideRequestStatus.Matched;
      var others = await _db.RideMatches
          .Where(m => m.RideRequestId == match.RideRequestId && m.Id != matchId
                      && m.Status == MatchStatus.Pending && !m.IsDeleted)
          .ToListAsync();
      foreach (var o in others)
      {
        o.Status = MatchStatus.Expired;
        o.UpdatedAt = DateTime.UtcNow;
      }

      if (!await _db.Rides.AnyAsync(r => r.RideMatchId == matchId && !r.IsDeleted))
      {
        var route = match.RideRequest.Route;
        var rideId = Guid.NewGuid();
        createdRideId = rideId;
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
          Id = Guid.NewGuid(),
          RideId = rideId,
          UserId = match.RideRequest.UserId,
          Role = ParticipantRole.Passenger,
          CreatedAt = DateTime.UtcNow
        });
        _db.RideParticipants.Add(new RideParticipant
        {
          Id = Guid.NewGuid(),
          RideId = rideId,
          UserId = match.MatchedUserId,
          Role = ParticipantRole.Driver,
          CreatedAt = DateTime.UtcNow
        });
        _db.RideHistories.Add(new RideHistory
        {
          Id = Guid.NewGuid(),
          RideId = rideId,
          FromStatus = RideStatus.Requested,
          ToStatus = RideStatus.Matched,
          ChangedByUserId = userId,
          Note = "Passenger accepted match",
          ChangedAt = DateTime.UtcNow,
          CreatedAt = DateTime.UtcNow
        });
      }
    }

    await _db.SaveChangesAsync();

    if (accept)
    {
      try
      {
        await _notifications.CreateForUserAsync(
            match.MatchedUserId,
            NotificationType.MatchAccepted,
            "Passenger accepted your match",
            "Open My Rides → Upcoming and Confirm the ride.",
            createdRideId,
            "/app/rides/lifecycle");
      }
      catch { }
    }

    return ApiResponse.SuccessResponse(
        accept ? "Match accepted. Driver notified." : "Match rejected.");
  }

  private static RideRequestDto Map(RideRequest r) => new()
  {
    Id = r.Id,
    UserId = r.UserId,
    RouteId = r.RouteId,
    SourceAddress = r.Route?.SourceAddress ?? "",
    DestinationAddress = r.Route?.DestinationAddress ?? "",
    SourceLatitude = r.Route?.SourceLatitude ?? 0,
    SourceLongitude = r.Route?.SourceLongitude ?? 0,
    DestinationLatitude = r.Route?.DestinationLatitude ?? 0,
    DestinationLongitude = r.Route?.DestinationLongitude ?? 0,
    TravelDate = r.TravelDate,
    PreferredDepartureTime = r.PreferredDepartureTime.ToString("HH:mm"),
    SeatsNeeded = r.SeatsNeeded,
    GenderPreference = r.GenderPreference.ToString(),
    TimeToleranceMinutes = r.TimeToleranceMinutes,
    Status = r.Status.ToString(),
    Notes = r.Notes,
    CreatedAt = r.CreatedAt,
    MatchCount = r.Matches?.Count(m => !m.IsDeleted) ?? 0
  };
}

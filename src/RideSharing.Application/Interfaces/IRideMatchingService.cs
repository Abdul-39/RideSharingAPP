using RideSharing.Application.DTOs.Rides;
using RideSharing.Domain.Entities;
namespace RideSharing.Application.Interfaces;
public interface IRideMatchingService
{
  Task<IReadOnlyList<CorridorMatchDto>> FindMatchesAsync(RideRequest request, CancellationToken ct = default);

  Task<IReadOnlyList<CorridorMatchDto>> FindMatchingPassengersAsync(
      Guid driverUserId, Guid driverRouteId, DateOnly travelDate, TimeOnly departureTime, int availableSeats,
      CancellationToken ct = default);
}

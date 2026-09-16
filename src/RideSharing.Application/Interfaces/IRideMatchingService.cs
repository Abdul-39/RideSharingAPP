using RideSharing.Application.DTOs.Rides;
using RideSharing.Domain.Entities;
namespace RideSharing.Application.Interfaces;
public interface IRideMatchingService
{
    Task<IReadOnlyList<CorridorMatchDto>> FindMatchesAsync(RideRequest request, CancellationToken ct = default);
}

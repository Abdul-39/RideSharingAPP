using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Routes;

namespace RideSharing.Application.Interfaces;

public interface IRouteService
{
    Task<ApiResponse<List<RouteDto>>> GetMyRoutesAsync(Guid userId);
    Task<ApiResponse<RouteDto>> GetByIdAsync(Guid id, Guid userId, bool isAdmin);
    Task<ApiResponse<RouteDto>> CreateAsync(Guid userId, CreateRouteRequest request);
    Task<ApiResponse<RouteDto>> UpdateAsync(Guid id, Guid userId, bool isAdmin, UpdateRouteRequest request);
    Task<ApiResponse> DeleteAsync(Guid id, Guid userId, bool isAdmin);
}

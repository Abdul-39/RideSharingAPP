using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Vehicles;

namespace RideSharing.Application.Interfaces;

public interface IVehicleService
{
    Task<ApiResponse<List<VehicleDto>>> GetMyVehiclesAsync(Guid userId);
    Task<ApiResponse<List<VehicleDto>>> GetAllVehiclesAsync(); // Admin
    Task<ApiResponse<VehicleDto>> GetByIdAsync(Guid id, Guid currentUserId, bool isAdmin);
    Task<ApiResponse<VehicleDto>> CreateAsync(Guid driverId, CreateVehicleRequest request);
    Task<ApiResponse<VehicleDto>> UpdateAsync(Guid id, Guid currentUserId, bool isAdmin, UpdateVehicleRequest request);
    Task<ApiResponse> DeleteAsync(Guid id, Guid currentUserId, bool isAdmin);
    Task<ApiResponse<List<VehicleTypeDto>>> GetVehicleTypesAsync();
}

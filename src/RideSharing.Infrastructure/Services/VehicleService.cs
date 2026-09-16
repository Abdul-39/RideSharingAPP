using Microsoft.EntityFrameworkCore;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Vehicles;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Persistence.Context;

namespace RideSharing.Infrastructure.Services;

public class VehicleService : IVehicleService
{
    private readonly RideSharingDbContext _db;

    public VehicleService(RideSharingDbContext db) => _db = db;

    public async Task<ApiResponse<List<VehicleDto>>> GetMyVehiclesAsync(Guid userId)
    {
        var list = await _db.Vehicles
            .Include(v => v.VehicleType)
            .Include(v => v.Driver)
            .Where(v => v.DriverId == userId && !v.IsDeleted)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync();

        return ApiResponse<List<VehicleDto>>.SuccessResponse(list.Select(Map).ToList());
    }

    public async Task<ApiResponse<List<VehicleDto>>> GetAllVehiclesAsync()
    {
        var list = await _db.Vehicles
            .Include(v => v.VehicleType)
            .Include(v => v.Driver)
            .Where(v => !v.IsDeleted)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync();

        return ApiResponse<List<VehicleDto>>.SuccessResponse(list.Select(Map).ToList());
    }

    public async Task<ApiResponse<VehicleDto>> GetByIdAsync(Guid id, Guid currentUserId, bool isAdmin)
    {
        var vehicle = await _db.Vehicles
            .Include(v => v.VehicleType)
            .Include(v => v.Driver)
            .FirstOrDefaultAsync(v => v.Id == id && !v.IsDeleted);

        if (vehicle == null)
            return ApiResponse<VehicleDto>.FailureResponse("Vehicle not found.");

        if (!isAdmin && vehicle.DriverId != currentUserId)
            return ApiResponse<VehicleDto>.FailureResponse("You are not allowed to view this vehicle.");

        return ApiResponse<VehicleDto>.SuccessResponse(Map(vehicle));
    }

    public async Task<ApiResponse<VehicleDto>> CreateAsync(Guid driverId, CreateVehicleRequest request)
    {
        var typeExists = await _db.VehicleTypes.AnyAsync(t => t.Id == request.VehicleTypeId && !t.IsDeleted);
        if (!typeExists)
            return ApiResponse<VehicleDto>.FailureResponse("Invalid vehicle type.");

        var reg = request.RegistrationNumber.Trim().ToUpperInvariant();
        if (await _db.Vehicles.AnyAsync(v => v.RegistrationNumber == reg && !v.IsDeleted))
            return ApiResponse<VehicleDto>.FailureResponse("Registration number already exists.");

        var vehicle = new Vehicle
        {
            Id = Guid.NewGuid(),
            DriverId = driverId,
            VehicleTypeId = request.VehicleTypeId,
            Make = request.Make.Trim(),
            Model = request.Model.Trim(),
            RegistrationNumber = reg,
            Color = request.Color,
            SeatingCapacity = request.SeatingCapacity,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Vehicles.Add(vehicle);
        await _db.SaveChangesAsync();

        await _db.Entry(vehicle).Reference(v => v.VehicleType).LoadAsync();
        await _db.Entry(vehicle).Reference(v => v.Driver).LoadAsync();

        return ApiResponse<VehicleDto>.SuccessResponse(Map(vehicle), "Vehicle created.");
    }

    public async Task<ApiResponse<VehicleDto>> UpdateAsync(Guid id, Guid currentUserId, bool isAdmin, UpdateVehicleRequest request)
    {
        var vehicle = await _db.Vehicles
            .Include(v => v.VehicleType)
            .Include(v => v.Driver)
            .FirstOrDefaultAsync(v => v.Id == id && !v.IsDeleted);

        if (vehicle == null)
            return ApiResponse<VehicleDto>.FailureResponse("Vehicle not found.");

        if (!isAdmin && vehicle.DriverId != currentUserId)
            return ApiResponse<VehicleDto>.FailureResponse("You are not allowed to modify this vehicle.");

        var typeExists = await _db.VehicleTypes.AnyAsync(t => t.Id == request.VehicleTypeId && !t.IsDeleted);
        if (!typeExists)
            return ApiResponse<VehicleDto>.FailureResponse("Invalid vehicle type.");

        var reg = request.RegistrationNumber.Trim().ToUpperInvariant();
        if (await _db.Vehicles.AnyAsync(v => v.RegistrationNumber == reg && v.Id != id && !v.IsDeleted))
            return ApiResponse<VehicleDto>.FailureResponse("Registration number already exists.");

        vehicle.VehicleTypeId = request.VehicleTypeId;
        vehicle.Make = request.Make.Trim();
        vehicle.Model = request.Model.Trim();
        vehicle.RegistrationNumber = reg;
        vehicle.Color = request.Color;
        vehicle.SeatingCapacity = request.SeatingCapacity;
        vehicle.IsActive = request.IsActive;
        vehicle.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _db.Entry(vehicle).Reference(v => v.VehicleType).LoadAsync();

        return ApiResponse<VehicleDto>.SuccessResponse(Map(vehicle), "Vehicle updated.");
    }

    public async Task<ApiResponse> DeleteAsync(Guid id, Guid currentUserId, bool isAdmin)
    {
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == id && !v.IsDeleted);
        if (vehicle == null)
            return ApiResponse.FailureResponse("Vehicle not found.");

        if (!isAdmin && vehicle.DriverId != currentUserId)
            return ApiResponse.FailureResponse("You are not allowed to delete this vehicle.");

        vehicle.IsDeleted = true;
        vehicle.DeletedAt = DateTime.UtcNow;
        vehicle.IsActive = false;
        vehicle.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponse.SuccessResponse("Vehicle deleted.");
    }

    public async Task<ApiResponse<List<VehicleTypeDto>>> GetVehicleTypesAsync()
    {
        var types = await _db.VehicleTypes
            .Where(t => !t.IsDeleted)
            .OrderBy(t => t.Name)
            .Select(t => new VehicleTypeDto
            {
                Id = t.Id,
                Name = t.Name,
                Description = t.Description,
                DefaultSeatingCapacity = t.DefaultSeatingCapacity
            })
            .ToListAsync();

        return ApiResponse<List<VehicleTypeDto>>.SuccessResponse(types);
    }

    private static VehicleDto Map(Vehicle v) => new()
    {
        Id = v.Id,
        DriverId = v.DriverId,
        DriverName = v.Driver != null ? $"{v.Driver.FirstName} {v.Driver.LastName}" : "",
        VehicleTypeId = v.VehicleTypeId,
        VehicleTypeName = v.VehicleType?.Name ?? "",
        Make = v.Make,
        Model = v.Model,
        RegistrationNumber = v.RegistrationNumber,
        Color = v.Color,
        SeatingCapacity = v.SeatingCapacity,
        IsActive = v.IsActive,
        CreatedAt = v.CreatedAt
    };
}

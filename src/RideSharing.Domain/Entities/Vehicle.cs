using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

public class Vehicle : BaseEntity
{
    public Guid DriverId { get; set; }                 // Owner / Driver
    public User Driver { get; set; } = null!;

    public Guid VehicleTypeId { get; set; }
    public VehicleType VehicleType { get; set; } = null!;

    public string Make { get; set; } = string.Empty;           // e.g. Toyota
    public string Model { get; set; } = string.Empty;          // e.g. Corolla
    public string RegistrationNumber { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int SeatingCapacity { get; set; }
    public bool IsActive { get; set; } = true;
}

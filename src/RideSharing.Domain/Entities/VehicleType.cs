using RideSharing.Domain.Common;

namespace RideSharing.Domain.Entities;

public class VehicleType : BaseEntity
{
    public string Name { get; set; } = string.Empty;   // Car, Bike, Van, etc.
    public string? Description { get; set; }
    public int DefaultSeatingCapacity { get; set; }

    // Navigation
    public ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}

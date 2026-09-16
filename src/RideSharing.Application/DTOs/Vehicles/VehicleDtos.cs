namespace RideSharing.Application.DTOs.Vehicles;

public class VehicleDto
{
    public Guid Id { get; set; }
    public Guid DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public Guid VehicleTypeId { get; set; }
    public string VehicleTypeName { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int SeatingCapacity { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateVehicleRequest
{
    public Guid VehicleTypeId { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int SeatingCapacity { get; set; }
}

public class UpdateVehicleRequest
{
    public Guid VehicleTypeId { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int SeatingCapacity { get; set; }
    public bool IsActive { get; set; } = true;
}

public class VehicleTypeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DefaultSeatingCapacity { get; set; }
}

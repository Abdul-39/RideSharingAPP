using RideSharing.Domain.Enums;

namespace RideSharing.Application.DTOs.Auth;

public class RegisterRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Password { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
    public Gender Gender { get; set; }
    public string Role { get; set; } = "Passenger"; // Passenger | Driver
}

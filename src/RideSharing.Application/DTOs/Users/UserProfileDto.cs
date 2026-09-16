namespace RideSharing.Application.DTOs.Users;

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Gender { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool IsVerified { get; set; }
    public bool IsActive { get; set; }
    public Guid? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class UpdateProfileRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public int Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public Guid? InstitutionId { get; set; }
}

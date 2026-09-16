using FluentValidation;
using RideSharing.Application.DTOs.Auth;

namespace RideSharing.Application.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.PhoneNumber)
            .Matches(@"^(\+92|0)?3\d{9}$").When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber))
            .WithMessage("Invalid Pakistan phone number");
        RuleFor(x => x.Password)
            .NotEmpty().MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Password needs an uppercase letter")
            .Matches("[a-z]").WithMessage("Password needs a lowercase letter")
            .Matches("[0-9]").WithMessage("Password needs a digit");
        RuleFor(x => x.ConfirmPassword).Equal(x => x.Password).WithMessage("Passwords do not match");
        RuleFor(x => x.Role).Must(r => r is "Passenger" or "Driver")
            .WithMessage("Role must be Passenger or Driver");
    }
}

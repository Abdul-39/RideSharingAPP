using FluentValidation;
using RideSharing.Application.DTOs.Users;

namespace RideSharing.Application.Validators;

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.PhoneNumber)
            .Matches(@"^(\+92|0)?3\d{9}$").When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber))
            .WithMessage("Invalid Pakistan phone number");
        RuleFor(x => x.Gender).InclusiveBetween(1, 4);
    }
}

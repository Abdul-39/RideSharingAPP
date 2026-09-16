using FluentValidation;
using RideSharing.Application.DTOs.Vehicles;

namespace RideSharing.Application.Validators;

public class CreateVehicleRequestValidator : AbstractValidator<CreateVehicleRequest>
{
    public CreateVehicleRequestValidator()
    {
        RuleFor(x => x.VehicleTypeId).NotEmpty();
        RuleFor(x => x.Make).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Model).NotEmpty().MaximumLength(100);
        RuleFor(x => x.RegistrationNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.SeatingCapacity).InclusiveBetween(1, 50);
        RuleFor(x => x.Color).MaximumLength(50).When(x => x.Color != null);
    }
}

public class UpdateVehicleRequestValidator : AbstractValidator<UpdateVehicleRequest>
{
    public UpdateVehicleRequestValidator()
    {
        RuleFor(x => x.VehicleTypeId).NotEmpty();
        RuleFor(x => x.Make).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Model).NotEmpty().MaximumLength(100);
        RuleFor(x => x.RegistrationNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.SeatingCapacity).InclusiveBetween(1, 50);
    }
}

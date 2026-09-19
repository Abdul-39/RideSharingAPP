using FluentValidation;
using RideSharing.Application.DTOs.Routes;

namespace RideSharing.Application.Validators;

public class CreateRouteRequestValidator : AbstractValidator<CreateRouteRequest>
{
  public CreateRouteRequestValidator()
  {
    RuleFor(x => x.SourceAddress)
        .NotEmpty()
        .MaximumLength(500);

    RuleFor(x => x.DestinationAddress)
        .NotEmpty()
        .MaximumLength(500);

    RuleFor(x => x.SourceLatitude)
        .InclusiveBetween(-90m, 90m)
        .WithMessage("Source latitude must be between -90 and 90.");

    RuleFor(x => x.SourceLongitude)
        .InclusiveBetween(-180m, 180m)
        .WithMessage("Source longitude must be between -180 and 180.");

    RuleFor(x => x.DestinationLatitude)
        .InclusiveBetween(-90m, 90m);

    RuleFor(x => x.DestinationLongitude)
        .InclusiveBetween(-180m, 180m);

    RuleFor(x => x.PreferredDepartureTime)
        .NotEmpty()
        .Must(BeValidTime)
        .WithMessage(
            "Departure time must be in HH:mm format (e.g. 08:00).");

    RuleFor(x => x.MaximumTimeToleranceMinutes)
        .InclusiveBetween(0, 120)
        .WithMessage(
            "Time tolerance must be between 0 and 120 minutes.");

    // ============================================
    // DRIVER / PASSENGER
    // ============================================

    RuleFor(x => x.AvailableSeats)
        .InclusiveBetween(1, 4)
        .When(x => x.IsDriverRoute)
        .WithMessage(
            "Driver route must have between 1 and 4 available seats.");

    RuleFor(x => x.AvailableSeats)
        .Equal(0)
        .When(x => !x.IsDriverRoute)
        .WithMessage(
            "Passenger route cannot have available seats.");

    // ============================================
    // SCHEDULES
    // ============================================

    RuleFor(x => x.Schedules)
        .Must(list =>
            list == null ||
            list.All(s => s.HasAnyDay))
        .WithMessage(
            "Each schedule must have at least one day selected.")
        .When(x =>
            x.Schedules != null &&
            x.Schedules.Count > 0);
  }

  private static bool BeValidTime(string value) =>
      TimeOnly.TryParseExact(
          value,
          new[]
          {
                "HH:mm",
                "H:mm",
                "hh\\:mm tt",
                "h\\:mm tt"
          },
          null,
          System.Globalization.DateTimeStyles.None,
          out _);
}


public class UpdateRouteRequestValidator
    : AbstractValidator<UpdateRouteRequest>
{
  public UpdateRouteRequestValidator()
  {
    RuleFor(x => x.SourceAddress)
        .NotEmpty()
        .MaximumLength(500);

    RuleFor(x => x.DestinationAddress)
        .NotEmpty()
        .MaximumLength(500);

    RuleFor(x => x.SourceLatitude)
        .InclusiveBetween(-90m, 90m);

    RuleFor(x => x.SourceLongitude)
        .InclusiveBetween(-180m, 180m);

    RuleFor(x => x.DestinationLatitude)
        .InclusiveBetween(-90m, 90m);

    RuleFor(x => x.DestinationLongitude)
        .InclusiveBetween(-180m, 180m);

    RuleFor(x => x.PreferredDepartureTime)
        .NotEmpty()
        .Must(v => TimeOnly.TryParse(v, out _))
        .WithMessage(
            "Departure time must be a valid time (HH:mm).");

    RuleFor(x => x.MaximumTimeToleranceMinutes)
        .InclusiveBetween(0, 120);

    // ============================================
    // DRIVER / PASSENGER
    // ============================================

    RuleFor(x => x.AvailableSeats)
        .InclusiveBetween(1, 4)
        .When(x => x.IsDriverRoute)
        .WithMessage(
            "Driver route must have between 1 and 4 available seats.");

    RuleFor(x => x.AvailableSeats)
        .Equal(0)
        .When(x => !x.IsDriverRoute)
        .WithMessage(
            "Passenger route cannot have available seats.");

    // ============================================
    // SCHEDULES
    // ============================================

    RuleFor(x => x.Schedules)
        .Must(list =>
            list == null ||
            list.All(s => s.HasAnyDay))
        .WithMessage(
            "Each schedule must have at least one day selected.")
        .When(x =>
            x.Schedules != null &&
            x.Schedules.Count > 0);
  }
}

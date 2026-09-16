using Microsoft.Extensions.Options;
using RideSharing.Application.DTOs.Payments;
using RideSharing.Application.Interfaces;

namespace RideSharing.Infrastructure.Payment;

public class FareCalculator : IFareCalculator
{
    private readonly FareSettings _settings;
    public FareCalculator(IOptions<FareSettings> options) => _settings = options.Value;

    public FareBreakdownDto Calculate(double distanceKm, int participantCount)
    {
        var km = Math.Max(0, distanceKm);
        var passengers = Math.Max(1, participantCount);
        var baseFare = _settings.BaseFare;
        var distanceFare = Math.Round((decimal)km * _settings.PerKmRate, 2);
        var total = Math.Round(baseFare + distanceFare, 2);
        var shared = Math.Round(total / passengers, 2);
        return new FareBreakdownDto
        {
            BaseFare = baseFare,
            DistanceKm = Math.Round((decimal)km, 3),
            DistanceFare = distanceFare,
            ParticipantCount = passengers,
            TotalFare = total,
            SharedFarePerPassenger = shared,
            Currency = _settings.Currency
        };
    }
}

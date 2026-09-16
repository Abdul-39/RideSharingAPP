using RideSharing.Application.DTOs.Payments;

namespace RideSharing.Application.Interfaces;

public interface IFareCalculator
{
    FareBreakdownDto Calculate(double distanceKm, int participantCount);
}

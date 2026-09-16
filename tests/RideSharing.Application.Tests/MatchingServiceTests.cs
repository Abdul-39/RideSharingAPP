using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Infrastructure.Matching;
using RideSharing.Application.Interfaces;
using Xunit;

namespace RideSharing.Application.Tests;

public class MatchingServiceTests
{
    private readonly MatchingService _sut = new(null!);

    private static Route MakeRoute(double sLat, double sLng, double dLat, double dLng, int tol = 15) =>
        new()
        {
            Id = Guid.NewGuid(),
            SourceLatitude = (decimal)sLat,
            SourceLongitude = (decimal)sLng,
            DestinationLatitude = (decimal)dLat,
            DestinationLongitude = (decimal)dLng,
            SourceAddress = "Source",
            DestinationAddress = "Dest",
            PreferredDepartureTime = TimeOnly.Parse("08:00"),
            MaximumTimeToleranceMinutes = tol,
            IsActive = true
        };

    private static CandidateDriver MakeCandidate(
        double sLat, double sLng, double dLat, double dLng,
        string time = "08:00",
        int seats = 4,
        Gender gender = Gender.Male,
        bool verified = true,
        bool available = true,
        int tol = 15)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = "Ali",
            LastName = "Khan",
            Email = "ali@test.com",
            Gender = gender,
            IsVerified = verified,
            IsActive = true,
            PasswordHash = "x"
        };
        return new CandidateDriver
        {
            User = user,
            Route = new Route
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                SourceLatitude = (decimal)sLat,
                SourceLongitude = (decimal)sLng,
                DestinationLatitude = (decimal)dLat,
                DestinationLongitude = (decimal)dLng,
                SourceAddress = "Src",
                DestinationAddress = "Dst",
                PreferredDepartureTime = TimeOnly.Parse(time),
                MaximumTimeToleranceMinutes = tol,
                IsActive = true
            },
            Vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                DriverId = user.Id,
                VehicleTypeId = Guid.NewGuid(),
                Make = "Toyota",
                Model = "Corolla",
                RegistrationNumber = "ABC-1",
                SeatingCapacity = seats,
                IsActive = true
            },
            DriverProfile = new DriverProfile
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                IsAvailable = available,
                VerificationStatus = VerificationStatus.Verified
            },
            IsDriver = true
        };
    }

    private MatchScoreResult Score(
        Route reqRoute, string reqTime, int tol, int seats,
        GenderPreference pref, Gender reqGender, CandidateDriver cand) =>
        _sut.CalculateScore(reqRoute, TimeOnly.Parse(reqTime), tol, seats,
            new GenderPreferenceRequest(pref, reqGender), cand);

    [Fact]
    public void Same_route_same_time_is_eligible_high_score()
    {
        var req = MakeRoute(31.47, 74.27, 31.52, 74.36);
        var cand = MakeCandidate(31.47, 74.27, 31.52, 74.36, "08:00");
        var result = Score(req, "08:00", 15, 1, GenderPreference.Any, Gender.Male, cand);
        Assert.True(result.IsEligible);
        Assert.True(result.TotalScore > 50);
    }

    [Fact]
    public void Different_route_far_away_is_rejected()
    {
        var req = MakeRoute(31.47, 74.27, 31.52, 74.36);
        var cand = MakeCandidate(33.68, 73.04, 33.70, 73.10, "08:00");
        var result = Score(req, "08:00", 15, 1, GenderPreference.Any, Gender.Male, cand);
        Assert.False(result.IsEligible);
        Assert.Equal("Route too far", result.RejectionReason);
    }

    [Fact]
    public void Same_time_scores_higher_than_near_tolerance_edge()
    {
        var req = MakeRoute(31.47, 74.27, 31.52, 74.36);
        var same = Score(req, "08:00", 15, 1, GenderPreference.Any, Gender.Male,
            MakeCandidate(31.47, 74.27, 31.52, 74.36, "08:00"));
        var edge = Score(req, "08:00", 15, 1, GenderPreference.Any, Gender.Male,
            MakeCandidate(31.47, 74.27, 31.52, 74.36, "08:14"));
        Assert.True(same.IsEligible && edge.IsEligible);
        Assert.True(same.TimeCompatibilityScore > edge.TimeCompatibilityScore);
    }

    [Fact]
    public void Outside_tolerance_is_rejected()
    {
        var req = MakeRoute(31.47, 74.27, 31.52, 74.36);
        var result = Score(req, "08:00", 15, 1, GenderPreference.Any, Gender.Male,
            MakeCandidate(31.47, 74.27, 31.52, 74.36, "08:30"));
        Assert.False(result.IsEligible);
        Assert.Equal("Outside time tolerance", result.RejectionReason);
    }

    [Fact]
    public void Within_15_minutes_is_eligible()
    {
        var req = MakeRoute(31.47, 74.27, 31.52, 74.36);
        var result = Score(req, "08:00", 15, 1, GenderPreference.Any, Gender.Male,
            MakeCandidate(31.47, 74.27, 31.52, 74.36, "08:10"));
        Assert.True(result.IsEligible);
    }

    [Fact]
    public void Insufficient_seats_is_rejected()
    {
        var req = MakeRoute(31.47, 74.27, 31.52, 74.36);
        var result = Score(req, "08:00", 15, 3, GenderPreference.Any, Gender.Male,
            MakeCandidate(31.47, 74.27, 31.52, 74.36, "08:00", seats: 1));
        Assert.False(result.IsEligible);
        Assert.Equal("Insufficient seats", result.RejectionReason);
    }

    [Fact]
    public void Gender_restriction_rejects_male_for_female_only()
    {
        var req = MakeRoute(31.47, 74.27, 31.52, 74.36);
        var result = Score(req, "08:00", 15, 1, GenderPreference.FemaleOnly, Gender.Female,
            MakeCandidate(31.47, 74.27, 31.52, 74.36, "08:00", gender: Gender.Male));
        Assert.False(result.IsEligible);
        Assert.Equal("Gender restriction", result.RejectionReason);
    }

    [Fact]
    public void Gender_restriction_accepts_female_for_female_only()
    {
        var req = MakeRoute(31.47, 74.27, 31.52, 74.36);
        var result = Score(req, "08:00", 15, 1, GenderPreference.FemaleOnly, Gender.Female,
            MakeCandidate(31.47, 74.27, 31.52, 74.36, "08:00", gender: Gender.Female));
        Assert.True(result.IsEligible);
    }

    [Fact]
    public void Haversine_same_point_is_zero()
    {
        Assert.True(MatchingService.HaversineKm(31.5, 74.3, 31.5, 74.3) < 0.001);
    }
}

using RideSharing.Domain.Enums;
using RideSharing.Infrastructure.Matching;
using Xunit;

namespace RideSharing.Tests;

public class GenderMatchingRulesTests
{
    [Theory]
    [InlineData(Gender.Female, GenderPreference.Any, Gender.Female, GenderPreference.Any, true)]
    [InlineData(Gender.Female, GenderPreference.Any, Gender.Male, GenderPreference.Any, true)]
    [InlineData(Gender.Female, GenderPreference.FemaleOnly, Gender.Female, GenderPreference.Any, true)]
    [InlineData(Gender.Female, GenderPreference.FemaleOnly, Gender.Male, GenderPreference.Any, false)]
    [InlineData(Gender.Male, GenderPreference.Any, Gender.Female, GenderPreference.Any, true)]
    [InlineData(Gender.Male, GenderPreference.Any, Gender.Female, GenderPreference.FemaleOnly, false)]
    [InlineData(Gender.Female, GenderPreference.FemaleOnly, Gender.Female, GenderPreference.FemaleOnly, true)]
    public void Matrix(Gender dg, GenderPreference dp, Gender pg, GenderPreference pp, bool expected)
        => Assert.Equal(expected, GenderMatchingRules.IsEligible(dg, dp, pg, pp));
}

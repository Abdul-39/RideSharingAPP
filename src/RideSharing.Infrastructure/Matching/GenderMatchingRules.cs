using RideSharing.Domain.Enums;

namespace RideSharing.Infrastructure.Matching;

/// <summary>
/// Hard eligibility matrix for Women-Only / gender preference.
/// Failures exclude the candidate — they are NOT soft score penalties.
/// </summary>
public static class GenderMatchingRules
{
    /// <param name="driverGender">Driver's gender</param>
    /// <param name="driverPref">Driver-side preference (from profile or ride offer)</param>
    /// <param name="passengerGender">Passenger gender</param>
    /// <param name="passengerPref">Passenger ride-request preference</param>
    public static bool IsEligible(
        Gender driverGender,
        GenderPreference driverPref,
        Gender passengerGender,
        GenderPreference passengerPref)
    {
        var driverWomenOnly = IsWomenOnly(driverPref);
        var passengerWomenOnly = IsWomenOnly(passengerPref);

        // Passenger wants women-only → driver must be female
        if (passengerWomenOnly && driverGender != Gender.Female)
            return false;

        // Driver wants women-only → passenger must be female
        if (driverWomenOnly && passengerGender != Gender.Female)
            return false;

        // Male-only style prefs if present
        if (IsMenOnly(driverPref) && passengerGender != Gender.Male)
            return false;
        if (IsMenOnly(passengerPref) && driverGender != Gender.Male)
            return false;

        return true;
    }

    public static bool IsWomenOnly(GenderPreference p)
    {
        var n = p.ToString();
        return n is "WomenOnly" or "FemaleOnly" or "Female" or "2";
    }

    public static bool IsMenOnly(GenderPreference p)
    {
        var n = p.ToString();
        return n is "MenOnly" or "MaleOnly" or "Male" or "1";
    }
}

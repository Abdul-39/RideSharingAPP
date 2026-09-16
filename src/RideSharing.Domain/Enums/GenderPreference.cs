namespace RideSharing.Domain.Enums;

public enum GenderPreference
{
    Any = 0,
    MaleOnly = 1,
    FemaleOnly = 2,
    /// <summary>Women-only rides (same rules as FemaleOnly, explicit product flag).</summary>
    WomenOnly = 3
}

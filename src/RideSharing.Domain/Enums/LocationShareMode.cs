namespace RideSharing.Domain.Enums;

/// <summary>Controls when a user's live location may be shared with others.</summary>
public enum LocationShareMode
{
    Never = 0,
    ActiveRideOnly = 1,
    AlwaysWhileOnline = 2
}

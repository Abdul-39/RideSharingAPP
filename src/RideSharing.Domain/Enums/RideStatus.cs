namespace RideSharing.Domain.Enums;
public enum RideStatus
{
    Requested = 0, Matching = 1, Matched = 2, Confirmed = 3,
    DriverArriving = 4, DriverArrived = 5, InProgress = 6, Completed = 7, Cancelled = 8
}

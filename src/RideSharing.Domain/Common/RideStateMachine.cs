using RideSharing.Domain.Enums;
namespace RideSharing.Domain.Common;
public static class RideStateMachine
{
    private static readonly Dictionary<RideStatus, HashSet<RideStatus>> Allowed = new()
    {
        [RideStatus.Requested] = new() { RideStatus.Matching, RideStatus.Cancelled },
        [RideStatus.Matching] = new() { RideStatus.Matched, RideStatus.Cancelled },
        [RideStatus.Matched] = new() { RideStatus.Confirmed, RideStatus.Cancelled },
        [RideStatus.Confirmed] = new() { RideStatus.DriverArriving, RideStatus.Cancelled },
        [RideStatus.DriverArriving] = new() { RideStatus.DriverArrived, RideStatus.Cancelled },
        [RideStatus.DriverArrived] = new() { RideStatus.InProgress, RideStatus.Cancelled },
        [RideStatus.InProgress] = new() { RideStatus.Completed, RideStatus.Cancelled },
        [RideStatus.Completed] = new(),
        [RideStatus.Cancelled] = new()
    };
    public static void EnsureCanTransition(RideStatus from, RideStatus to)
    {
        if (from == to || !Allowed.TryGetValue(from, out var set) || !set.Contains(to))
            throw new InvalidOperationException($"Invalid ride transition: {from} → {to}.");
    }
}

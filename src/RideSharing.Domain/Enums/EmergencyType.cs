namespace RideSharing.Domain.Enums;

public enum EmergencyType
{
    General = 0,
    UnsafeSituation = 1,
    Accident = 2,
    Medical = 3,
    Other = 4
}

public enum EmergencyStatus
{
    Active = 0,
    Acknowledged = 1,
    Resolved = 2,
    Cancelled = 3
}

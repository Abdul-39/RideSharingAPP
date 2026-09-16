namespace RideSharing.Infrastructure.SMS;

/// <summary>
/// Abstraction for SMS sending. Implementation will be added in a later phase.
/// </summary>
public interface ISmsService
{
    Task SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default);
}

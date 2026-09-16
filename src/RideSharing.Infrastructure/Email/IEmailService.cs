namespace RideSharing.Infrastructure.Email;

/// <summary>
/// Abstraction for email sending. Implementation will be added in a later phase.
/// </summary>
public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body, CancellationToken cancellationToken = default);
}

using RideSharing.Application.DTOs.Emergency;
namespace RideSharing.Application.Interfaces;
public interface IEmergencyService
{
    Task<SosDto> ActivateSosAsync(Guid userId, ActivateSosRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<SosDto>> GetMyAlertsAsync(Guid userId, CancellationToken ct = default);
    Task<SosDto?> GetAsync(Guid userId, Guid alertId, CancellationToken ct = default);
    Task<SosDto> ResolveAsync(Guid userId, Guid alertId, CancellationToken ct = default);
    Task<IReadOnlyList<EmergencyContactDto>> GetContactsAsync(Guid userId, CancellationToken ct = default);
    Task<EmergencyContactDto> AddContactAsync(Guid userId, CreateEmergencyContactRequest req, CancellationToken ct = default);
}

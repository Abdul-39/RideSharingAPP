using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Safety;

namespace RideSharing.Application.Interfaces;

public interface ISafetyService
{
    Task<ApiResponse<SafetySettingsDto>> GetSettingsAsync(Guid userId);
    Task<ApiResponse<SafetySettingsDto>> UpdateSettingsAsync(Guid userId, UpdateSafetySettingsRequest request);

    Task<ApiResponse<List<EmergencyContactDto>>> GetContactsAsync(Guid userId);
    Task<ApiResponse<EmergencyContactDto>> AddContactAsync(Guid userId, UpsertEmergencyContactRequest request);
    Task<ApiResponse<object>> DeleteContactAsync(Guid userId, Guid contactId);

    Task<ApiResponse<EmergencyAlertDto>> TriggerSosAsync(Guid userId, TriggerSosRequest request);
    Task<ApiResponse<List<EmergencyAlertDto>>> GetRideAlertsAsync(Guid rideId, Guid userId);
}

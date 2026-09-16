using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Chat;

namespace RideSharing.Application.Interfaces;

public interface IChatService
{
    Task<ApiResponse<List<ChatThreadDto>>> GetMyThreadsAsync(Guid userId);
    Task<ApiResponse<List<ChatMessageDto>>> GetMessagesAsync(Guid rideId, Guid userId);
    Task<ApiResponse<ChatMessageDto>> SendAsync(Guid rideId, Guid senderId, SendChatMessageRequest request);
    Task<ApiResponse<object>> MarkReadAsync(Guid rideId, Guid userId);
}

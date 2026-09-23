using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Payments;

namespace RideSharing.Application.Interfaces;

public interface IPaymentService
{
  Task<ApiResponse<FareBreakdownDto>> EstimateFareAsync(Guid rideId, Guid userId);
  Task<ApiResponse<PaymentDto>> CreatePaymentAsync(Guid userId, CreatePaymentRequest request);
  Task<ApiResponse<PaymentDto>> ConfirmCashAsync(Guid paymentId, Guid userId);
  Task<ApiResponse<PaymentDto>> ConfirmMobileWalletAsync(Guid paymentId, Guid userId, ConfirmMobileWalletRequest request);
  Task<ApiResponse<PaymentDto>> GetByIdAsync(Guid paymentId, Guid userId);
  Task<ApiResponse<List<PaymentDto>>> GetMyPaymentsAsync(Guid userId);
  Task<ApiResponse<List<PaymentDto>>> GetRidePaymentsAsync(Guid rideId, Guid userId);
}

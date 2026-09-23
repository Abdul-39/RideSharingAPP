using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RideSharing.Application.Common;
using RideSharing.Application.DTOs.Payments;
using RideSharing.Application.Interfaces;
using RideSharing.Domain.Entities;
using RideSharing.Domain.Enums;
using RideSharing.Infrastructure.Payment;
using RideSharing.Persistence.Context;
using PaymentEntity = RideSharing.Domain.Entities.Payment;

namespace RideSharing.Infrastructure.Services;

public class PaymentService : IPaymentService
{
  private readonly RideSharingDbContext _db;
  private readonly IFareCalculator _fare;
  private readonly IEnumerable<IPaymentProvider> _providers;
  private readonly PaymentOtpStore _otp;
  private readonly IConfiguration _config;

  public PaymentService(
      RideSharingDbContext db,
      IFareCalculator fare,
      IEnumerable<IPaymentProvider> providers,
      PaymentOtpStore otp,
      IConfiguration config)
  {
    _db = db;
    _fare = fare;
    _providers = providers;
    _otp = otp;
    _config = config;
  }

  public async Task<ApiResponse<FareBreakdownDto>> EstimateFareAsync(Guid rideId, Guid userId)
  {
    var ride = await LoadRide(rideId);
    if (ride == null) return ApiResponse<FareBreakdownDto>.FailureResponse("Ride not found.");
    if (!IsParticipant(ride, userId)) return ApiResponse<FareBreakdownDto>.FailureResponse("Not allowed.");
    return ApiResponse<FareBreakdownDto>.SuccessResponse(BuildFare(ride));
  }

  public async Task<ApiResponse<PaymentDto>> CreatePaymentAsync(Guid userId, CreatePaymentRequest request)
  {
    var ride = await LoadRide(request.RideId);
    if (ride == null) return ApiResponse<PaymentDto>.FailureResponse("Ride not found.");
    if (!IsParticipant(ride, userId)) return ApiResponse<PaymentDto>.FailureResponse("Not allowed.");

    if (ride.Status is not (RideStatus.Completed or RideStatus.InProgress or RideStatus.DriverArrived or RideStatus.Confirmed))
      return ApiResponse<PaymentDto>.FailureResponse("Payment is available after the ride is confirmed/completed.");

    if (!TryParseMethod(request.Method, out var method))
      return ApiResponse<PaymentDto>.FailureResponse("Method must be Cash, MockWallet, JazzCash, or EasyPaisa.");

    var existing = await _db.Payments.FirstOrDefaultAsync(p =>
        p.RideId == ride.Id && p.PayerUserId == userId &&
        p.Status != PaymentStatus.Failed && p.Status != PaymentStatus.Refunded);

    if (existing != null && existing.Status == PaymentStatus.Completed)
      return ApiResponse<PaymentDto>.SuccessResponse(Map(existing), "Already paid.");

    if (existing != null && existing.Status is PaymentStatus.Pending or PaymentStatus.Processing)
    {
      var dto = Map(existing);
      if (IsMobileWallet(existing.Method) && _otp.HasPending(existing.Id))
      {
        dto.RequiresConfirmation = true;
        return ApiResponse<PaymentDto>.SuccessResponse(dto, "Payment awaiting OTP confirmation.");
      }
      return ApiResponse<PaymentDto>.SuccessResponse(dto, "Payment already in progress.");
    }

    var fare = BuildFare(ride);
    var payee = ride.Participants.FirstOrDefault(p => p.Role == ParticipantRole.Driver && !p.IsDeleted)?.UserId;

    if (payee == userId)
      return ApiResponse<PaymentDto>.FailureResponse("Driver receives payment; passenger should pay.");

    var payment = new PaymentEntity
    {
      Id = Guid.NewGuid(),
      RideId = ride.Id,
      PayerUserId = userId,
      PayeeUserId = payee,
      Method = method,
      Status = PaymentStatus.Pending,
      Amount = fare.SharedFarePerPassenger,
      Currency = fare.Currency,
      BaseFare = fare.BaseFare,
      DistanceKm = fare.DistanceKm,
      DistanceFare = fare.DistanceFare,
      ParticipantCount = fare.ParticipantCount,
      SharedFare = fare.SharedFarePerPassenger,
      CreatedAt = DateTime.UtcNow
    };
    _db.Payments.Add(payment);
    ride.FareAmount = fare.TotalFare;
    await _db.SaveChangesAsync();

    // Cash + MockWallet → complete immediately (passenger confirms; driver is payee on record)
    if (method == PaymentMethodType.MockWallet || method == PaymentMethodType.Cash)
      return await ProcessWithProviderAsync(payment);

    // JazzCash / EasyPaisa → secure OTP simulation
    return StartMobileWalletOtp(payment, request.MobileAccount);
  }

  public async Task<ApiResponse<PaymentDto>> ConfirmCashAsync(Guid paymentId, Guid userId)
  {
    var payment = await _db.Payments.FirstOrDefaultAsync(p => p.Id == paymentId);
    if (payment == null) return ApiResponse<PaymentDto>.FailureResponse("Payment not found.");
    if (payment.PayerUserId != userId && payment.PayeeUserId != userId)
      return ApiResponse<PaymentDto>.FailureResponse("Not allowed.");
    if (payment.Method != PaymentMethodType.Cash)
      return ApiResponse<PaymentDto>.FailureResponse("Only cash payments use confirm-cash.");
    if (payment.Status == PaymentStatus.Completed)
      return ApiResponse<PaymentDto>.SuccessResponse(Map(payment), "Already completed.");

    payment.Status = PaymentStatus.Processing;
    await _db.SaveChangesAsync();
    return await ProcessWithProviderAsync(payment);
  }

  public async Task<ApiResponse<PaymentDto>> ConfirmMobileWalletAsync(Guid paymentId, Guid userId, ConfirmMobileWalletRequest request)
  {
    var payment = await _db.Payments.FirstOrDefaultAsync(p => p.Id == paymentId);
    if (payment == null) return ApiResponse<PaymentDto>.FailureResponse("Payment not found.");
    if (payment.PayerUserId != userId)
      return ApiResponse<PaymentDto>.FailureResponse("Not allowed.");
    if (!IsMobileWallet(payment.Method))
      return ApiResponse<PaymentDto>.FailureResponse("Only JazzCash/EasyPaisa use OTP confirm.");
    if (payment.Status == PaymentStatus.Completed)
      return ApiResponse<PaymentDto>.SuccessResponse(Map(payment), "Already completed.");

    var (ok, err) = _otp.Verify(paymentId, request.ConfirmationCode ?? "");
    if (!ok)
      return ApiResponse<PaymentDto>.FailureResponse(err ?? "Invalid OTP.");

    payment.Status = PaymentStatus.Processing;
    await _db.SaveChangesAsync();
    return await ProcessWithProviderAsync(payment);
  }

  public async Task<ApiResponse<PaymentDto>> GetByIdAsync(Guid paymentId, Guid userId)
  {
    var payment = await _db.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.Id == paymentId);
    if (payment == null) return ApiResponse<PaymentDto>.FailureResponse("Not found.");
    if (payment.PayerUserId != userId && payment.PayeeUserId != userId)
      return ApiResponse<PaymentDto>.FailureResponse("Not allowed.");
    return ApiResponse<PaymentDto>.SuccessResponse(Map(payment));
  }

  public async Task<ApiResponse<List<PaymentDto>>> GetMyPaymentsAsync(Guid userId)
  {
    var list = await _db.Payments.AsNoTracking()
        .Where(p => p.PayerUserId == userId || p.PayeeUserId == userId)
        .OrderByDescending(p => p.CreatedAt)
        .Take(50)
        .ToListAsync();
    return ApiResponse<List<PaymentDto>>.SuccessResponse(list.Select(Map).ToList());
  }

  public async Task<ApiResponse<List<PaymentDto>>> GetRidePaymentsAsync(Guid rideId, Guid userId)
  {
    var ride = await LoadRide(rideId);
    if (ride == null) return ApiResponse<List<PaymentDto>>.FailureResponse("Ride not found.");
    if (!IsParticipant(ride, userId)) return ApiResponse<List<PaymentDto>>.FailureResponse("Not allowed.");

    var list = await _db.Payments.AsNoTracking()
        .Where(p => p.RideId == rideId)
        .OrderByDescending(p => p.CreatedAt)
        .ToListAsync();
    return ApiResponse<List<PaymentDto>>.SuccessResponse(list.Select(Map).ToList());
  }

  private ApiResponse<PaymentDto> StartMobileWalletOtp(PaymentEntity payment, string? mobileAccount)
  {
    var mobile = (mobileAccount ?? "").Trim();
    if (mobile.Length < 11)
      return ApiResponse<PaymentDto>.FailureResponse(
          $"Enter your {payment.Method} mobile number (03XXXXXXXXX).");

    var masked = MaskMobile(mobile);
    _otp.Create(payment.Id, payment.Method.ToString(), masked, out var plainOtp);

    var dto = Map(payment);
    dto.RequiresConfirmation = true;
    dto.MobileAccountMasked = masked;

    // FYP demo: show OTP only when enabled (never enable in real production)
    var showOtp = string.Equals(
        _config["Payments:SimulationShowOtp"], "true", StringComparison.OrdinalIgnoreCase);

    var msg = showOtp
        ? $"{payment.Method}: OTP sent to {masked}. Demo OTP: {plainOtp} (valid 5 min)."
        : $"{payment.Method}: OTP sent to {masked}. Enter the 6-digit code to complete payment.";

    return ApiResponse<PaymentDto>.SuccessResponse(dto, msg);
  }

  private async Task<ApiResponse<PaymentDto>> ProcessWithProviderAsync(PaymentEntity payment)
  {
    var provider = _providers.FirstOrDefault(p => p.Method == payment.Method);
    if (provider == null)
    {
      payment.Status = PaymentStatus.Failed;
      payment.FailureReason = "Payment provider not registered.";
      await _db.SaveChangesAsync();
      return ApiResponse<PaymentDto>.FailureResponse(payment.FailureReason);
    }

    payment.Status = PaymentStatus.Processing;
    await _db.SaveChangesAsync();

    var (ok, reference, error) = await provider.ProcessAsync(
        payment.Id, payment.PayerUserId, payment.PayeeUserId, payment.Amount);

    if (ok)
    {
      payment.Status = PaymentStatus.Completed;
      payment.ProviderReference = reference;
      payment.CompletedAt = DateTime.UtcNow;
      payment.FailureReason = null;
    }
    else
    {
      payment.Status = PaymentStatus.Failed;
      payment.FailureReason = error ?? "Payment failed.";
    }
    payment.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();

    return ok
        ? ApiResponse<PaymentDto>.SuccessResponse(Map(payment), "Payment completed.")
        : ApiResponse<PaymentDto>.FailureResponse(payment.FailureReason ?? "Payment failed.");
  }

  private FareBreakdownDto BuildFare(Ride ride)
  {
    var dist = 0.0;
    if (ride.Route != null)
    {
      dist = HaversineKm(
          (double)ride.Route.SourceLatitude, (double)ride.Route.SourceLongitude,
          (double)ride.Route.DestinationLatitude, (double)ride.Route.DestinationLongitude);
    }
    var passengers = ride.Participants.Count(p => !p.IsDeleted && p.Role == ParticipantRole.Passenger);
    if (passengers < 1) passengers = 1;
    return _fare.Calculate(dist, passengers);
  }

  private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
  {
    const double R = 6371;
    static double Rad(double d) => d * Math.PI / 180;
    var dLat = Rad(lat2 - lat1);
    var dLon = Rad(lon2 - lon1);
    var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(Rad(lat1)) * Math.Cos(Rad(lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
    return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
  }

  private async Task<Ride?> LoadRide(Guid id) =>
      await _db.Rides.Include(r => r.Route).Include(r => r.Participants)
          .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

  private static bool IsParticipant(Ride ride, Guid userId) =>
      ride.Participants.Any(p => p.UserId == userId && !p.IsDeleted);

  private static bool IsMobileWallet(PaymentMethodType m) =>
      m is PaymentMethodType.JazzCash or PaymentMethodType.EasyPaisa;

  private static bool TryParseMethod(string? method, out PaymentMethodType type)
  {
    type = PaymentMethodType.Cash;
    if (string.IsNullOrWhiteSpace(method)) return true;
    var n = method.Replace(" ", "").Trim();
    if (n.Equals("Jazz", StringComparison.OrdinalIgnoreCase)) n = "JazzCash";
    if (n.Equals("Easy", StringComparison.OrdinalIgnoreCase) ||
        n.Equals("EP", StringComparison.OrdinalIgnoreCase)) n = "EasyPaisa";
    if (n.Equals("Wallet", StringComparison.OrdinalIgnoreCase)) n = "MockWallet";
    return Enum.TryParse(n, true, out type) &&
           type is PaymentMethodType.Cash or PaymentMethodType.MockWallet
               or PaymentMethodType.JazzCash or PaymentMethodType.EasyPaisa;
  }

  private static string MaskMobile(string m)
  {
    if (m.Length < 5) return "****";
    return m[..3] + "*****" + m[^2..];
  }

  private static PaymentDto Map(PaymentEntity p) => new()
  {
    Id = p.Id,
    RideId = p.RideId,
    PayerUserId = p.PayerUserId,
    PayeeUserId = p.PayeeUserId,
    Method = p.Method.ToString(),
    Status = p.Status.ToString(),
    Amount = p.Amount,
    Currency = p.Currency,
    BaseFare = p.BaseFare,
    DistanceKm = p.DistanceKm,
    DistanceFare = p.DistanceFare,
    ParticipantCount = p.ParticipantCount,
    SharedFare = p.SharedFare,
    FailureReason = p.FailureReason,
    ProviderReference = p.ProviderReference,
    CreatedAt = p.CreatedAt,
    CompletedAt = p.CompletedAt,
    RequiresConfirmation = false
  };
}

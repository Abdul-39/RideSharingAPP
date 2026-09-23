using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace RideSharing.Infrastructure.Payment;

/// <summary>
/// In-memory secure OTP sessions for JazzCash / EasyPaisa simulation.
/// OTP is stored as SHA-256 hash only — never plaintext after generation.
/// </summary>
public sealed class PaymentOtpStore
{
  private sealed class Session
  {
    public required string OtpHash { get; init; }
    public required DateTime ExpiresAtUtc { get; init; }
    public int Attempts { get; set; }
    public string? MobileMasked { get; init; }
    public string Provider { get; init; } = "";
  }

  private readonly ConcurrentDictionary<Guid, Session> _sessions = new();
  private const int MaxAttempts = 5;
  private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

  public string Create(Guid paymentId, string provider, string? mobileMasked, out string plainOtp)
  {
    plainOtp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
    var hash = Hash(paymentId, plainOtp);
    _sessions[paymentId] = new Session
    {
      OtpHash = hash,
      ExpiresAtUtc = DateTime.UtcNow.Add(Ttl),
      Attempts = 0,
      MobileMasked = mobileMasked,
      Provider = provider
    };
    return plainOtp;
  }

  public (bool Ok, string? Error) Verify(Guid paymentId, string code)
  {
    if (!_sessions.TryGetValue(paymentId, out var s))
      return (false, "OTP session not found or already used. Start payment again.");

    if (DateTime.UtcNow > s.ExpiresAtUtc)
    {
      _sessions.TryRemove(paymentId, out _);
      return (false, "OTP expired. Start payment again.");
    }

    if (s.Attempts >= MaxAttempts)
    {
      _sessions.TryRemove(paymentId, out _);
      return (false, "Too many invalid attempts. Start payment again.");
    }

    var incoming = (code ?? "").Trim();
    if (incoming.Length < 4 || incoming.Length > 8)
    {
      s.Attempts++;
      return (false, "Enter the 6-digit OTP.");
    }

    var hash = Hash(paymentId, incoming);
    if (!CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(hash),
            Encoding.UTF8.GetBytes(s.OtpHash)))
    {
      s.Attempts++;
      var left = MaxAttempts - s.Attempts;
      if (left <= 0)
      {
        _sessions.TryRemove(paymentId, out _);
        return (false, "Too many invalid attempts. Start payment again.");
      }
      return (false, $"Invalid OTP. {left} attempt(s) left.");
    }

    _sessions.TryRemove(paymentId, out _);
    return (true, null);
  }

  public bool HasPending(Guid paymentId) =>
      _sessions.TryGetValue(paymentId, out var s) && DateTime.UtcNow <= s.ExpiresAtUtc;

  private static string Hash(Guid paymentId, string otp)
  {
    var raw = $"{paymentId:N}:{otp.Trim()}";
    var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
    return Convert.ToHexString(bytes);
  }
}

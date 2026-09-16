namespace RideSharing.Domain.Enums;

public enum PaymentMethodType
{
    Cash = 1,
    MockWallet = 2,
    // Future providers (architecture ready — not implemented yet)
    JazzCash = 10,
    EasyPaisa = 11,
    BankTransfer = 12
}

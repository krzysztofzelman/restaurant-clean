namespace Restaurant.Domain.Enums;

public enum OrderStatus
{
    Pending,
    Confirmed,
    Preparing,
    Ready,
    InTransit,
    Delivered,
    Cancelled
}

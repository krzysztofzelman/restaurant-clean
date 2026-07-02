using Restaurant.Application.DTOs.Order;

namespace Restaurant.Application.Interfaces;

public interface IOrderService
{
    /// <summary>Create an order with items in a transaction. Validates menu item availability and stock.</summary>
    Task<OrderResponse> CreateOrderAsync(Guid userId, CreateOrderRequest request);

    /// <summary>Get a single order by ID.</summary>
    Task<OrderResponse?> GetOrderByIdAsync(Guid id);

    /// <summary>List orders with role-based filtering.</summary>
    Task<List<OrderResponse>> ListOrdersAsync(
        Guid? userId = null,
        string? role = null,
        string? statusFilter = null,
        Guid? courierId = null);

    /// <summary>Update order status with state machine validation.</summary>
    Task<OrderResponse> UpdateOrderStatusAsync(Guid orderId, string newStatus, Guid? courierId = null);

    /// <summary>Assign a courier to an order.</summary>
    Task<OrderResponse> AssignCourierAsync(Guid orderId, Guid courierId);

    /// <summary>Update payment status (admin only).</summary>
    Task<OrderResponse> UpdatePaymentStatusAsync(Guid orderId, string paymentStatus);

    /// <summary>Consume ingredients for an order (decrement stock).</summary>
    Task ConsumeIngredientsForOrderAsync(Guid orderId);

    /// <summary>Cancel unpaid orders older than the specified threshold (for scheduled tasks).</summary>
    Task<int> CancelUnpaidOrdersAsync(TimeSpan olderThan);
}

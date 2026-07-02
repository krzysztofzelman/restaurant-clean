using Microsoft.EntityFrameworkCore;
using Restaurant.Application.DTOs.Order;
using Restaurant.Application.Interfaces;
using Restaurant.Domain.Entities;
using Restaurant.Domain.Enums;
using Restaurant.Domain.Interfaces;
using Restaurant.Infrastructure.Data;

namespace Restaurant.Infrastructure.Services;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepo;
    private readonly IMenuItemRepository _menuItemRepo;
    private readonly IUserRepository _userRepo;
    private readonly AppDbContext _db;

    private static readonly Dictionary<string, HashSet<string>> ValidTransitions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["pending"] = ["confirmed", "cancelled"],
        ["confirmed"] = ["preparing", "cancelled"],
        ["preparing"] = ["ready", "cancelled"],
        ["ready"] = ["in_transit", "cancelled"],
        ["in_transit"] = ["delivered", "cancelled"],
        ["delivered"] = [],
        ["cancelled"] = [],
    };

    public OrderService(
        IOrderRepository orderRepo,
        IMenuItemRepository menuItemRepo,
        IUserRepository userRepo,
        AppDbContext db)
    {
        _orderRepo = orderRepo;
        _menuItemRepo = menuItemRepo;
        _userRepo = userRepo;
        _db = db;
    }

    public async Task<OrderResponse> CreateOrderAsync(Guid userId, CreateOrderRequest request)
    {
        if (request.Items.Count == 0)
            throw new ArgumentException("Order must contain at least one item.");

        // Validate all menu items exist and are available
        var menuItemIds = request.Items.Select(i => i.MenuItemId).Distinct().ToList();
        var menuItems = new List<MenuItem>();
        foreach (var id in menuItemIds)
        {
            var item = await _menuItemRepo.GetByIdAsync(id);
            if (item == null)
                throw new KeyNotFoundException($"Menu item with ID {id} not found.");
            if (!item.IsAvailable)
                throw new InvalidOperationException($"Menu item '{item.Name}' is not available.");
            menuItems.Add(item);
        }

        var menuItemMap = menuItems.ToDictionary(m => m.Id);

        await using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            var orderItems = new List<OrderItem>();
            foreach (var itemReq in request.Items)
            {
                var menuItem = menuItemMap[itemReq.MenuItemId];
                var subtotal = menuItem.Price * itemReq.Quantity;

                orderItems.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    MenuItemId = itemReq.MenuItemId,
                    Quantity = itemReq.Quantity,
                    UnitPrice = menuItem.Price,
                    Subtotal = subtotal,
                });
            }

            var totalAmount = orderItems.Sum(oi => oi.Subtotal);

            var order = new Order
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Status = OrderStatus.Pending,
                TotalAmount = totalAmount,
                DeliveryAddress = request.DeliveryAddress,
                Notes = request.Notes,
                CreatedAt = DateTime.UtcNow,
                OrderItems = orderItems,
            };

            var created = await _orderRepo.CreateAsync(order);
            await transaction.CommitAsync();

            // Reload with details to include navigation properties
            var withDetails = await _orderRepo.GetByIdWithDetailsAsync(created.Id);
            return MapToResponse(withDetails!);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<OrderResponse?> GetOrderByIdAsync(Guid id)
    {
        var order = await _orderRepo.GetByIdWithDetailsAsync(id);
        return order == null ? null : MapToResponse(order);
    }

    public async Task<List<OrderResponse>> ListOrdersAsync(
        Guid? userId = null,
        string? role = null,
        string? statusFilter = null,
        Guid? courierId = null)
    {
        List<Order> orders;

        if (role == "Courier" || courierId.HasValue)
        {
            var cid = courierId ?? userId;
            if (cid == null)
                throw new ArgumentException("Courier ID is required for courier role.");

            orders = await _orderRepo.GetByCourierIdAsync(cid.Value);
        }
        else if (role == "Kitchen")
        {
            orders = await _orderRepo.GetKitchenOrdersAsync();
        }
        else if (userId.HasValue)
        {
            orders = await _orderRepo.GetByUserIdAsync(userId.Value);
        }
        else
        {
            orders = await _orderRepo.GetAllAsync(statusFilter);
        }

        return orders.Select(MapToResponse).ToList();
    }

    public async Task<OrderResponse> UpdateOrderStatusAsync(Guid orderId, string newStatus, Guid? courierId = null)
    {
        var order = await _orderRepo.GetByIdWithDetailsAsync(orderId)
            ?? throw new KeyNotFoundException($"Order with ID {orderId} not found.");

        var currentStatus = order.Status.ToString();
        var normalizedNew = NormalizeStatus(newStatus);

        if (!ValidTransitions.TryGetValue(currentStatus, out var allowed))
            throw new InvalidOperationException($"Order status '{currentStatus}' is terminal and cannot be changed.");

        if (!allowed.Contains(normalizedNew))
            throw new InvalidOperationException(
                $"Cannot transition order from '{currentStatus}' to '{normalizedNew}'.");

        order.Status = Enum.Parse<OrderStatus>(normalizedNew, ignoreCase: true);

        // Update delivery status based on order status
        if (normalizedNew == "InTransit")
        {
            if (courierId.HasValue)
                order.CourierId = courierId.Value;

            order.DeliveryStatus = DeliveryStatus.InDelivery;
        }
        else if (normalizedNew == "Delivered")
        {
            order.DeliveryStatus = DeliveryStatus.Delivered;
        }
        else
        {
            order.DeliveryStatus = DeliveryStatus.Pending;
        }

        var updated = await _orderRepo.UpdateAsync(order);
        return MapToResponse(updated);
    }

    public async Task<OrderResponse> AssignCourierAsync(Guid orderId, Guid courierId)
    {
        var order = await _orderRepo.GetByIdWithDetailsAsync(orderId)
            ?? throw new KeyNotFoundException($"Order with ID {orderId} not found.");

        var courier = await _userRepo.GetByIdAsync(courierId)
            ?? throw new KeyNotFoundException($"User with ID {courierId} not found.");

        if (courier.Role != UserRole.Courier)
            throw new InvalidOperationException("User is not a courier.");

        order.CourierId = courierId;
        order.DeliveryStatus = DeliveryStatus.Assigned;

        var updated = await _orderRepo.UpdateAsync(order);
        return MapToResponse(updated);
    }

    public async Task<OrderResponse> UpdatePaymentStatusAsync(Guid orderId, string paymentStatus)
    {
        var order = await _orderRepo.GetByIdWithDetailsAsync(orderId)
            ?? throw new KeyNotFoundException($"Order with ID {orderId} not found.");

        if (!Enum.TryParse<PaymentStatus>(paymentStatus, ignoreCase: true, out var parsed))
            throw new ArgumentException($"Invalid payment status: '{paymentStatus}'.");

        order.PaymentStatus = parsed;

        var updated = await _orderRepo.UpdateAsync(order);
        return MapToResponse(updated);
    }

    public async Task ConsumeIngredientsForOrderAsync(Guid orderId)
    {
        var order = await _orderRepo.GetByIdWithDetailsAsync(orderId)
            ?? throw new KeyNotFoundException($"Order with ID {orderId} not found.");

        foreach (var orderItem in order.OrderItems)
        {
            var recipeItems = await _db.MenuItemIngredients
                .Where(mi => mi.MenuItemId == orderItem.MenuItemId)
                .Include(mi => mi.Ingredient)
                    .ThenInclude(i => i.Batches)
                .ToListAsync();

            foreach (var recipeItem in recipeItems)
            {
                var totalNeeded = recipeItem.QuantityNeeded * orderItem.Quantity;
                var remaining = totalNeeded;

                // Consume from batches in FIFO order (oldest first)
                var sortedBatches = recipeItem.Ingredient.Batches
                    .Where(b => b.Quantity > 0)
                    .OrderBy(b => b.ReceivedAt)
                    .ToList();

                foreach (var batch in sortedBatches)
                {
                    if (remaining <= 0)
                        break;

                    var toConsume = Math.Min(remaining, batch.Quantity);
                    batch.Quantity -= toConsume;
                    remaining -= toConsume;
                }

                if (remaining > 0)
                    throw new InvalidOperationException(
                        $"Insufficient stock for ingredient '{recipeItem.Ingredient.Name}'. " +
                        $"Need {totalNeeded} {recipeItem.Ingredient.Unit}, but only " +
                        $"{totalNeeded - remaining} available.");
            }
        }

        await _db.SaveChangesAsync();
    }

    public async Task<int> CancelUnpaidOrdersAsync(TimeSpan olderThan)
    {
        var cutoff = DateTime.UtcNow - olderThan;
        var unpaidOrders = await _orderRepo.GetUnpaidOlderThanAsync(cutoff);

        if (unpaidOrders.Count == 0)
            return 0;

        foreach (var order in unpaidOrders)
        {
            order.Status = OrderStatus.Cancelled;
        }

        await _db.SaveChangesAsync();
        return unpaidOrders.Count;
    }

    private static OrderResponse MapToResponse(Order order)
    {
        return new OrderResponse
        {
            Id = order.Id,
            UserId = order.UserId,
            Status = order.Status.ToString(),
            DeliveryStatus = order.DeliveryStatus.ToString(),
            TotalAmount = order.TotalAmount,
            PaymentStatus = order.PaymentStatus.ToString(),
            DeliveryAddress = order.DeliveryAddress,
            Notes = order.Notes,
            CourierId = order.CourierId,
            CreatedAt = order.CreatedAt,
            Items = order.OrderItems.Select(oi => new OrderItemResponse
            {
                Id = oi.Id,
                MenuItemId = oi.MenuItemId,
                Quantity = oi.Quantity,
                UnitPrice = oi.UnitPrice,
                Subtotal = oi.Subtotal,
                MenuItem = oi.MenuItem == null ? null : new MenuItemBrief
                {
                    Id = oi.MenuItem.Id,
                    Name = oi.MenuItem.Name,
                    Price = oi.MenuItem.Price,
                    ImageUrl = oi.MenuItem.ImageUrl,
                },
            }).ToList(),
            User = order.User == null ? null : new UserBrief
            {
                Id = order.User.Id,
                Email = order.User.Email,
                FullName = order.User.FullName,
                Role = order.User.Role.ToString(),
            },
        };
    }

    /// <summary>Convert status string (e.g. "in_transit") to PascalCase enum name (e.g. "InTransit").</summary>
    private static string NormalizeStatus(string status)
    {
        if (string.IsNullOrWhiteSpace(status))
            throw new ArgumentException("Status cannot be empty.");

        return string.Join("", status
            .Split('_', '-')
            .Select(part => char.ToUpper(part[0]) + part[1..].ToLower()));
    }
}

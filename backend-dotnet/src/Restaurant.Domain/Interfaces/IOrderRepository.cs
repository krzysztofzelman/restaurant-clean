using Restaurant.Domain.Entities;

namespace Restaurant.Domain.Interfaces;

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid id);
    Task<Order?> GetByIdWithDetailsAsync(Guid id);
    Task<List<Order>> GetByUserIdAsync(Guid userId);
    Task<List<Order>> GetByStatusAsync(string status);
    Task<List<Order>> GetByCourierIdAsync(Guid courierId);
    Task<List<Order>> GetKitchenOrdersAsync();
    Task<List<Order>> GetCourierOrdersAsync();
    Task<List<Order>> GetAllAsync(string? statusFilter = null);
    Task<Order> CreateAsync(Order order);
    Task<Order> UpdateAsync(Order order);
    Task<List<Order>> GetUnpaidOlderThanAsync(DateTime cutoff);
}

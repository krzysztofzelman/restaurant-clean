using Restaurant.Domain.Entities;

namespace Restaurant.Domain.Interfaces;

public interface IMenuItemRepository
{
    Task<MenuItem?> GetByIdAsync(Guid id);
    Task<List<MenuItem>> GetAllAsync(string? category, bool availableOnly);
    Task<List<string>> GetCategoriesAsync();
    Task<MenuItem> CreateAsync(MenuItem item);
    Task<MenuItem> UpdateAsync(MenuItem item);
    Task<bool> DeleteAsync(Guid id);
}

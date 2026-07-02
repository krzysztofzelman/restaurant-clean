using Restaurant.Application.DTOs.Menu;

namespace Restaurant.Application.Interfaces;

public interface IMenuItemService
{
    Task<List<MenuItemResponse>> GetAllAsync(string? category, bool availableOnly);
    Task<List<string>> GetCategoriesAsync();
    Task<MenuItemResponse?> GetByIdAsync(Guid id);
    Task<MenuItemResponse> CreateAsync(CreateMenuItemRequest request);
    Task<MenuItemResponse?> UpdateAsync(Guid id, UpdateMenuItemRequest request);
    Task<bool> DeleteAsync(Guid id);
}

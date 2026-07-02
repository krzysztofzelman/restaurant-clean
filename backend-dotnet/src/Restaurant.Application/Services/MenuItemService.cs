using Restaurant.Application.DTOs.Menu;
using Restaurant.Application.Interfaces;
using Restaurant.Domain.Entities;
using Restaurant.Domain.Interfaces;

namespace Restaurant.Application.Services;

public class MenuItemService : IMenuItemService
{
    private readonly IMenuItemRepository _repo;

    public MenuItemService(IMenuItemRepository repo)
    {
        _repo = repo;
    }

    public async Task<List<MenuItemResponse>> GetAllAsync(string? category, bool availableOnly)
    {
        var items = await _repo.GetAllAsync(category, availableOnly);
        return items.Select(MapToResponse).ToList();
    }

    public async Task<List<string>> GetCategoriesAsync()
    {
        return await _repo.GetCategoriesAsync();
    }

    public async Task<MenuItemResponse?> GetByIdAsync(Guid id)
    {
        var item = await _repo.GetByIdAsync(id);
        return item == null ? null : MapToResponse(item);
    }

    public async Task<MenuItemResponse> CreateAsync(CreateMenuItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Name is required.");

        if (request.Price < 0)
            throw new ArgumentException("Price must be non-negative.");

        if (string.IsNullOrWhiteSpace(request.Category))
            throw new ArgumentException("Category is required.");

        var item = new MenuItem
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Price = request.Price,
            Category = request.Category.Trim(),
            IsAvailable = request.IsAvailable,
            ImageUrl = request.ImageUrl?.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        var created = await _repo.CreateAsync(item);
        return MapToResponse(created);
    }

    public async Task<MenuItemResponse?> UpdateAsync(Guid id, UpdateMenuItemRequest request)
    {
        var item = await _repo.GetByIdAsync(id);
        if (item == null)
            return null;

        if (request.Name != null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Name cannot be empty.");
            item.Name = request.Name.Trim();
        }

        if (request.Description != null)
            item.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();

        if (request.Price.HasValue)
        {
            if (request.Price.Value < 0)
                throw new ArgumentException("Price must be non-negative.");
            item.Price = request.Price.Value;
        }

        if (request.Category != null)
        {
            if (string.IsNullOrWhiteSpace(request.Category))
                throw new ArgumentException("Category cannot be empty.");
            item.Category = request.Category.Trim();
        }

        if (request.IsAvailable.HasValue)
            item.IsAvailable = request.IsAvailable.Value;

        if (request.ImageUrl != null)
            item.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();

        var updated = await _repo.UpdateAsync(item);
        return MapToResponse(updated);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        return await _repo.DeleteAsync(id);
    }

    private static MenuItemResponse MapToResponse(MenuItem item)
    {
        return new MenuItemResponse
        {
            Id = item.Id,
            Name = item.Name,
            Description = item.Description,
            Price = item.Price,
            Category = item.Category,
            IsAvailable = item.IsAvailable,
            ImageUrl = item.ImageUrl,
            CreatedAt = item.CreatedAt,
        };
    }
}

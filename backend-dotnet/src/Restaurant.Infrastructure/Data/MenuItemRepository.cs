using Microsoft.EntityFrameworkCore;
using Restaurant.Domain.Entities;
using Restaurant.Domain.Interfaces;

namespace Restaurant.Infrastructure.Data;

public class MenuItemRepository : IMenuItemRepository
{
    private readonly AppDbContext _db;

    public MenuItemRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<MenuItem?> GetByIdAsync(Guid id)
    {
        return await _db.MenuItems.FirstOrDefaultAsync(m => m.Id == id);
    }

    public async Task<List<MenuItem>> GetAllAsync(string? category, bool availableOnly)
    {
        var query = _db.MenuItems.AsQueryable();

        if (availableOnly)
            query = query.Where(m => m.IsAvailable);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(m => m.Category == category);

        return await query
            .OrderBy(m => m.Category)
            .ThenBy(m => m.Name)
            .ToListAsync();
    }

    public async Task<List<string>> GetCategoriesAsync()
    {
        return await _db.MenuItems
            .Where(m => m.IsAvailable)
            .Select(m => m.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
    }

    public async Task<MenuItem> CreateAsync(MenuItem item)
    {
        _db.MenuItems.Add(item);
        await _db.SaveChangesAsync();
        return item;
    }

    public async Task<MenuItem> UpdateAsync(MenuItem item)
    {
        _db.MenuItems.Update(item);
        await _db.SaveChangesAsync();
        return item;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var item = await _db.MenuItems.FirstOrDefaultAsync(m => m.Id == id);
        if (item == null)
            return false;

        _db.MenuItems.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Restaurant.Application.DTOs.Menu;
using Restaurant.Application.Interfaces;

namespace Restaurant.WebAPI.Controllers;

[ApiController]
[Route("api/menu")]
public class MenuItemController : ControllerBase
{
    private readonly IMenuItemService _menuItemService;

    public MenuItemController(IMenuItemService menuItemService)
    {
        _menuItemService = menuItemService;
    }

    /// <summary>List all menu items, optionally filtered by category and availability.</summary>
    [HttpGet]
    public async Task<ActionResult<List<MenuItemResponse>>> GetAll(
        [FromQuery] string? category = null,
        [FromQuery] bool availableOnly = true)
    {
        var items = await _menuItemService.GetAllAsync(category, availableOnly);
        return Ok(items);
    }

    /// <summary>List all distinct categories.</summary>
    [HttpGet("categories")]
    public async Task<ActionResult<List<string>>> GetCategories()
    {
        var categories = await _menuItemService.GetCategoriesAsync();
        return Ok(categories);
    }

    /// <summary>Get a single menu item by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MenuItemResponse>> GetById(Guid id)
    {
        var item = await _menuItemService.GetByIdAsync(id);
        if (item == null)
            return NotFound(new { error = "Menu item not found." });

        return Ok(item);
    }

    /// <summary>Create a new menu item. Admin only.</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<MenuItemResponse>> Create(
        [FromBody] CreateMenuItemRequest request)
    {
        try
        {
            var item = await _menuItemService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Update an existing menu item. Admin only.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<MenuItemResponse>> Update(
        Guid id, [FromBody] UpdateMenuItemRequest request)
    {
        try
        {
            var item = await _menuItemService.UpdateAsync(id, request);
            if (item == null)
                return NotFound(new { error = "Menu item not found." });

            return Ok(item);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Delete a menu item. Admin only.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var deleted = await _menuItemService.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { error = "Menu item not found." });

        return NoContent();
    }
}

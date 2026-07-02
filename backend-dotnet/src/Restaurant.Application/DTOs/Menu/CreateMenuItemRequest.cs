namespace Restaurant.Application.DTOs.Menu;

public class CreateMenuItemRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string Category { get; set; } = string.Empty;
    public bool IsAvailable { get; set; } = true;
    public string? ImageUrl { get; set; }
}

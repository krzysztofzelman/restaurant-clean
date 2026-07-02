namespace Restaurant.Application.DTOs.Menu;

public class UpdateMenuItemRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public string? Category { get; set; }
    public bool? IsAvailable { get; set; }
    public string? ImageUrl { get; set; }
}

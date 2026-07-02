namespace Restaurant.Domain.Entities;

public class IngredientBatch
{
    public Guid Id { get; set; }
    public Guid IngredientId { get; set; }
    public decimal Quantity { get; set; }
    public decimal? CostPerUnit { get; set; }
    public DateTime ReceivedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Ingredient Ingredient { get; set; } = null!;
}

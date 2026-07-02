namespace Restaurant.Domain.Entities;

public class MenuItemIngredient
{
    public Guid Id { get; set; }
    public Guid MenuItemId { get; set; }
    public Guid IngredientId { get; set; }
    public decimal QuantityNeeded { get; set; }

    public MenuItem MenuItem { get; set; } = null!;
    public Ingredient Ingredient { get; set; } = null!;
}

using System.Security.Claims;

namespace Restaurant.Domain.Interfaces;

public interface IJwtService
{
    string GenerateAccessToken(Guid userId, string role);
    string GenerateRefreshToken(Guid userId);
    ClaimsPrincipal? ValidateToken(string token);
    Guid? GetUserIdFromToken(string token);
}

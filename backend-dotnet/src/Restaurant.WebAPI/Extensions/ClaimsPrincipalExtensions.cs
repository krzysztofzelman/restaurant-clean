using System.Security.Claims;

namespace Restaurant.WebAPI.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal principal)
    {
        var nameId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (nameId == null || !Guid.TryParse(nameId, out var userId))
            return null;

        return userId;
    }

    public static string? GetUserRole(this ClaimsPrincipal principal)
    {
        return principal.FindFirst(ClaimTypes.Role)?.Value;
    }
}

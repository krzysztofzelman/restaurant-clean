using Restaurant.Application.DTOs.Auth;

namespace Restaurant.Application.Interfaces;

public interface IAuthService
{
    Task<UserResponse> RegisterAsync(RegisterRequest request);
    Task<TokenResponse> LoginAsync(LoginRequest request);
    Task<TokenResponse> RefreshTokenAsync(string? refreshToken);
    Task LogoutAsync();
    Task<UserResponse> GetCurrentUserAsync(Guid userId);
    Task<List<UserResponse>> GetAllUsersAsync();
    Task<UserResponse> UpdateUserRoleAsync(Guid userId, string role);
}

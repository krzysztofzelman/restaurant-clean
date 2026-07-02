using Restaurant.Application.DTOs.Auth;
using Restaurant.Application.Interfaces;
using Restaurant.Domain.Entities;
using Restaurant.Domain.Enums;
using Restaurant.Domain.Interfaces;

namespace Restaurant.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtService _jwtService;

    public AuthService(
        IUserRepository userRepo,
        IPasswordHasher passwordHasher,
        IJwtService jwtService)
    {
        _userRepo = userRepo;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
    }

    public async Task<UserResponse> RegisterAsync(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            throw new ArgumentException("Password must be at least 6 characters long.");

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Email is required.");

        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new ArgumentException("Full name is required.");

        var existing = await _userRepo.GetByEmailAsync(request.Email);
        if (existing != null)
            throw new InvalidOperationException("A user with this email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = _passwordHasher.Hash(request.Password),
            FullName = request.FullName.Trim(),
            Role = UserRole.User,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        var created = await _userRepo.CreateAsync(user);
        return MapToResponse(created);
    }

    public async Task<TokenResponse> LoginAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Email is required.");

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Password is required.");

        var user = await _userRepo.GetByEmailAsync(request.Email.Trim().ToLowerInvariant());
        if (user == null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is deactivated.");

        var accessToken = _jwtService.GenerateAccessToken(user.Id, user.Role.ToString());
        var refreshToken = _jwtService.GenerateRefreshToken(user.Id);

        return new TokenResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            TokenType = "bearer",
        };
    }

    public async Task<TokenResponse> RefreshTokenAsync(string? refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            throw new ArgumentException("Refresh token is required.");

        var userId = _jwtService.GetUserIdFromToken(refreshToken);
        if (userId == null)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        var user = await _userRepo.GetByIdAsync(userId.Value);
        if (user == null || !user.IsActive)
            throw new UnauthorizedAccessException("User not found or deactivated.");

        // Rotate tokens
        var newAccessToken = _jwtService.GenerateAccessToken(user.Id, user.Role.ToString());
        var newRefreshToken = _jwtService.GenerateRefreshToken(user.Id);

        return new TokenResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            TokenType = "bearer",
        };
    }

    public Task LogoutAsync()
    {
        // Stateless JWT — no server-side token storage to clear.
        // The controller handles clearing the refresh cookie.
        return Task.CompletedTask;
    }

    public async Task<UserResponse> GetCurrentUserAsync(Guid userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null)
            throw new KeyNotFoundException("User not found.");

        return MapToResponse(user);
    }

    public async Task<List<UserResponse>> GetAllUsersAsync()
    {
        var users = await _userRepo.GetAllAsync();
        return users.Select(MapToResponse).ToList();
    }

    public async Task<UserResponse> UpdateUserRoleAsync(Guid userId, string role)
    {
        if (!Enum.TryParse<UserRole>(role, ignoreCase: true, out var parsedRole))
        {
            var valid = string.Join(", ", Enum.GetNames<UserRole>());
            throw new ArgumentException($"Invalid role. Valid values: {valid}");
        }

        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null)
            throw new KeyNotFoundException("User not found.");

        user.Role = parsedRole;
        var updated = await _userRepo.UpdateAsync(user);
        return MapToResponse(updated);
    }

    private static UserResponse MapToResponse(User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
        };
    }
}

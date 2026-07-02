using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Restaurant.Application.DTOs.Order;
using Restaurant.Application.Interfaces;
using Restaurant.WebAPI.Extensions;

namespace Restaurant.WebAPI.Controllers;

[ApiController]
[Route("api/orders")]
public class OrderController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrderController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    /// <summary>Create a new order. Any authenticated user.</summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<OrderResponse>> Create([FromBody] CreateOrderRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Invalid token." });

        try
        {
            var order = await _orderService.CreateOrderAsync(userId.Value, request);
            return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    /// <summary>List orders. Role-based filtering: Courier → own courier orders, Kitchen → pending/confirmed/preparing, User → own orders.</summary>
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<List<OrderResponse>>> List(
        [FromQuery] string? status = null)
    {
        var userId = User.GetUserId();
        var role = User.GetUserRole();

        if (userId == null)
            return Unauthorized(new { error = "Invalid token." });

        List<OrderResponse> orders;

        if (role == "Courier")
        {
            orders = await _orderService.ListOrdersAsync(courierId: userId, role: role);
        }
        else if (role == "Kitchen")
        {
            orders = await _orderService.ListOrdersAsync(role: role);
        }
        else
        {
            orders = await _orderService.ListOrdersAsync(
                userId: userId,
                role: role,
                statusFilter: status);
        }

        return Ok(orders);
    }

    /// <summary>Get a single order by ID. Regular users can only see their own orders.</summary>
    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<OrderResponse>> GetById(Guid id)
    {
        var userId = User.GetUserId();
        var role = User.GetUserRole();

        if (userId == null)
            return Unauthorized(new { error = "Invalid token." });

        var order = await _orderService.GetOrderByIdAsync(id);
        if (order == null)
            return NotFound(new { error = "Order not found." });

        // Regular users can only see their own orders
        if (role != "Admin" && role != "Kitchen" && order.UserId != userId.Value)
            return Forbid();

        return Ok(order);
    }

    /// <summary>Update order status. Admin, Kitchen, or Courier (in_transit only).</summary>
    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "Admin,Kitchen,Courier")]
    public async Task<ActionResult<OrderResponse>> UpdateStatus(
        Guid id, [FromBody] UpdateOrderStatusRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Invalid token." });

        try
        {
            var order = await _orderService.UpdateOrderStatusAsync(id, request.Status, userId);
            return Ok(order);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    /// <summary>Update payment status. Admin only.</summary>
    [HttpPut("{id:guid}/payment-status")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<OrderResponse>> UpdatePaymentStatus(
        Guid id, [FromBody] UpdatePaymentStatusRequest request)
    {
        try
        {
            var order = await _orderService.UpdatePaymentStatusAsync(id, request.PaymentStatus);
            return Ok(order);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Get orders assigned to the current courier.</summary>
    [HttpGet("courier")]
    [Authorize(Roles = "Courier")]
    public async Task<ActionResult<List<OrderResponse>>> GetMyCourierOrders()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(new { error = "Invalid token." });

        var orders = await _orderService.ListOrdersAsync(courierId: userId, role: "Courier");
        return Ok(orders);
    }

    /// <summary>Assign a courier to an order. Admin only.</summary>
    [HttpPut("{id:guid}/courier")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<OrderResponse>> AssignCourier(
        Guid id, [FromBody] AssignCourierRequest request)
    {
        try
        {
            var order = await _orderService.AssignCourierAsync(id, request.CourierId);
            return Ok(order);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}

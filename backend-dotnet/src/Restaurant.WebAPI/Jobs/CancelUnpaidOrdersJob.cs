using Restaurant.Application.Interfaces;

namespace Restaurant.WebAPI.Jobs;

public class CancelUnpaidOrdersJob
{
    private readonly IOrderService _orderService;
    private readonly ILogger<CancelUnpaidOrdersJob> _logger;

    public CancelUnpaidOrdersJob(IOrderService orderService, ILogger<CancelUnpaidOrdersJob> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    /// <summary>
    /// Cancel unpaid orders older than the specified threshold.
    /// Called by Hangfire recurring job.
    /// </summary>
    public async Task Run(TimeSpan olderThan)
    {
        var count = await _orderService.CancelUnpaidOrdersAsync(olderThan);
        if (count > 0)
        {
            _logger.LogInformation("Cancelled {Count} unpaid orders older than {Threshold}.", count, olderThan);
        }
    }
}

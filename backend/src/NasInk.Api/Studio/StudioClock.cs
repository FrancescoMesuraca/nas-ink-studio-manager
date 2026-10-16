namespace NasInk.Api.Studio;

/// <summary>
/// "Oggi" per lo studio. Il server può girare in UTC (es. in un container), ma le date delle
/// prenotazioni sono quelle di Milano: il fuso si configura in Studio:TimeZone.
/// </summary>
public sealed class StudioClock(TimeProvider clock, IConfiguration configuration)
{
    private readonly TimeZoneInfo _timeZone =
        TimeZoneInfo.FindSystemTimeZoneById(configuration.GetValue("Studio:TimeZone", "Europe/Rome")!);

    public DateOnly Today() => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(), _timeZone).DateTime);
}

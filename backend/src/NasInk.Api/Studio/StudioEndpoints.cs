using Microsoft.EntityFrameworkCore;
using NasInk.Api.Data;
using NasInk.Api.Errors;
using NasInk.Domain.Requests;
using NasInk.Domain.Studio;

namespace NasInk.Api.Studio;

// Endpoint del gestionale (frontend/src/api/studio/studioApi.http.ts). Tutti richiedono il login;
// le modifiche alla configurazione saranno riservate al titolare.
//
//   GET /studio   → StudioData   orari, sale con lettini, tatuatori, prenotazioni e richieste
//   PUT /studio/hours, /studio/rooms…, /studio/beds…, /studio/artists…, /studio/bookings…   (da fare)
public static class StudioEndpoints
{
    // Forma esatta di `StudioData` nel frontend. Usiamo record dedicati invece delle entità per non
    // esporre i campi interni del database (Position, RoomId).
    public sealed record BedDto(string Id, string Name);
    public sealed record RoomDto(string Id, string Name, IReadOnlyList<BedDto> Beds);
    public sealed record ArtistDto(string Id, string Name, string Color);
    public sealed record StudioDataDto(
        StudioHours Hours,
        IReadOnlyList<RoomDto> Rooms,
        IReadOnlyList<ArtistDto> Artists,
        IReadOnlyList<Booking> Bookings,
        IReadOnlyList<CustomerRequest> Requests);

    public static IEndpointRouteBuilder MapStudioEndpoints(this IEndpointRouteBuilder app)
    {
        var studio = app.MapGroup("/studio").WithTags("Gestionale").RequireAuthorization();
        studio.MapGet("/", GetStudio);
        return app;
    }

    private static async Task<StudioDataDto> GetStudio(NasInkDbContext db, CancellationToken cancellationToken)
    {
        var settings = await db.StudioSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Lo studio non è ancora stato configurato.");

        var rooms = await db.Rooms.AsNoTracking()
            .OrderBy(room => room.Position)
            .Select(room => new RoomDto(room.Id, room.Name,
                room.Beds.OrderBy(bed => bed.Position).Select(bed => new BedDto(bed.Id, bed.Name)).ToList()))
            .ToListAsync(cancellationToken);
        var artists = await db.Artists.AsNoTracking()
            .OrderBy(artist => artist.Position)
            .Select(artist => new ArtistDto(artist.Id, artist.Name, artist.Color))
            .ToListAsync(cancellationToken);
        var bookings = await db.Bookings.AsNoTracking()
            .OrderBy(booking => booking.Date).ThenBy(booking => booking.Start)
            .ToListAsync(cancellationToken);
        // Le più vecchie prima, come nel mock dove le nuove richieste vengono aggiunte in fondo.
        var requests = await db.Requests.AsNoTracking()
            .OrderBy(request => request.CreatedAt)
            .ToListAsync(cancellationToken);

        return new StudioDataDto(settings.Hours, rooms, artists, bookings, requests);
    }
}

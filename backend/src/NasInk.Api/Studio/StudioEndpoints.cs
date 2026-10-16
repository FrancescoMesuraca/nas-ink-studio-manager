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
//   POST   /studio/bookings        { date, start, end, bedId, artistId } → Booking (201)
//   PUT    /studio/bookings/:id    Booking → Booking
//   DELETE /studio/bookings/:id    204
//          400 se lettino, tatuatore o orario non sono validi, 409 in caso di conflitto, 404 se non esiste
//   PUT /studio/hours, /studio/rooms…, /studio/beds…, /studio/artists…   (da fare, solo titolare)
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
        IReadOnlyList<CustomerRequest> Requests
    );

    /// <summary>Corpo di POST e PUT. Nel PUT il frontend manda anche l'id, ma vale quello nell'URL.</summary>
    public sealed record BookingInput(
        string? Date,
        string? Start,
        string? End,
        string? BedId,
        string? ArtistId
    );

    public static IEndpointRouteBuilder MapStudioEndpoints(this IEndpointRouteBuilder app)
    {
        var studio = app.MapGroup("/studio").WithTags("Gestionale").RequireAuthorization();
        studio.MapGet("/", GetStudio);
        studio.MapPost("/bookings", CreateBooking);
        studio.MapPut("/bookings/{id}", UpdateBooking);
        studio.MapDelete("/bookings/{id}", DeleteBooking);
        return app;
    }

    private static async Task<IResult> CreateBooking(
        BookingInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var booking = ToBooking(Guid.NewGuid().ToString(), input);
        await CheckBookingAsync(booking, db, cancellationToken);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created("/studio/bookings/" + booking.Id, booking);
    }

    private static async Task<Booking> UpdateBooking(
        string id,
        BookingInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var existing =
            await db.Bookings.FindAsync([id], cancellationToken) ?? throw BookingNotFound();
        var changed = ToBooking(id, input);
        await CheckBookingAsync(changed, db, cancellationToken);
        db.Entry(existing).CurrentValues.SetValues(changed);
        await db.SaveChangesAsync(cancellationToken);
        return existing;
    }

    private static async Task<IResult> DeleteBooking(
        string id,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var deleted = await db
            .Bookings.Where(booking => booking.Id == id)
            .ExecuteDeleteAsync(cancellationToken);
        if (deleted == 0)
            throw BookingNotFound();
        return Results.NoContent();
    }

    private static Booking ToBooking(string id, BookingInput input) =>
        new()
        {
            Id = id,
            Date = input.Date?.Trim() ?? "",
            Start = input.Start?.Trim() ?? "",
            End = input.End?.Trim() ?? "",
            BedId = input.BedId ?? "",
            ArtistId = input.ArtistId ?? "",
        };

    /// <summary>
    /// Stessi controlli e stesso ordine di `saveBooking` nel mock: lettino e tatuatore esistenti (400),
    /// orario valido e dentro gli orari dello studio (400), nessun conflitto con altre prenotazioni
    /// o con le consulenze del tatuatore (409).
    /// </summary>
    private static async Task CheckBookingAsync(
        Booking booking,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var bedExists = await db.Beds.AnyAsync(bed => bed.Id == booking.BedId, cancellationToken);
        var artistExists = await db.Artists.AnyAsync(
            artist => artist.Id == booking.ArtistId,
            cancellationToken
        );
        if (!bedExists || !artistExists)
            throw new ApiException(
                StatusCodes.Status400BadRequest,
                "Lettino o tatuatore non valido."
            );

        var hours = (await db.StudioSettings.AsNoTracking().SingleAsync(cancellationToken)).Hours;
        var rangeError = BookingRules.TimeRangeError(booking.ToSlot(), hours);
        if (rangeError is not null)
            throw new ApiException(StatusCodes.Status400BadRequest, rangeError);

        // Bastano le prenotazioni dello stesso giorno, tranne quella che stiamo modificando.
        var sameDay = await db
            .Bookings.AsNoTracking()
            .Where(other => other.Date == booking.Date && other.Id != booking.Id)
            .ToListAsync(cancellationToken);
        var conflict = BookingRules.BookingConflict(booking, sameDay);
        if (conflict is not null)
            throw new ApiException(StatusCodes.Status409Conflict, conflict);

        var consultations = await db
            .Requests.AsNoTracking()
            .Where(request =>
                request.ConsultationSlot != null
                && request.ConsultationSlot.ArtistId == booking.ArtistId
                && request.ConsultationSlot.Date == booking.Date
            )
            .Select(request => request.ConsultationSlot!)
            .ToListAsync(cancellationToken);
        if (
            consultations.Any(slot =>
                BookingRules.Overlaps(
                    booking.ToSlot(),
                    new TimeSlot(slot.Date, slot.Start, slot.End)
                )
            )
        )
            throw new ApiException(
                StatusCodes.Status409Conflict,
                "Il tatuatore ha una consulenza in questa fascia oraria."
            );
    }

    private static ApiException BookingNotFound() =>
        new(StatusCodes.Status404NotFound, "Prenotazione non trovata.");

    private static async Task<StudioDataDto> GetStudio(
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var settings =
            await db.StudioSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken)
            ?? throw new ApiException(
                StatusCodes.Status404NotFound,
                "Lo studio non è ancora stato configurato."
            );

        var rooms = await db
            .Rooms.AsNoTracking()
            .OrderBy(room => room.Position)
            .Select(room => new RoomDto(
                room.Id,
                room.Name,
                room.Beds.OrderBy(bed => bed.Position)
                    .Select(bed => new BedDto(bed.Id, bed.Name))
                    .ToList()
            ))
            .ToListAsync(cancellationToken);
        var artists = await db
            .Artists.AsNoTracking()
            .OrderBy(artist => artist.Position)
            .Select(artist => new ArtistDto(artist.Id, artist.Name, artist.Color))
            .ToListAsync(cancellationToken);
        var bookings = await db
            .Bookings.AsNoTracking()
            .OrderBy(booking => booking.Date)
            .ThenBy(booking => booking.Start)
            .ToListAsync(cancellationToken);
        // Le più vecchie prima, come nel mock dove le nuove richieste vengono aggiunte in fondo.
        var requests = await db
            .Requests.AsNoTracking()
            .OrderBy(request => request.CreatedAt)
            .ToListAsync(cancellationToken);

        return new StudioDataDto(settings.Hours, rooms, artists, bookings, requests);
    }
}

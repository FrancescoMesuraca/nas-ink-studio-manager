using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NasInk.Api.Data;
using NasInk.Api.Errors;
using NasInk.Api.OpenApi;
using NasInk.Domain.Studio;
using NasInk.Domain.Users;

namespace NasInk.Api.Studio;

// Configurazione dello studio (frontend/src/api/studio/studioApi.http.ts), solo titolare (403 altrimenti).
// Le modifiche rispondono 204 (201 con l'elemento creato): il frontend poi rilegge GET /studio.
//
//   PUT    /studio/hours                 { start, end }   400 se non validi, 409 se restano appuntamenti fuori orario
//   POST   /studio/rooms                 { name }
//   PATCH  /studio/rooms/:id             { name }
//   DELETE /studio/rooms/:id                              409 se ha lettini usati in prenotazioni
//   POST   /studio/rooms/:roomId/beds    { name }
//   PATCH  /studio/beds/:id              { name }
//   DELETE /studio/beds/:id                               409 se usato in prenotazioni
//   POST   /studio/artists               { name, color }
//   PUT    /studio/artists/:id           { name, color }
//   DELETE /studio/artists/:id                            409 se usato in prenotazioni, consulenze o da un account
//   Nomi obbligatori (massimo 120 caratteri), colori "#rrggbb"; 404 se l'elemento non esiste.
public static partial class StudioConfigEndpoints
{
    public sealed record HoursInput(string? Start, string? End);

    public sealed record NameInput(string? Name);

    public sealed record ArtistInput(string? Name, string? Color);

    private const int MaxNameLength = 120;

    public static IEndpointRouteBuilder MapStudioConfigEndpoints(this IEndpointRouteBuilder app)
    {
        var studio = app.MapGroup("/studio")
            .WithTags("Configurazione")
            .RequireAuthorization(Roles.Titolare);
        studio
            .MapPut("/hours", SetHours)
            .WithSummary("Orari dello studio")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesErrors(400, 409);
        studio
            .MapPost("/rooms", AddRoom)
            .WithSummary("Nuova sala")
            .Produces<StudioEndpoints.RoomDto>(StatusCodes.Status201Created)
            .ProducesErrors(400);
        studio
            .MapPatch("/rooms/{id}", RenameRoom)
            .WithSummary("Rinomina una sala")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesErrors(400, 404);
        studio
            .MapDelete("/rooms/{id}", RemoveRoom)
            .WithSummary("Elimina una sala con i suoi lettini")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesErrors(404, 409);
        studio
            .MapPost("/rooms/{roomId}/beds", AddBed)
            .WithSummary("Nuovo lettino in una sala")
            .Produces<StudioEndpoints.BedDto>(StatusCodes.Status201Created)
            .ProducesErrors(400, 404);
        studio
            .MapPatch("/beds/{id}", RenameBed)
            .WithSummary("Rinomina un lettino")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesErrors(400, 404);
        studio
            .MapDelete("/beds/{id}", RemoveBed)
            .WithSummary("Elimina un lettino")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesErrors(404, 409);
        studio
            .MapPost("/artists", AddArtist)
            .WithSummary("Nuovo tatuatore")
            .Produces<StudioEndpoints.ArtistDto>(StatusCodes.Status201Created)
            .ProducesErrors(400);
        studio
            .MapPut("/artists/{id}", UpdateArtist)
            .WithSummary("Modifica nome e colore di un tatuatore")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesErrors(400, 404);
        studio
            .MapDelete("/artists/{id}", RemoveArtist)
            .WithSummary("Elimina un tatuatore")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesErrors(404, 409);
        return app;
    }

    // --- Orari ---

    private static async Task<IResult> SetHours(
        HoursInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var hours = new StudioHours(input.Start?.Trim() ?? "", input.End?.Trim() ?? "");
        if (!IsTime(hours.Start) || !IsTime(hours.End))
            throw new ApiException(StatusCodes.Status400BadRequest, "Orari non validi.");
        if (string.CompareOrdinal(hours.End, hours.Start) <= 0)
            throw new ApiException(
                StatusCodes.Status400BadRequest,
                "La chiusura deve essere successiva all’apertura."
            );

        // Come nel mock: prenotazioni e consulenze già fissate devono restare dentro i nuovi orari.
        var bookings = await db
            .Bookings.AsNoTracking()
            .Select(booking => new TimeSlot(booking.Date, booking.Start, booking.End))
            .ToListAsync(cancellationToken);
        var consultations = await db
            .Requests.AsNoTracking()
            .Where(request => request.ConsultationSlot != null)
            .Select(request => new TimeSlot(
                request.ConsultationSlot!.Date,
                request.ConsultationSlot.Start,
                request.ConsultationSlot.End
            ))
            .ToListAsync(cancellationToken);
        if (
            bookings
                .Concat(consultations)
                .Any(slot => BookingRules.TimeRangeError(slot, hours) is not null)
        )
            throw new ApiException(
                StatusCodes.Status409Conflict,
                "Alcuni appuntamenti esistenti sono fuori dai nuovi orari dello studio."
            );

        var settings = await db.StudioSettings.SingleAsync(cancellationToken);
        settings.Hours = hours;
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    // --- Sale e lettini ---

    private static async Task<IResult> AddRoom(
        NameInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var room = new Room
        {
            Id = Guid.NewGuid().ToString(),
            Name = ValidName(input.Name),
            // In fondo all'elenco, come nel mock.
            Position =
                (await db.Rooms.MaxAsync(r => (int?)r.Position, cancellationToken) ?? -1) + 1,
        };
        db.Rooms.Add(room);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created(
            "/studio/rooms/" + room.Id,
            new StudioEndpoints.RoomDto(room.Id, room.Name, [])
        );
    }

    private static async Task<IResult> RenameRoom(
        string id,
        NameInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var name = ValidName(input.Name);
        var room = await db.Rooms.FindAsync([id], cancellationToken) ?? throw RoomNotFound();
        room.Name = name;
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> RemoveRoom(
        string id,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var room = await db.Rooms.FindAsync([id], cancellationToken) ?? throw RoomNotFound();
        var bedIds = db.Beds.Where(bed => bed.RoomId == id).Select(bed => bed.Id);
        if (
            await db.Bookings.AnyAsync(booking => bedIds.Contains(booking.BedId), cancellationToken)
        )
            throw new ApiException(
                StatusCodes.Status409Conflict,
                "Non puoi eliminare una stanza con lettini usati nelle prenotazioni."
            );
        // I lettini si eliminano con la sala (cascade nel database).
        db.Rooms.Remove(room);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> AddBed(
        string roomId,
        NameInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var name = ValidName(input.Name);
        if (!await db.Rooms.AnyAsync(room => room.Id == roomId, cancellationToken))
            throw RoomNotFound();
        var bed = new Bed
        {
            Id = Guid.NewGuid().ToString(),
            Name = name,
            RoomId = roomId,
            Position =
                (
                    await db
                        .Beds.Where(b => b.RoomId == roomId)
                        .MaxAsync(b => (int?)b.Position, cancellationToken)
                    ?? -1
                ) + 1,
        };
        db.Beds.Add(bed);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created(
            "/studio/beds/" + bed.Id,
            new StudioEndpoints.BedDto(bed.Id, bed.Name)
        );
    }

    private static async Task<IResult> RenameBed(
        string id,
        NameInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var name = ValidName(input.Name);
        var bed = await db.Beds.FindAsync([id], cancellationToken) ?? throw BedNotFound();
        bed.Name = name;
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> RemoveBed(
        string id,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var bed = await db.Beds.FindAsync([id], cancellationToken) ?? throw BedNotFound();
        if (await db.Bookings.AnyAsync(booking => booking.BedId == id, cancellationToken))
            throw new ApiException(
                StatusCodes.Status409Conflict,
                "Non puoi eliminare un lettino usato nelle prenotazioni."
            );
        db.Beds.Remove(bed);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    // --- Tatuatori ---

    private static async Task<IResult> AddArtist(
        ArtistInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var artist = new Artist
        {
            Id = Guid.NewGuid().ToString(),
            Name = ValidName(input.Name),
            Color = ValidColor(input.Color),
            Position =
                (await db.Artists.MaxAsync(a => (int?)a.Position, cancellationToken) ?? -1) + 1,
        };
        db.Artists.Add(artist);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created(
            "/studio/artists/" + artist.Id,
            new StudioEndpoints.ArtistDto(artist.Id, artist.Name, artist.Color)
        );
    }

    private static async Task<IResult> UpdateArtist(
        string id,
        ArtistInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var name = ValidName(input.Name);
        var color = ValidColor(input.Color);
        var artist = await db.Artists.FindAsync([id], cancellationToken) ?? throw ArtistNotFound();
        artist.Name = name;
        artist.Color = color;
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> RemoveArtist(
        string id,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var artist = await db.Artists.FindAsync([id], cancellationToken) ?? throw ArtistNotFound();
        var used =
            await db.Bookings.AnyAsync(booking => booking.ArtistId == id, cancellationToken)
            || await db.Requests.AnyAsync(
                request =>
                    request.ConsultationSlot != null && request.ConsultationSlot.ArtistId == id,
                cancellationToken
            );
        if (used)
            throw new ApiException(
                StatusCodes.Status409Conflict,
                "Non puoi eliminare un tatuatore usato in prenotazioni o consulenze."
            );
        // Nel mock non c'è, ma qui gli account sono veri: un tatuatore che accede al gestionale
        // resterebbe collegato a un profilo che non esiste più.
        if (await db.Users.AnyAsync(user => user.ArtistId == id, cancellationToken))
            throw new ApiException(
                StatusCodes.Status409Conflict,
                "Non puoi eliminare un tatuatore collegato a un account del gestionale."
            );
        db.Artists.Remove(artist);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    // --- Validazione ---

    private static string ValidName(string? name)
    {
        var trimmed = name?.Trim() ?? "";
        if (trimmed.Length == 0)
            throw new ApiException(StatusCodes.Status400BadRequest, "Inserisci un nome.");
        if (trimmed.Length > MaxNameLength)
            throw new ApiException(
                StatusCodes.Status400BadRequest,
                $"Il nome può avere al massimo {MaxNameLength} caratteri."
            );
        return trimmed;
    }

    private static string ValidColor(string? color)
    {
        var trimmed = color?.Trim() ?? "";
        if (!HexColor().IsMatch(trimmed))
            throw new ApiException(StatusCodes.Status400BadRequest, "Colore non valido.");
        return trimmed.ToLowerInvariant();
    }

    private static bool IsTime(string value) => TimeOfDay().IsMatch(value);

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex HexColor();

    [GeneratedRegex("^([01][0-9]|2[0-3]):[0-5][0-9]$")]
    private static partial Regex TimeOfDay();

    private static ApiException RoomNotFound() =>
        new(StatusCodes.Status404NotFound, "Stanza non trovata.");

    private static ApiException BedNotFound() =>
        new(StatusCodes.Status404NotFound, "Lettino non trovato.");

    private static ApiException ArtistNotFound() =>
        new(StatusCodes.Status404NotFound, "Tatuatore non trovato.");
}

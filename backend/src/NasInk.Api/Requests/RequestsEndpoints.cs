using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using NasInk.Api.Data;
using NasInk.Api.Errors;
using NasInk.Api.OpenApi;
using NasInk.Domain.Requests;
using NasInk.Domain.Studio;

namespace NasInk.Api.Requests;

// Endpoint delle richieste dei clienti (frontend/src/api/requests/requestsApi.http.ts).
//
//   POST /requests   NewRequestInput → CustomerRequest
//        pubblico per le richieste dal sito (source "sito"), con limite di invii per indirizzo IP.
//        Le richieste dal gestionale (source "gestionale") richiedono il login (401 senza token).
//
// Le altre operazioni sono del gestionale (autenticati, qualunque ruolo) e rispondono con la
// richiesta aggiornata; il frontend poi rilegge GET /studio. 404 se la richiesta non esiste.
//   PATCH  /requests/:id                { status }                 400 se lo stato non è valido
//   PUT    /requests/:id/consultation   Consultation               scheda di consulenza
//   PUT    /requests/:id/slot           { artistId, date, start, end }   propone una fascia ("proposta");
//          400 se tatuatore o orario non sono validi, 409 se il tatuatore è occupato
//   POST   /requests/:id/slot/confirm   il cliente conferma: fascia "confermata", stato "consulenza";
//          409 se non c'è una proposta o se nel frattempo il tatuatore si è occupato
//   DELETE /requests/:id/slot           annulla la fascia (anche se non c'era)
public static class RequestsEndpoints
{
    private const string PublicFormPolicy = "public-form";

    /// <summary>
    /// Anti-spam del modulo pubblico: al massimo PermitLimit invii ogni WindowMinutes minuti per
    /// indirizzo IP (configurabile in RateLimiting:PublicForm). Oltre il limite: 429.
    /// </summary>
    public static IServiceCollection AddRequestsRateLimit(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var permitLimit = configuration.GetValue("RateLimiting:PublicForm:PermitLimit", 5);
        var window = TimeSpan.FromMinutes(
            configuration.GetValue("RateLimiting:PublicForm:WindowMinutes", 10)
        );

        return services.AddRateLimiter(options =>
        {
            options.AddPolicy(
                PublicFormPolicy,
                context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        context.Connection.RemoteIpAddress?.ToString() ?? "sconosciuto",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = permitLimit,
                            Window = window,
                        }
                    )
            );

            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await context.HttpContext.Response.WriteAsJsonAsync(
                    new ApiErrorBody("Hai inviato troppe richieste. Riprova tra qualche minuto."),
                    cancellationToken
                );
            };
        });
    }

    public sealed record StatusInput(string? Status);

    /// <summary>Come `Consultation`, ma i campi mancanti diventano stringhe vuote.</summary>
    public sealed record ConsultationInput(
        string? Notes,
        string? Subject,
        string? Composition,
        string? Style,
        string? Position,
        string? Size,
        string? Colors,
        string? ImageUrl
    );

    /// <summary>Fascia proposta: lo stato lo decide il server.</summary>
    public sealed record SlotInput(string? ArtistId, string? Date, string? Start, string? End);

    private static readonly string[] Statuses =
    [
        RequestStatus.Nuova,
        RequestStatus.Consulenza,
        RequestStatus.Approvata,
        RequestStatus.Chiusa,
    ];

    public static IEndpointRouteBuilder MapRequestsEndpoints(this IEndpointRouteBuilder app)
    {
        var requests = app.MapGroup("/requests").WithTags("Richieste");
        requests
            .MapPost("/", CreateRequest)
            .RequireRateLimiting(PublicFormPolicy)
            .WithSummary("Nuova richiesta di tatuaggio")
            .WithDescription(
                "Pubblica per `source: \"sito\"` (serve il consenso privacy, massimo 5 invii ogni 10 minuti per IP); per `\"gestionale\"` serve il login."
            )
            .Produces<CustomerRequest>(StatusCodes.Status201Created)
            .ProducesErrors(400, 401, 429);
        requests
            .MapPatch("/{id}", SetStatus)
            .RequireAuthorization()
            .WithSummary("Cambia lo stato di una richiesta")
            .ProducesErrors(400, 404);
        requests
            .MapPut("/{id}/consultation", SaveConsultation)
            .RequireAuthorization()
            .WithSummary("Salva la scheda di consulenza")
            .ProducesErrors(404);
        requests
            .MapPut("/{id}/slot", ProposeSlot)
            .RequireAuthorization()
            .WithSummary("Propone una fascia di consulenza")
            .ProducesErrors(400, 404, 409);
        requests
            .MapPost("/{id}/slot/confirm", ConfirmSlot)
            .RequireAuthorization()
            .WithSummary("Conferma la fascia proposta (il cliente ha accettato)")
            .ProducesErrors(404, 409);
        requests
            .MapDelete("/{id}/slot", CancelSlot)
            .RequireAuthorization()
            .WithSummary("Annulla la fascia di consulenza")
            .ProducesErrors(404);
        return app;
    }

    private static async Task<IResult> CreateRequest(
        NewRequestInput input,
        HttpContext context,
        NasInkDbContext db,
        TimeProvider clock,
        CancellationToken cancellationToken
    )
    {
        if (input.Source is not (RequestSource.Sito or RequestSource.Gestionale))
            throw new ApiException(
                StatusCodes.Status400BadRequest,
                "Origine della richiesta non valida."
            );
        // L'endpoint è pubblico, ma le richieste "gestionale" le può inserire solo chi ha fatto il login.
        if (
            input.Source == RequestSource.Gestionale
            && context.User.Identity?.IsAuthenticated != true
        )
            throw new ApiException(
                StatusCodes.Status401Unauthorized,
                "Accedi al gestionale per inserire una richiesta."
            );

        // Come nel mock: il primo messaggio diventa `message`, tutti finiscono in `fields`.
        var errors = input.Validate();
        if (errors.Count > 0)
            throw new ApiException(StatusCodes.Status400BadRequest, errors.Values.First(), errors);

        if (
            !string.IsNullOrWhiteSpace(input.PreferredArtistId)
            && !await db.Artists.AnyAsync(
                artist => artist.Id == input.PreferredArtistId.Trim(),
                cancellationToken
            )
        )
            throw new ApiException(StatusCodes.Status400BadRequest, "Tatuatore non valido.");

        var request = input.ToNewRequest(Guid.NewGuid().ToString(), clock.GetUtcNow());
        db.Requests.Add(request);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created("/requests/" + request.Id, request);
    }

    private static async Task<CustomerRequest> SetStatus(
        string id,
        StatusInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        if (input.Status is null || !Statuses.Contains(input.Status))
            throw new ApiException(StatusCodes.Status400BadRequest, "Stato non valido.");
        var request = await FindAsync(id, db, cancellationToken);
        request.Status = input.Status;
        await db.SaveChangesAsync(cancellationToken);
        return request;
    }

    private static async Task<CustomerRequest> SaveConsultation(
        string id,
        ConsultationInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var request = await FindAsync(id, db, cancellationToken);
        request.Consultation = new Consultation(
            input.Notes ?? "",
            input.Subject ?? "",
            input.Composition ?? "",
            input.Style ?? "",
            input.Position ?? "",
            input.Size ?? "",
            input.Colors ?? "",
            input.ImageUrl ?? ""
        );
        await db.SaveChangesAsync(cancellationToken);
        return request;
    }

    /// <summary>Stessi controlli e stesso ordine di `proposeConsultation` nel mock.</summary>
    private static async Task<CustomerRequest> ProposeSlot(
        string id,
        SlotInput input,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var request = await FindAsync(id, db, cancellationToken);
        var slot = new ConsultationSlot(
            input.ArtistId ?? "",
            input.Date?.Trim() ?? "",
            input.Start?.Trim() ?? "",
            input.End?.Trim() ?? "",
            "proposta"
        );
        if (!await db.Artists.AnyAsync(artist => artist.Id == slot.ArtistId, cancellationToken))
            throw new ApiException(StatusCodes.Status400BadRequest, "Tatuatore non valido.");

        var hours = (await db.StudioSettings.AsNoTracking().SingleAsync(cancellationToken)).Hours;
        var rangeError = BookingRules.TimeRangeError(ToTimeSlot(slot), hours);
        if (rangeError is not null)
            throw new ApiException(StatusCodes.Status400BadRequest, rangeError);

        await CheckArtistFreeAsync(slot, id, db, cancellationToken);
        request.ConsultationSlot = slot;
        await db.SaveChangesAsync(cancellationToken);
        return request;
    }

    private static async Task<CustomerRequest> ConfirmSlot(
        string id,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var request = await FindAsync(id, db, cancellationToken);
        if (request.ConsultationSlot is not { Status: "proposta" } slot)
            throw new ApiException(
                StatusCodes.Status409Conflict,
                "Non c’è una proposta da confermare."
            );
        // Tra proposta e conferma l'agenda può essere cambiata.
        await CheckArtistFreeAsync(slot, id, db, cancellationToken);
        request.ConsultationSlot = slot with { Status = "confermata" };
        request.Status = RequestStatus.Consulenza;
        await db.SaveChangesAsync(cancellationToken);
        return request;
    }

    private static async Task<CustomerRequest> CancelSlot(
        string id,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var request = await FindAsync(id, db, cancellationToken);
        request.ConsultationSlot = null;
        await db.SaveChangesAsync(cancellationToken);
        return request;
    }

    private static async Task<CustomerRequest> FindAsync(
        string id,
        NasInkDbContext db,
        CancellationToken cancellationToken
    ) =>
        await db.Requests.FindAsync([id], cancellationToken)
        ?? throw new ApiException(StatusCodes.Status404NotFound, "Scheda cliente non trovata.");

    /// <summary>
    /// Come `artistBusy` nel mock: 409 se il tatuatore ha, nella stessa fascia, una prenotazione o
    /// la consulenza di un'altra richiesta (proposta o confermata).
    /// </summary>
    private static async Task CheckArtistFreeAsync(
        ConsultationSlot slot,
        string requestId,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var candidate = ToTimeSlot(slot);
        var bookings = await db
            .Bookings.AsNoTracking()
            .Where(booking => booking.ArtistId == slot.ArtistId && booking.Date == slot.Date)
            .ToListAsync(cancellationToken);
        var consultations = await db
            .Requests.AsNoTracking()
            .Where(request =>
                request.Id != requestId
                && request.ConsultationSlot != null
                && request.ConsultationSlot.ArtistId == slot.ArtistId
                && request.ConsultationSlot.Date == slot.Date
            )
            .Select(request => request.ConsultationSlot!)
            .ToListAsync(cancellationToken);

        if (
            bookings.Any(booking => BookingRules.Overlaps(candidate, booking.ToSlot()))
            || consultations.Any(other => BookingRules.Overlaps(candidate, ToTimeSlot(other)))
        )
            throw new ApiException(
                StatusCodes.Status409Conflict,
                "Il tatuatore è occupato in questa fascia oraria."
            );
    }

    private static TimeSlot ToTimeSlot(ConsultationSlot slot) =>
        new(slot.Date, slot.Start, slot.End);
}

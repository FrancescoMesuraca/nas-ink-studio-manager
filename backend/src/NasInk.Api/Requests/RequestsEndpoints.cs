using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using NasInk.Api.Data;
using NasInk.Api.Errors;
using NasInk.Domain.Requests;

namespace NasInk.Api.Requests;

// Endpoint delle richieste dei clienti (frontend/src/api/requests/requestsApi.http.ts).
//
//   POST /requests   NewRequestInput → CustomerRequest
//        pubblico per le richieste dal sito (source "sito"), con limite di invii per indirizzo IP.
//        Le richieste dal gestionale (source "gestionale") richiedono il login: finché
//        l'autenticazione non esiste rispondono 401.
//   PATCH /requests/:id, PUT /requests/:id/consultation, …   (da fare, autenticati)
public static class RequestsEndpoints
{
    private const string PublicFormPolicy = "public-form";

    /// <summary>
    /// Anti-spam del modulo pubblico: al massimo PermitLimit invii ogni WindowMinutes minuti per
    /// indirizzo IP (configurabile in RateLimiting:PublicForm). Oltre il limite: 429.
    /// </summary>
    public static IServiceCollection AddRequestsRateLimit(this IServiceCollection services, IConfiguration configuration)
    {
        var permitLimit = configuration.GetValue("RateLimiting:PublicForm:PermitLimit", 5);
        var window = TimeSpan.FromMinutes(configuration.GetValue("RateLimiting:PublicForm:WindowMinutes", 10));

        return services.AddRateLimiter(options =>
        {
            options.AddPolicy(PublicFormPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "sconosciuto",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = permitLimit, Window = window }));

            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await context.HttpContext.Response.WriteAsJsonAsync(
                    new ApiErrorBody("Hai inviato troppe richieste. Riprova tra qualche minuto."), cancellationToken);
            };
        });
    }

    public static IEndpointRouteBuilder MapRequestsEndpoints(this IEndpointRouteBuilder app)
    {
        var requests = app.MapGroup("/requests").WithTags("Richieste");
        requests.MapPost("/", CreateRequest).RequireRateLimiting(PublicFormPolicy);
        return app;
    }

    private static async Task<IResult> CreateRequest(NewRequestInput input, NasInkDbContext db, TimeProvider clock, CancellationToken cancellationToken)
    {
        if (input.Source is not (RequestSource.Sito or RequestSource.Gestionale))
            throw new ApiException(StatusCodes.Status400BadRequest, "Origine della richiesta non valida.");
        if (input.Source == RequestSource.Gestionale)
            throw new ApiException(StatusCodes.Status401Unauthorized, "Accedi al gestionale per inserire una richiesta.");

        // Come nel mock: il primo messaggio diventa `message`, tutti finiscono in `fields`.
        var errors = input.Validate();
        if (errors.Count > 0)
            throw new ApiException(StatusCodes.Status400BadRequest, errors.Values.First(), errors);

        if (!string.IsNullOrWhiteSpace(input.PreferredArtistId)
            && !await db.Artists.AnyAsync(artist => artist.Id == input.PreferredArtistId.Trim(), cancellationToken))
            throw new ApiException(StatusCodes.Status400BadRequest, "Tatuatore non valido.");

        var request = input.ToNewRequest(Guid.NewGuid().ToString(), clock.GetUtcNow());
        db.Requests.Add(request);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created("/requests/" + request.Id, request);
    }
}

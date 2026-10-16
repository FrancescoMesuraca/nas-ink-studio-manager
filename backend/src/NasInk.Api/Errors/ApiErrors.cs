using Microsoft.AspNetCore.Diagnostics;

namespace NasInk.Api.Errors;

/// <summary>
/// Corpo di ogni risposta di errore, come lo legge frontend/src/api/client.ts:
/// `{ "message": "...", "fields": { "campo": "..." } }`. I messaggi sono mostrati così come sono,
/// quindi vanno scritti in italiano.
/// </summary>
public sealed record ApiErrorBody(
    string Message,
    IReadOnlyDictionary<string, string>? Fields = null
);

/// <summary>
/// Da lanciare negli endpoint per rispondere con un errore "previsto"
/// (400 validazione, 403 ruolo insufficiente, 404, 409 conflitto…).
/// </summary>
public sealed class ApiException(
    int statusCode,
    string message,
    IReadOnlyDictionary<string, string>? fields = null
) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public IReadOnlyDictionary<string, string>? Fields { get; } = fields;
}

public static class ApiErrorsExtensions
{
    /// <summary>Trasforma eccezioni e risposte di errore vuote nel formato `{ message, fields }`.</summary>
    public static WebApplication UseApiErrors(this WebApplication app)
    {
        // 1. Eccezioni: ApiException diventa il suo status; tutto il resto è un 500 generico
        //    (il dettaglio finisce nei log, non al client).
        app.UseExceptionHandler(errorApp =>
            errorApp.Run(async context =>
            {
                var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
                var (status, body) = exception switch
                {
                    ApiException api => (api.StatusCode, new ApiErrorBody(api.Message, api.Fields)),
                    BadHttpRequestException bad => (
                        bad.StatusCode,
                        new ApiErrorBody("Richiesta non valida.")
                    ),
                    _ => (
                        StatusCodes.Status500InternalServerError,
                        new ApiErrorBody("Errore interno del server.")
                    ),
                };
                context.Response.StatusCode = status;
                await context.Response.WriteAsJsonAsync(body);
            })
        );

        // 2. Risposte di errore senza corpo (es. 404 per una rotta inesistente, 405).
        app.UseStatusCodePages(async statusContext =>
        {
            var response = statusContext.HttpContext.Response;
            var message = response.StatusCode switch
            {
                StatusCodes.Status400BadRequest => "Richiesta non valida.",
                StatusCodes.Status401Unauthorized => "Sessione assente o scaduta. Accedi di nuovo.",
                StatusCodes.Status403Forbidden => "Non hai i permessi per questa operazione.",
                StatusCodes.Status404NotFound => "Risorsa non trovata.",
                StatusCodes.Status405MethodNotAllowed => "Metodo non consentito.",
                _ => "Errore del server (" + response.StatusCode + ").",
            };
            await response.WriteAsJsonAsync(new ApiErrorBody(message));
        });

        return app;
    }
}

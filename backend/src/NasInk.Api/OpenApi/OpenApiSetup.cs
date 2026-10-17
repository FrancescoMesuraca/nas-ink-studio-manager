using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;
using NasInk.Api.Errors;

namespace NasInk.Api.OpenApi;

/// <summary>
/// Documentazione delle API: il documento OpenAPI lo genera ASP.NET Core (Microsoft.AspNetCore.OpenApi)
/// dagli endpoint, Swagger UI lo mostra. Solo in sviluppo:
///   GET /openapi/v1.json   documento OpenAPI
///   GET /swagger           Swagger UI ("Authorize" accetta il token di POST /auth/login)
/// </summary>
public static class OpenApiSetup
{
    private const string BearerScheme = "Bearer";

    public static IServiceCollection AddNasInkOpenApi(this IServiceCollection services) =>
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer(
                (document, _, _) =>
                {
                    document.Info = new OpenApiInfo
                    {
                        Title = "NAS INK API",
                        Version = "v1",
                        Description = """
                            API del sito vetrina e del gestionale. Il contratto è quello di
                            `frontend/src/api/*/*.http.ts`.

                            - **Autenticazione**: `POST /auth/login` restituisce un token; premi
                              *Authorize* e incollalo (senza "Bearer"). Utenti demo con password
                              `demo1234`: `titolare@nasink.demo`, `maya@nasink.demo`.
                            - **Errori**: sempre `{ "message": "...", "fields": { ... } }`, con
                              400 validazione, 401 non autenticato, 403 ruolo insufficiente,
                              404 non trovato, 409 conflitto, 413 file troppo grande, 429 troppe richieste.
                            """,
                    };
                    document.Components ??= new OpenApiComponents();
                    document.Components.SecuritySchemes ??=
                        new Dictionary<string, IOpenApiSecurityScheme>();
                    document.Components.SecuritySchemes[BearerScheme] = new OpenApiSecurityScheme
                    {
                        Type = SecuritySchemeType.Http,
                        Scheme = "bearer",
                        BearerFormat = "JWT",
                        Description = "Token restituito da POST /auth/login.",
                    };
                    return Task.CompletedTask;
                }
            );

            // Lucchetto e risposte 401/403 sugli endpoint che richiedono il login.
            options.AddOperationTransformer(
                (operation, context, _) =>
                {
                    var authorize = context
                        .Description.ActionDescriptor.EndpointMetadata.OfType<IAuthorizeData>()
                        .ToList();
                    if (authorize.Count == 0)
                        return Task.CompletedTask;

                    operation.Security ??= [];
                    operation.Security.Add(
                        new OpenApiSecurityRequirement
                        {
                            [new OpenApiSecuritySchemeReference(BearerScheme, context.Document)] =
                            [],
                        }
                    );
                    operation.Responses ??= new OpenApiResponses();
                    operation.Responses.TryAdd(
                        "401",
                        new OpenApiResponse { Description = "Login mancante o scaduto." }
                    );
                    if (authorize.Any(data => data.Policy is not null))
                        operation.Responses.TryAdd(
                            "403",
                            new OpenApiResponse { Description = "Riservato al titolare." }
                        );
                    return Task.CompletedTask;
                }
            );
        });

    public static WebApplication UseNasInkSwagger(this WebApplication app)
    {
        app.MapOpenApi();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/openapi/v1.json", "NAS INK API v1");
            options.DocumentTitle = "NAS INK API";
            // Il token resta dopo un ricaricamento della pagina.
            options.EnablePersistAuthorization();
        });
        return app;
    }

    /// <summary>Documenta le risposte di errore previste di un endpoint, tutte nel formato <see cref="ApiErrorBody"/>.</summary>
    public static RouteHandlerBuilder ProducesErrors(
        this RouteHandlerBuilder builder,
        params int[] statusCodes
    )
    {
        foreach (var statusCode in statusCodes)
            builder.Produces<ApiErrorBody>(statusCode);
        return builder;
    }
}

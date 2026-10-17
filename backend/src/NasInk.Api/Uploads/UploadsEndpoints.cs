using System.Threading.RateLimiting;
using Microsoft.Extensions.FileProviders;
using NasInk.Api.Errors;
using NasInk.Api.OpenApi;

namespace NasInk.Api.Uploads;

// Caricamento immagini (frontend/src/api/uploads/uploadsApi.http.ts).
//
//   POST /uploads   multipart/form-data, campo `file` → { url } (201)
//        pubblico, perché lo usa anche il modulo "Richiedi un tatuaggio"; senza login al massimo
//        PermitLimit caricamenti ogni WindowMinutes minuti per IP (Uploads:RateLimit), poi 429.
//        400 se il file manca o non è un'immagine JPG, PNG, WebP o GIF; 413 se supera Uploads:MaxBytes.
//
// I file finiscono nella cartella Uploads:Path (predefinita "App_Data/uploads", accanto all'API) con un
// nome casuale e sono serviti da GET /uploads/<nome>. L'URL restituito è assoluto, perché il
// frontend lo usa così com'è in <img src>: la base è Uploads:PublicBaseUrl, oppure l'indirizzo
// con cui è arrivata la richiesta.
public static class UploadsEndpoints
{
    private const string AnonymousPolicy = "uploads-anonymous";
    private const string RequestPath = "/uploads";

    public sealed record UploadResult(string Url);

    /// <summary>Formati ammessi, riconosciuti dai primi byte del file e non dal nome o dal Content-Type.</summary>
    private static readonly (string Extension, Func<byte[], bool> Matches)[] Formats =
    [
        (".jpg", h => h is [0xFF, 0xD8, 0xFF, ..]),
        (".png", h => h is [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ..]),
        (".gif", h => h is [0x47, 0x49, 0x46, 0x38, 0x37 or 0x39, 0x61, ..]),
        (".webp", h => h is [0x52, 0x49, 0x46, 0x46, _, _, _, _, 0x57, 0x45, 0x42, 0x50, ..]),
    ];

    public static IServiceCollection AddUploads(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var permitLimit = configuration.GetValue("Uploads:RateLimit:PermitLimit", 20);
        var window = TimeSpan.FromMinutes(
            configuration.GetValue("Uploads:RateLimit:WindowMinutes", 10)
        );

        // Si aggiunge alle altre policy (il rate limiter è già registrato da AddRequestsRateLimit).
        services.Configure<Microsoft.AspNetCore.RateLimiting.RateLimiterOptions>(options =>
            options.AddPolicy(
                AnonymousPolicy,
                context =>
                    context.User.Identity?.IsAuthenticated == true
                        ? RateLimitPartition.GetNoLimiter("gestionale")
                        : RateLimitPartition.GetFixedWindowLimiter(
                            context.Connection.RemoteIpAddress?.ToString() ?? "sconosciuto",
                            _ => new FixedWindowRateLimiterOptions
                            {
                                PermitLimit = permitLimit,
                                Window = window,
                            }
                        )
            )
        );
        return services;
    }

    /// <summary>Cartella dei file caricati, creata se manca.</summary>
    private static string UploadsFolder(IConfiguration configuration, IWebHostEnvironment env)
    {
        var folder = Path.GetFullPath(
            Path.Combine(
                env.ContentRootPath,
                configuration["Uploads:Path"] ?? Path.Combine("App_Data", "uploads")
            )
        );
        Directory.CreateDirectory(folder);
        return folder;
    }

    /// <summary>Serve i file caricati su GET /uploads/&lt;nome&gt;.</summary>
    public static WebApplication UseUploadedFiles(this WebApplication app)
    {
        app.UseStaticFiles(
            new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(
                    UploadsFolder(app.Configuration, app.Environment)
                ),
                RequestPath = RequestPath,
                OnPrepareResponse = context =>
                {
                    var headers = context.Context.Response.Headers;
                    // Il nome è casuale e il file non cambia mai: il browser può tenerlo in cache a lungo.
                    headers.CacheControl = "public, max-age=31536000, immutable";
                    headers.XContentTypeOptions = "nosniff";
                },
            }
        );
        return app;
    }

    public static IEndpointRouteBuilder MapUploadsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost(RequestPath, Upload)
            .WithTags("Upload")
            .WithSummary("Carica un'immagine")
            .WithDescription(
                "Campo `file`: JPG, PNG, WebP o GIF, al massimo 5 MB. Pubblico; senza login al massimo 20 caricamenti ogni 10 minuti per IP."
            )
            .Produces<UploadResult>(StatusCodes.Status201Created)
            .ProducesErrors(400, 413, 429)
            .RequireRateLimiting(AnonymousPolicy)
            // Niente token antiforgery: l'API usa il Bearer token, non i cookie.
            .DisableAntiforgery();
        return app;
    }

    private static async Task<IResult> Upload(
        IFormFile? file,
        HttpRequest request,
        IConfiguration configuration,
        IWebHostEnvironment env,
        CancellationToken cancellationToken
    )
    {
        if (file is null)
            throw new ApiException(StatusCodes.Status400BadRequest, "Nessun file ricevuto.");

        var maxBytes = configuration.GetValue("Uploads:MaxBytes", 5 * 1024 * 1024);
        if (file.Length > maxBytes)
            throw new ApiException(
                StatusCodes.Status413PayloadTooLarge,
                $"“{file.FileName}” è troppo grande (massimo {maxBytes / (1024 * 1024)} MB)."
            );

        await using var source = file.OpenReadStream();
        var header = new byte[12];
        var read = await source.ReadAtLeastAsync(header, header.Length, false, cancellationToken);
        var extension = Formats.FirstOrDefault(format => format.Matches(header[..read])).Extension;
        if (extension is null)
            throw new ApiException(
                StatusCodes.Status400BadRequest,
                $"“{file.FileName}” non è un formato supportato: usa JPG, PNG o WebP."
            );

        var name = Guid.NewGuid().ToString("N") + extension;
        var path = Path.Combine(UploadsFolder(configuration, env), name);
        source.Position = 0;
        await using (var target = File.Create(path))
            await source.CopyToAsync(target, cancellationToken);

        var baseUrl =
            configuration["Uploads:PublicBaseUrl"]?.TrimEnd('/')
            ?? $"{request.Scheme}://{request.Host}";
        var url = $"{baseUrl}{RequestPath}/{name}";
        return Results.Created(url, new UploadResult(url));
    }
}

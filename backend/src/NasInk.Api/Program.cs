using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NasInk.Api.Auth;
using NasInk.Api.Data;
using NasInk.Api.Errors;
using NasInk.Api.OpenApi;
using NasInk.Api.Requests;
using NasInk.Api.Site;
using NasInk.Api.Studio;
using NasInk.Api.Uploads;
using NasInk.Domain.Users;

var builder = WebApplication.CreateBuilder(args);

// --- Servizi ---

builder.Services.AddDbContext<NasInkDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
);

// JSON: camelCase (predefinito) e campi null omessi, così i campi facoltativi del contratto
// TypeScript (es. `bio?: string`) arrivano al frontend come assenti, non come null.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
);

// CORS: il frontend gira su un'altra origine. In produzione sono ammesse solo quelle in Cors:Origins;
// in sviluppo qualunque indirizzo locale, perché Vite passa a 5174, 5175… se la porta 5173 è occupata.
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
var allowAnyLocalOrigin = builder.Environment.IsDevelopment();
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy
            .SetIsOriginAllowed(origin =>
                corsOrigins.Contains(origin)
                || (
                    allowAnyLocalOrigin
                    && Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                    && uri.IsLoopback
                )
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
    )
);

builder.Services.AddNasInkAuth(builder.Configuration);
builder.Services.AddRequestsRateLimit(builder.Configuration);
builder.Services.AddUploads(builder.Configuration);
builder.Services.AddNasInkOpenApi();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<StudioClock>();

var app = builder.Build();

// --- Database ---

// In sviluppo applichiamo le migrazioni e carichiamo i dati demo all'avvio.
// In produzione le migrazioni si lanciano a parte (vedi README).
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<NasInkDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(
        db,
        scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>(),
        scope.ServiceProvider.GetRequiredService<StudioClock>().Today()
    );
}

// --- Pipeline HTTP ---

app.UseApiErrors();

// Documentazione: /swagger e /openapi/v1.json, solo in sviluppo.
if (app.Environment.IsDevelopment())
    app.UseNasInkSwagger();

// Immagini caricate, su GET /uploads/<nome>: file pubblici, prima di autenticazione e rate limit.
app.UseUploadedFiles();
app.UseCors();

app.UseAuthentication();

// Dopo UseCors, così anche le risposte 429 hanno gli header CORS e il browser mostra il messaggio,
// e dopo UseAuthentication, così le policy sanno chi ha fatto il login (gli upload dello staff non hanno limiti).
app.UseRateLimiter();
app.UseAuthorization();

app.MapAuthEndpoints();
app.MapSiteEndpoints();
app.MapRequestsEndpoints();
app.MapStudioEndpoints();
app.MapStudioConfigEndpoints();
app.MapUploadsEndpoints();

app.Run();

// Rende la classe Program visibile al progetto di test (WebApplicationFactory<Program>).
public partial class Program;

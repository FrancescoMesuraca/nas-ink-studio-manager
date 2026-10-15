using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using NasInk.Api.Data;
using NasInk.Api.Errors;
using NasInk.Api.Requests;
using NasInk.Api.Site;

var builder = WebApplication.CreateBuilder(args);

// --- Servizi ---

builder.Services.AddDbContext<NasInkDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// JSON: camelCase (predefinito) e campi null omessi, così i campi facoltativi del contratto
// TypeScript (es. `bio?: string`) arrivano al frontend come assenti, non come null.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull);

// CORS: il frontend in sviluppo gira su un'altra origine (Vite, http://localhost:5173).
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddRequestsRateLimit(builder.Configuration);
builder.Services.AddSingleton(TimeProvider.System);

var app = builder.Build();

// --- Database ---

// In sviluppo applichiamo le migrazioni e carichiamo i dati demo all'avvio.
// In produzione le migrazioni si lanciano a parte (vedi README).
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<NasInkDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db);
}

// --- Pipeline HTTP ---

app.UseApiErrors();
app.UseCors();
// Dopo UseCors, così anche le risposte 429 hanno gli header CORS e il browser mostra il messaggio.
app.UseRateLimiter();

app.MapSiteEndpoints();
app.MapRequestsEndpoints();

app.Run();

// Rende la classe Program visibile al progetto di test (WebApplicationFactory<Program>).
public partial class Program;

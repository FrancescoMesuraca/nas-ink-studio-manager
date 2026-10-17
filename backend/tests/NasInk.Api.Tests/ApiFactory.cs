using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace NasInk.Api.Tests;

/// <summary>
/// Avvia l'API in memoria (WebApplicationFactory) collegata a un PostgreSQL usa e getta in Docker
/// (Testcontainers). Le migrazioni e il seed girano all'avvio come in sviluppo, quindi i test
/// partono sempre dai dati demo. Serve Docker acceso.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder("postgres:17").Build();

    /// <summary>Cartella temporanea per le immagini caricate, cancellata a fine test.</summary>
    public string UploadsPath { get; } =
        Path.Combine(Path.GetTempPath(), "nasink-tests-" + Guid.NewGuid().ToString("N"));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:Default", _database.GetConnectionString());
        // Nei test tutte le chiamate arrivano dallo stesso "IP": il limite anti-spam va alzato
        // (il test che lo verifica lo abbassa di nuovo).
        builder.UseSetting("RateLimiting:PublicForm:PermitLimit", "1000");
        builder.UseSetting("Uploads:RateLimit:PermitLimit", "1000");
        builder.UseSetting("Uploads:Path", UploadsPath);
    }

    public Task InitializeAsync() => _database.StartAsync();

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _database.DisposeAsync();
        if (Directory.Exists(UploadsPath))
            Directory.Delete(UploadsPath, recursive: true);
    }
}

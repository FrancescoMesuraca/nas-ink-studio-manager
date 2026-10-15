using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using NasInk.Domain.Site;
using NasInk.Domain.Studio;

namespace NasInk.Api.Data;

/// <summary>Impostazioni dello studio (una sola riga). Per ora contiene solo l'orario.</summary>
public sealed class StudioSettings
{
    public int Id { get; set; }
    public required StudioHours Hours { get; set; }
}

/// <summary>
/// Contenuti del sito vetrina (una sola riga). Il SiteContent è un documento annidato che si
/// legge e si salva sempre tutto insieme, quindi lo teniamo in una colonna jsonb invece di
/// spezzarlo in tante tabelle.
/// </summary>
public sealed class SiteDocument
{
    public int Id { get; set; }
    public required SiteContent Content { get; set; }
}

public sealed class NasInkDbContext(DbContextOptions<NasInkDbContext> options) : DbContext(options)
{
    public DbSet<Artist> Artists => Set<Artist>();
    public DbSet<StudioSettings> StudioSettings => Set<StudioSettings>();
    public DbSet<SiteDocument> SiteDocuments => Set<SiteDocument>();

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Artist>(artist =>
        {
            artist.Property(a => a.Id).HasMaxLength(64);
            artist.Property(a => a.Name).HasMaxLength(120);
            artist.Property(a => a.Color).HasMaxLength(16);
        });

        // Le due colonne Hours_Start e Hours_End finiscono nella tabella StudioSettings.
        modelBuilder.Entity<StudioSettings>().ComplexProperty(s => s.Hours);

        // Conversione SiteContent <-> testo JSON, salvato in una colonna di tipo jsonb.
        // Il ValueComparer dice a EF come capire se il contenuto è cambiato (confronta il JSON).
        modelBuilder.Entity<SiteDocument>()
            .Property(s => s.Content)
            .HasColumnType("jsonb")
            .HasConversion(
                content => JsonSerializer.Serialize(content, JsonOptions),
                json => JsonSerializer.Deserialize<SiteContent>(json, JsonOptions)!,
                new ValueComparer<SiteContent>(
                    (a, b) => JsonSerializer.Serialize(a, JsonOptions) == JsonSerializer.Serialize(b, JsonOptions),
                    content => JsonSerializer.Serialize(content, JsonOptions).GetHashCode(),
                    content => JsonSerializer.Deserialize<SiteContent>(JsonSerializer.Serialize(content, JsonOptions), JsonOptions)!));
    }
}

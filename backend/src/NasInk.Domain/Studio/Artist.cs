namespace NasInk.Domain.Studio;

/// <summary>Tatuatore del gestionale (come `Artist` nel frontend).</summary>
public sealed class Artist
{
    public required string Id { get; set; }
    public required string Name { get; set; }

    /// <summary>Colore esadecimale usato in agenda e sul sito, es. "#d85a7f".</summary>
    public required string Color { get; set; }

    /// <summary>Ordine di visualizzazione: nel frontend è l'ordine dell'array, qui serve una colonna.</summary>
    public int Position { get; set; }
}

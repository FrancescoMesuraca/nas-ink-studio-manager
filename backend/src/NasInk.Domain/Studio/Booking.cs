namespace NasInk.Domain.Studio;

/// <summary>
/// Prenotazione di un lettino per un tatuatore (come `Booking` nel frontend).
/// Data "yyyy-MM-dd" e orari "HH:mm" restano stringhe come nel contratto: in questo formato
/// l'ordine alfabetico coincide con quello cronologico, quindi si possono confrontare direttamente.
/// </summary>
public sealed class Booking
{
    public required string Id { get; set; }
    public required string Date { get; set; }
    public required string Start { get; set; }
    public required string End { get; set; }
    public required string BedId { get; set; }
    public required string ArtistId { get; set; }
}

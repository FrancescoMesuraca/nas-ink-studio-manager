namespace NasInk.Domain.Studio;

/// <summary>Sala dello studio con i suoi lettini (come `Room` nel frontend).</summary>
public sealed class Room
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    /// <summary>Ordine di visualizzazione (nel frontend è l'ordine dell'array).</summary>
    public int Position { get; set; }
    public List<Bed> Beds { get; set; } = [];
}

/// <summary>Lettino di una sala (come `Bed` nel frontend).</summary>
public sealed class Bed
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    /// <summary>Ordine di visualizzazione dentro la sala.</summary>
    public int Position { get; set; }
    public string RoomId { get; set; } = "";
}

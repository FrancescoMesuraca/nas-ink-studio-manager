using System.Globalization;

namespace NasInk.Domain.Studio;

/// <summary>Una fascia oraria in un giorno: prenotazione o consulenza.</summary>
public sealed record TimeSlot(string Date, string Start, string End);

/// <summary>
/// Regole di frontend/src/services/bookingRules.js. Date "yyyy-MM-dd" e orari "HH:mm" si
/// confrontano come stringhe (in questo formato l'ordine alfabetico è quello cronologico),
/// quindi prima controlliamo che il formato sia proprio quello.
/// </summary>
public static class BookingRules
{
    /// <summary>Errore di data o orario non valido, o fuori dagli orari dello studio; null se va bene.</summary>
    public static string? TimeRangeError(TimeSlot candidate, StudioHours hours)
    {
        if (!IsDate(candidate.Date) || !IsTime(candidate.Start) || !IsTime(candidate.End))
            return "Data o orario non validi.";
        if (string.CompareOrdinal(candidate.End, candidate.Start) <= 0)
            return "L’orario di fine deve essere successivo a quello di inizio.";
        if (
            string.CompareOrdinal(candidate.Start, hours.Start) < 0
            || string.CompareOrdinal(candidate.End, hours.End) > 0
        )
            return $"Scegli un orario tra {hours.Start} e {hours.End}.";
        return null;
    }

    /// <summary>Stesso giorno e fasce che si sovrappongono. Fasce consecutive (10–12 e 12–14) non si sovrappongono.</summary>
    public static bool Overlaps(TimeSlot a, TimeSlot b) =>
        a.Date == b.Date
        && string.CompareOrdinal(a.Start, b.End) < 0
        && string.CompareOrdinal(b.Start, a.End) < 0;

    /// <summary>
    /// Conflitto con le altre prenotazioni (già esclusa quella che si sta modificando): stesso
    /// lettino o stesso tatuatore nella stessa fascia. Null se non ci sono conflitti.
    /// </summary>
    public static string? BookingConflict(Booking candidate, IEnumerable<Booking> others)
    {
        var slot = candidate.ToSlot();
        var overlapping = others.Where(other => Overlaps(slot, other.ToSlot())).ToList();
        if (overlapping.Any(other => other.BedId == candidate.BedId))
            return "Il lettino è già occupato in questa fascia oraria.";
        if (overlapping.Any(other => other.ArtistId == candidate.ArtistId))
            return "Il tatuatore ha già una prenotazione in questa fascia oraria.";
        return null;
    }

    public static TimeSlot ToSlot(this Booking booking) =>
        new(booking.Date, booking.Start, booking.End);

    private static bool IsDate(string value) =>
        DateOnly.TryParseExact(
            value,
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out _
        );

    private static bool IsTime(string value) =>
        TimeOnly.TryParseExact(
            value,
            "HH:mm",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out _
        );
}

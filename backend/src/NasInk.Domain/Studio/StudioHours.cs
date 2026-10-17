namespace NasInk.Domain.Studio;

/// <summary>Orario di apertura dello studio, in formato "HH:mm" (come `StudioHours` nel frontend).</summary>
public sealed record StudioHours(string Start, string End);

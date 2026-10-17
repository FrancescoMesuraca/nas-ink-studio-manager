using Microsoft.EntityFrameworkCore;
using NasInk.Api.Data;
using NasInk.Api.Errors;
using NasInk.Api.OpenApi;
using NasInk.Domain.Site;
using NasInk.Domain.Users;

namespace NasInk.Api.Site;

// Endpoint del sito vetrina (frontend/src/api/site/siteApi.http.ts).
//
//   GET /site/public   → PublicSite        pubblico; non espone dati del gestionale
//   PUT /site          SiteContent → SiteContent   solo titolare (401/403), 400 con `fields` se non valido
public static class SiteEndpoints
{
    public static IEndpointRouteBuilder MapSiteEndpoints(this IEndpointRouteBuilder app)
    {
        var site = app.MapGroup("/site").WithTags("Sito");
        site.MapGet("/public", GetPublicSite)
            .WithSummary("Contenuti del sito vetrina, tatuatori e orari");
        // La policy "titolare" (registrata in AddNasInkAuth) risponde 401 senza token e 403 ai tatuatori.
        site.MapPut("/", SaveContent)
            .RequireAuthorization(Roles.Titolare)
            .WithSummary("Salva i contenuti del sito")
            .ProducesErrors(400);
        return app;
    }

    private static async Task<SiteContent> SaveContent(
        SiteContent content,
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        // Come nel mock: il primo messaggio diventa `message`, tutti finiscono in `fields`.
        var errors = SiteValidation.Validate(content);
        if (errors.Count > 0)
            throw new ApiException(StatusCodes.Status400BadRequest, errors.Values.First(), errors);

        var document =
            await db.SiteDocuments.SingleOrDefaultAsync(cancellationToken)
            ?? throw new ApiException(
                StatusCodes.Status404NotFound,
                "Il sito non è ancora stato configurato."
            );
        // Sostituiamo tutto il documento: il ValueComparer configurato nel DbContext si accorge
        // che il JSON è cambiato e SaveChanges aggiorna la colonna jsonb.
        document.Content = SiteValidation.Normalize(content);
        await db.SaveChangesAsync(cancellationToken);
        return document.Content;
    }

    private static async Task<PublicSite> GetPublicSite(
        NasInkDbContext db,
        CancellationToken cancellationToken
    )
    {
        var document = await db
            .SiteDocuments.AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
        var studio = await db.StudioSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        if (document is null || studio is null)
            throw new ApiException(
                StatusCodes.Status404NotFound,
                "Il sito non è ancora stato configurato."
            );

        var artists = await db.Artists.AsNoTracking().ToListAsync(cancellationToken);
        return PublicSite.Create(document.Content, artists, studio.Hours);
    }
}

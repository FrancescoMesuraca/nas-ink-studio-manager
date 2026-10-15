using Microsoft.EntityFrameworkCore;
using NasInk.Api.Data;
using NasInk.Api.Errors;
using NasInk.Domain.Site;

namespace NasInk.Api.Site;

// Endpoint del sito vetrina (frontend/src/api/site/siteApi.http.ts).
//
//   GET /site/public   → PublicSite        pubblico; non espone dati del gestionale
//   PUT /site          SiteContent → SiteContent   solo titolare, 400 se non valido   (da fare)
public static class SiteEndpoints
{
    public static IEndpointRouteBuilder MapSiteEndpoints(this IEndpointRouteBuilder app)
    {
        var site = app.MapGroup("/site").WithTags("Sito");
        site.MapGet("/public", GetPublicSite);
        return app;
    }

    private static async Task<PublicSite> GetPublicSite(NasInkDbContext db, CancellationToken cancellationToken)
    {
        var document = await db.SiteDocuments.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        var studio = await db.StudioSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        if (document is null || studio is null)
            throw new ApiException(StatusCodes.Status404NotFound, "Il sito non è ancora stato configurato.");

        var artists = await db.Artists.AsNoTracking().ToListAsync(cancellationToken);
        return PublicSite.Create(document.Content, artists, studio.Hours);
    }
}

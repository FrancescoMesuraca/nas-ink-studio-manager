import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { PublicSite, SiteSectionId } from '../api'
import { hoursText, initials, instagramUrl, sectionMeta, visibleSections } from './siteSections'

/** Contenuto della home: usato dalla pagina pubblica e dall'anteprima dell'editor. */
export default function HomeSections({ site }: { site: PublicSite }) {
  const { content } = site
  const sections = visibleSections(site)
  const showGallery = sections.some((section) => section.id === 'gallery') && content.gallery.length > 0
  const render: Record<SiteSectionId, () => ReactNode> = {
    about: () => <About site={site} />,
    gallery: () => content.gallery.length > 0 && <Gallery site={site} />,
    artists: () => <Artists site={site} />,
    contacts: () => <Contacts site={site} />,
  }
  return <>
    <section className="site-hero" style={{ backgroundImage: content.hero.imageUrl ? `url("${content.hero.imageUrl.replace(/"/g, '%22')}")` : undefined }}>
      <div className="site-hero-inner">
        <p className="site-eyebrow">{content.studioName}</p>
        <h1>{content.hero.title}</h1>
        {content.hero.subtitle && <p className="site-hero-subtitle">{content.hero.subtitle}</p>}
        <div className="site-hero-actions">
          <Link className="site-button site-button-large" to="/richiesta">{content.hero.ctaLabel}</Link>
          {showGallery && <Link className="site-link-button" to={{ pathname: '/', hash: sectionMeta.gallery.anchor }}>Guarda i lavori</Link>}
        </div>
      </div>
    </section>
    {sections.map((section) => <div key={section.id}>{render[section.id]()}</div>)}
    <section className="site-cta-band">
      <div className="site-container">
        <h2>Hai in mente un tatuaggio?</h2>
        <p>Raccontaci la tua idea: ti ricontattiamo per fissare una consulenza in studio.</p>
        <Link className="site-button site-button-large" to="/richiesta">{content.hero.ctaLabel}</Link>
      </div>
    </section>
  </>
}

const paragraphs = (text: string) => text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)

function About({ site }: { site: PublicSite }) {
  const { about } = site.content
  return <section className="site-section" id={sectionMeta.about.anchor}>
    <div className={'site-container site-about' + (about.imageUrl ? '' : ' no-image')}>
      <div>
        <h2>{about.title}</h2>
        {paragraphs(about.text).map((text, index) => <p key={index}>{text}</p>)}
      </div>
      {about.imageUrl && <img src={about.imageUrl} alt="" loading="lazy" />}
    </div>
  </section>
}

function Gallery({ site }: { site: PublicSite }) {
  const artists = new Map(site.artists.map((artist) => [artist.id, artist]))
  return <section className="site-section site-section-alt" id={sectionMeta.gallery.anchor}>
    <div className="site-container">
      <h2>Lavori</h2>
      <p className="site-section-lead">Alcuni progetti realizzati in studio. Ogni tatuaggio è disegnato su misura.</p>
      <div className="site-gallery">
        {site.content.gallery.map((item) => {
          const artist = item.artistId ? artists.get(item.artistId) : undefined
          return <figure key={item.id}>
            <img src={item.imageUrl} alt={item.caption || 'Tatuaggio realizzato in studio'} loading="lazy" />
            {(item.caption || artist) && <figcaption>
              {item.caption && <span>{item.caption}</span>}
              {artist && <small><i style={{ background: artist.color }} />{artist.name}</small>}
            </figcaption>}
          </figure>
        })}
      </div>
    </div>
  </section>
}

function Artists({ site }: { site: PublicSite }) {
  return <section className="site-section" id={sectionMeta.artists.anchor}>
    <div className="site-container">
      <h2>Tatuatori</h2>
      <p className="site-section-lead">Scegli chi senti più vicino al tuo stile, oppure lascia che sia lo studio a consigliarti.</p>
      <div className="site-artists">
        {site.artists.map((artist) => <article key={artist.id} className="site-artist">
          {artist.photoUrl
            ? <img className="site-avatar" src={artist.photoUrl} alt={'Foto di ' + artist.name} loading="lazy" />
            : <span className="site-avatar" style={{ background: artist.color }} aria-hidden="true">{initials(artist.name)}</span>}
          <h3>{artist.name}</h3>
          {artist.bio && <p>{artist.bio}</p>}
          <div className="site-artist-links">
            <Link to={{ pathname: '/richiesta', search: '?tatuatore=' + encodeURIComponent(artist.id) }}>Richiedi con {artist.name.split(' ')[0]} →</Link>
            {artist.instagram && <a href={instagramUrl(artist.instagram)} target="_blank" rel="noreferrer">@{artist.instagram.replace(/^@/, '')}</a>}
          </div>
        </article>)}
      </div>
    </div>
  </section>
}

function Contacts({ site }: { site: PublicSite }) {
  const { contacts } = site.content
  return <section className="site-section site-section-alt" id={sectionMeta.contacts.anchor}>
    <div className="site-container">
      <h2>Contatti e orari</h2>
      <dl className="site-contacts">
        {contacts.address && <div><dt>Indirizzo</dt><dd>{contacts.address}{contacts.mapUrl && <> · <a href={contacts.mapUrl} target="_blank" rel="noreferrer">Apri la mappa</a></>}</dd></div>}
        <div><dt>Orari</dt><dd>{hoursText(site)}</dd></div>
        {contacts.phone && <div><dt>Telefono</dt><dd><a href={'tel:' + contacts.phone.replace(/\s+/g, '')}>{contacts.phone}</a></dd></div>}
        {contacts.email && <div><dt>Email</dt><dd><a href={'mailto:' + contacts.email}>{contacts.email}</a></dd></div>}
        {contacts.instagram && <div><dt>Instagram</dt><dd><a href={instagramUrl(contacts.instagram)} target="_blank" rel="noreferrer">@{contacts.instagram.replace(/^@/, '')}</a></dd></div>}
      </dl>
    </div>
  </section>
}

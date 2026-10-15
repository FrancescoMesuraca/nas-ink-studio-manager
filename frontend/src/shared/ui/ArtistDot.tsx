import './ui.css'

/** Pallino con il colore del tatuatore. È decorativo: il nome va scritto accanto. */
export default function ArtistDot({ color, size = 15 }: { color: string; size?: number }) {
  return <i className="artist-dot" style={{ background: color, width: size, height: size }} aria-hidden="true" />
}

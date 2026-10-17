import { useState } from 'react'
import type { PublicSite } from '../../api'
import HomeSections from '../../public/HomeSections'
import SiteFrame from '../../public/SiteFrame'

type Device = 'phone' | 'desktop'
const devices: { id: Device; label: string }[] = [{ id: 'phone', label: 'Telefono' }, { id: 'desktop', label: 'Computer' }]

/** Anteprima live della home, con la stessa grafica del sito pubblico, a misura di telefono o di computer. */
export default function PreviewPane({ site }: { site: PublicSite }) {
  const [device, setDevice] = useState<Device>('phone')

  return <div className="editor-preview">
    <div className="preview-toolbar" role="group" aria-label="Dimensione anteprima">
      <span>Anteprima</span>
      {devices.map(({ id, label }) => <button key={id} type="button" className={device === id ? '' : 'secondary'} aria-pressed={device === id} onClick={() => setDevice(id)}>{label}</button>)}
    </div>
    <div className={'preview-frame ' + device} aria-label="Anteprima del sito">
      <SiteFrame site={site} preview><HomeSections site={site} /></SiteFrame>
    </div>
  </div>
}

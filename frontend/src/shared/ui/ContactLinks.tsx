/** Link per chiamare: nell'indirizzo `tel:` gli spazi vanno tolti. */
export function PhoneLink({ phone }: { phone: string }) {
  return <a href={'tel:' + phone.replace(/\s+/g, '')}>{phone}</a>
}

export function EmailLink({ email }: { email: string }) {
  return <a href={'mailto:' + email}>{email}</a>
}

/** Email e telefono sulla stessa riga, separati da " · ". Mostra solo quelli presenti. */
export default function ContactLinks({ email, phone }: { email?: string; phone?: string }) {
  return <>
    {email && <EmailLink email={email} />}
    {email && phone && ' · '}
    {phone && <PhoneLink phone={phone} />}
  </>
}

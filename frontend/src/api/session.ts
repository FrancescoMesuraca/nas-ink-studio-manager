// Token della sessione corrente, condiviso da client HTTP e mock.
const key = 'nas-ink-session-token'

export const tokenStore = {
  get(): string | null {
    try { return localStorage.getItem(key) } catch { return null }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(key, token)
      else localStorage.removeItem(key)
    } catch { /* storage non disponibile: la sessione dura quanto la pagina */ }
  },
}

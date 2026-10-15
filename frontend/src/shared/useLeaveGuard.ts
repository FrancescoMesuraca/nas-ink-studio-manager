import { useEffect } from 'react'
import { useBlocker } from 'react-router'

/**
 * Finché `active` è vero chiede conferma (`question`) prima di passare a un'altra pagina dell'app
 * e fa avvisare dal browser chi prova a chiudere o ricaricare la scheda.
 */
export function useLeaveGuard(active: boolean, question: string) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => active && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(question)) blocker.proceed()
    else blocker.reset()
  }, [blocker, question])

  useEffect(() => {
    if (!active) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])
}

import type { ReactNode } from 'react'
import { Navigate, Outlet, type RouteObject } from 'react-router'
import AdminLayout from './admin/AdminLayout'
import ArtistAgenda from './admin/agenda/ArtistAgenda'
import Beds from './admin/beds/Beds'
import History from './admin/history/History'
import Requests from './admin/requests/Requests'
import Settings from './admin/settings/Settings'
import AuthProvider from './auth/AuthProvider'
import { RequireAuth, RequireRole } from './auth/guards'
import LoginPage from './auth/LoginPage'
import NotFound from './shared/NotFound'

const ownerOnly = (element: ReactNode) => <RequireRole roles={['titolare']}>{element}</RequireRole>

export const routes: RouteObject[] = [{
  element: <AuthProvider><Outlet /></AuthProvider>,
  children: [
    { path: '/', element: <Navigate to="/gestionale" replace /> },
    { path: '/login', element: <LoginPage /> },
    {
      path: '/gestionale',
      element: <RequireAuth><AdminLayout /></RequireAuth>,
      children: [
        { index: true, element: <Navigate to="lettini" replace /> },
        { path: 'lettini', element: <Beds /> },
        { path: 'agenda', element: <ArtistAgenda /> },
        { path: 'richieste', element: <Requests /> },
        { path: 'richieste/:id', element: <Requests /> },
        { path: 'schede', element: <History /> },
        { path: 'configurazione', element: ownerOnly(<Settings />) },
      ],
    },
    { path: '*', element: <NotFound /> },
  ],
}]

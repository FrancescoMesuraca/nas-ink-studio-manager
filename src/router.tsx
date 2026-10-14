import type { ReactNode } from 'react'
import { Navigate, Outlet, ScrollRestoration, type RouteObject } from 'react-router'
import AdminLayout from './admin/AdminLayout'
import ArtistAgenda from './admin/agenda/ArtistAgenda'
import Beds from './admin/beds/Beds'
import History from './admin/history/History'
import Requests from './admin/requests/Requests'
import Settings from './admin/settings/Settings'
import AuthProvider from './auth/AuthProvider'
import { RequireAuth, RequireRole } from './auth/guards'
import LoginPage from './auth/LoginPage'
import HomePage from './public/HomePage'
import PrivacyPage from './public/PrivacyPage'
import PublicLayout from './public/PublicLayout'
import RequestFormPage from './public/request/RequestFormPage'
import RequestSentPage from './public/request/RequestSentPage'
import NotFound from './shared/NotFound'

const ownerOnly = (element: ReactNode) => <RequireRole roles={['titolare']}>{element}</RequireRole>

export const routes: RouteObject[] = [{
  element: <AuthProvider><ScrollRestoration /><Outlet /></AuthProvider>,
  children: [
    {
      element: <PublicLayout />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/richiesta', element: <RequestFormPage /> },
        { path: '/richiesta/inviata', element: <RequestSentPage /> },
        { path: '/privacy', element: <PrivacyPage /> },
      ],
    },
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

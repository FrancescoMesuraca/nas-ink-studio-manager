import { Navigate, type RouteObject } from 'react-router'
import AdminLayout from './admin/AdminLayout'
import ArtistAgenda from './admin/agenda/ArtistAgenda'
import Beds from './admin/beds/Beds'
import History from './admin/history/History'
import Requests from './admin/requests/Requests'
import Settings from './admin/settings/Settings'
import NotFound from './shared/NotFound'

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/gestionale" replace /> },
  {
    path: '/gestionale',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="lettini" replace /> },
      { path: 'lettini', element: <Beds /> },
      { path: 'agenda', element: <ArtistAgenda /> },
      { path: 'richieste', element: <Requests /> },
      { path: 'richieste/:id', element: <Requests /> },
      { path: 'schede', element: <History /> },
      { path: 'configurazione', element: <Settings /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]

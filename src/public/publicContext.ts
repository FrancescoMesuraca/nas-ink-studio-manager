import { useOutletContext } from 'react-router'
import type { PublicSite } from '../api'

export type PublicContext = { site: PublicSite }

export const usePublicSite = () => useOutletContext<PublicContext>().site

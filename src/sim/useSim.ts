import { useCallback, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVersion, setView, subscribe } from './engine'
import type { Side } from './types'

/** Re-render the calling component whenever the simulation changes. */
export function useSim() {
  return useSyncExternalStore(subscribe, getVersion, getVersion)
}

/** Open a market page; a Yes/No button also pre-selects that side in the trade panel. */
export function useOpenMarket() {
  const navigate = useNavigate()
  return useCallback(
    (id: string, side?: Side) => {
      setView('market', id, side)
      navigate('/market/' + id)
      window.scrollTo(0, 0)
    },
    [navigate],
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

/**
 * Loads a GET endpoint. Pass `null` as the path to skip. `interval` (ms) refreshes it
 * silently in the background, e.g. for live turnout.
 */
export function useApi(path, { interval } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path })
  const alive = useRef(true)

  const load = useCallback(async (silent = false) => {
    if (!path) return
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await api.get(path)
      if (alive.current) setState({ data, error: null, loading: false })
      return data
    } catch (error) {
      if (alive.current) setState((s) => ({ data: silent ? s.data : null, error, loading: false }))
    }
  }, [path])

  useEffect(() => {
    alive.current = true
    load()
    if (!interval) return () => { alive.current = false }
    const t = setInterval(() => document.visibilityState === 'visible' && load(true), interval)
    return () => { alive.current = false; clearInterval(t) }
  }, [load, interval])

  const setData = useCallback((fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })), [])
  return { ...state, reload: load, setData }
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, refreshSession, setAccessToken, setSessionLostHandler } from '../lib/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSessionLostHandler(() => setUser(null))
    refreshSession().then((u) => { setUser(u); setReady(true) })
  }, [])

  const accept = useCallback((data) => {
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo(() => ({
    user,
    ready,
    setUser,
    login: async (email, password) => accept(await api.post('/auth/login', { email, password })),
    requestOtp: (email) => api.post('/auth/otp/request', { email }),
    verifyOtp: async (email, code) => accept(await api.post('/auth/otp/verify', { email, code })),
    registerOrg: async (form) => accept(await api.post('/auth/register-org', form)),
    refreshUser: async () => { const { user: u } = await api.get('/auth/me'); setUser(u); return u },
    logout: async () => {
      try { await api.post('/auth/logout') } catch {}
      setAccessToken(null)
      setUser(null)
    },
  }), [user, ready, accept])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

import { createContext, useContext } from 'react'
import { useApi } from '../lib/useApi'

// Network, contract address and latest block, shared by every page.
const ChainCtx = createContext({})

export function ChainProvider({ children }) {
  const { data } = useApi('/public/chain', { interval: 30_000 })
  return <ChainCtx.Provider value={data || {}}>{children}</ChainCtx.Provider>
}

export const useChainInfo = () => useContext(ChainCtx)

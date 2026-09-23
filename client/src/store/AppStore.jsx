import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import * as seed from '../data/seed'
import { randomHex } from '../lib/utils'

// Prototype state. Each action below maps to one future API call (noted beside it);
// swapping this reducer for real requests is the integration step in the plan.
const STORAGE_KEY = 'vc-state-v1'

const initialState = () => ({
  user: null,
  organizations: seed.organizations,
  elections: seed.elections,
  myVotes: seed.myVotes,
  activity: seed.activity,
})

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return initialState()
}

function reducer(state, a) {
  switch (a.type) {
    case 'login': // POST /auth/login
      return { ...state, user: a.user }
    case 'logout':
      return { ...state, user: null }
    case 'registerOrg': // POST /organizations
      return { ...state, organizations: [a.org, ...state.organizations], user: a.user }
    case 'setOrgStatus': // PATCH /admin/organizations/:id
      return { ...state, organizations: state.organizations.map((o) => (o.id === a.id ? { ...o, status: a.status } : o)) }
    case 'saveElection': { // POST /elections or PUT /elections/:id
      const exists = state.elections.some((e) => e.id === a.election.id)
      return {
        ...state,
        elections: exists ? state.elections.map((e) => (e.id === a.election.id ? a.election : e)) : [a.election, ...state.elections],
        activity: [{ at: new Date().toISOString(), text: `${a.election.title} ${exists ? 'updated' : 'created'}`, kind: 'edit' }, ...state.activity],
      }
    }
    case 'closeElection': // POST /elections/:id/close → contract.closeElection
      return {
        ...state,
        elections: state.elections.map((e) => (e.id === a.id ? { ...e, state: 'closed', endAt: new Date().toISOString() } : e)),
        activity: [{ at: new Date().toISOString(), text: 'Election closed on-chain', kind: 'publish' }, ...state.activity],
      }
    case 'publishResults': // POST /elections/:id/publish
      return { ...state, elections: state.elections.map((e) => (e.id === a.id ? { ...e, state: 'published' } : e)) }
    case 'castVote': { // POST /votes → relayer → contract.castVote
      const { electionId, candidateId, receipt } = a
      return {
        ...state,
        elections: state.elections.map((e) =>
          e.id === electionId ? { ...e, tally: { ...e.tally, [candidateId]: (e.tally[candidateId] || 0) + 1 } } : e,
        ),
        myVotes: { ...state.myVotes, [electionId]: receipt },
      }
    }
    case 'reset':
      return { ...initialState(), user: state.user }
    default:
      return state
  }
}

const Ctx = createContext(null)

export function AppStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  const loginAs = useCallback((role) => {
    const user = seed.users.find((u) => u.role === role)
    dispatch({ type: 'login', user })
    return user
  }, [])

  const castVote = useCallback((electionId, candidateId) => {
    const receipt = {
      candidateId,
      txHash: '0x' + randomHex(64),
      block: 6_900_000 + Math.floor(Math.random() * 900),
      castAt: new Date().toISOString(),
      receipt: `VC-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}`,
    }
    dispatch({ type: 'castVote', electionId, candidateId, receipt })
    return receipt
  }, [])

  const api = useMemo(() => ({
    ...state,
    loginAs,
    logout: () => dispatch({ type: 'logout' }),
    registerOrg: (org, user) => dispatch({ type: 'registerOrg', org, user }),
    setOrgStatus: (id, status) => dispatch({ type: 'setOrgStatus', id, status }),
    saveElection: (election) => dispatch({ type: 'saveElection', election }),
    closeElection: (id) => dispatch({ type: 'closeElection', id }),
    publishResults: (id) => dispatch({ type: 'publishResults', id }),
    castVote,
    resetDemo: () => dispatch({ type: 'reset' }),
    orgById: (id) => state.organizations.find((o) => o.id === id),
    electionById: (id) => state.elections.find((e) => e.id === id),
  }), [state, loginAs, castVote])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

export function findReceipt(state, code) {
  const needle = code.trim().toLowerCase()
  for (const [electionId, r] of Object.entries(state.myVotes)) {
    if (r.receipt.toLowerCase() === needle || r.txHash.toLowerCase() === needle) return { electionId, ...r }
  }
  return null
}

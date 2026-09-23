import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import RegisterOrg from './pages/public/RegisterOrg'
import VerifyList from './pages/public/VerifyList'
import VerifyElection from './pages/public/VerifyElection'
import ReceiptLookup from './pages/public/ReceiptLookup'
import NotFound from './pages/public/NotFound'
import OrgDashboard from './pages/org/OrgDashboard'
import OrgElections from './pages/org/OrgElections'
import ElectionEditor from './pages/org/ElectionEditor'
import OrgElectionDetail from './pages/org/OrgElectionDetail'
import OrgSettings from './pages/org/OrgSettings'
import VoterHome from './pages/voter/VoterHome'
import VoterElection from './pages/voter/VoterElection'
import Ballot from './pages/voter/Ballot'
import Receipt from './pages/voter/Receipt'
import VoteHistory from './pages/voter/VoteHistory'
import Profile from './pages/voter/Profile'
import AdminOverview from './pages/admin/AdminOverview'
import AdminOrgs from './pages/admin/AdminOrgs'
import AdminElections from './pages/admin/AdminElections'
import AdminHealth from './pages/admin/AdminHealth'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<RegisterOrg />} />
          <Route path="verify" element={<VerifyList />} />
          <Route path="verify/:id" element={<VerifyElection />} />
          <Route path="receipt" element={<ReceiptLookup />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="org" element={<DashboardLayout role="org_admin" />}>
          <Route index element={<OrgDashboard />} />
          <Route path="elections" element={<OrgElections />} />
          <Route path="elections/new" element={<ElectionEditor />} />
          <Route path="elections/:id" element={<OrgElectionDetail />} />
          <Route path="elections/:id/edit" element={<ElectionEditor />} />
          <Route path="settings" element={<OrgSettings />} />
        </Route>

        <Route path="vote" element={<DashboardLayout role="voter" />}>
          <Route index element={<VoterHome />} />
          <Route path="elections/:id" element={<VoterElection />} />
          <Route path="elections/:id/ballot" element={<Ballot />} />
          <Route path="receipt/:id" element={<Receipt />} />
          <Route path="history" element={<VoteHistory />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="admin" element={<DashboardLayout role="platform_admin" />}>
          <Route index element={<AdminOverview />} />
          <Route path="organizations" element={<AdminOrgs />} />
          <Route path="elections" element={<AdminElections />} />
          <Route path="health" element={<AdminHealth />} />
        </Route>
      </Routes>
    </>
  )
}

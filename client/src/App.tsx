import { Routes, Route } from 'react-router-dom'
import Signup from './Account/signup'
import Login from './Account/login'

import Settings from './Account/Settings'
import JoinProject from './Account/JoinProject'
import { DashboardPage } from './dashboard/dashboard'
import { Home } from './Home/Home'
import ResetPassword from './Account/ResetPassword'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/join-project/:projectId" element={<JoinProject />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </>
  )
}

export default App

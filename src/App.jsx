import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminPanel from './pages/AdminPanel'
import DriverPanel from './pages/DriverPanel'

function RequireAdmin({ children }) {
  const admin = sessionStorage.getItem('adminLoggedIn')
  return admin ? children : <Navigate to="/" replace />
}

function RequireDriver({ children }) {
  const driver = sessionStorage.getItem('driverData')
  return driver ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
        <Route path="/driver" element={<RequireDriver><DriverPanel /></RequireDriver>} />
      </Routes>
    </BrowserRouter>
  )
}
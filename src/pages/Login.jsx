import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('admin')

  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  const [driverContact, setDriverContact] = useState('')
  const [driverError, setDriverError] = useState('')
  const [driverLoading, setDriverLoading] = useState(false)

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setAdminLoading(true)
    setAdminError('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    })
    if (error) {
      setAdminError('Invalid email or password. Try again.')
      setAdminLoading(false)
      return
    }
    sessionStorage.setItem('adminLoggedIn', 'true')
    navigate('/admin')
  }

  const handleDriverLogin = async (e) => {
    e.preventDefault()
    setDriverLoading(true)
    setDriverError('')
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('contact_number', driverContact.trim())
      .single()
    if (error || !data) {
      setDriverError('No driver found with this contact number.')
      setDriverLoading(false)
      return
    }
    sessionStorage.setItem('driverData', JSON.stringify(data))
    navigate('/driver')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🚗</div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Trip & Fleet Management System</p>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'admin' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            onClick={() => setTab('admin')}
          >
            🔐 Admin Login
          </button>
          <button
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'driver' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            onClick={() => setTab('driver')}
          >
            🚛 Driver Login
          </button>
        </div>

        {tab === 'admin' ? (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)} required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@fleet.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)} required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            {adminError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{adminError}</p>}
            <button type="submit" disabled={adminLoading}
              className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 mt-2">
              {adminLoading ? 'Signing in...' : 'Sign in as Admin'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleDriverLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input
                type="text" value={driverContact}
                onChange={e => setDriverContact(e.target.value)} required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your registered mobile number"
              />
            </div>
            {driverError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{driverError}</p>}
            <button type="submit" disabled={driverLoading}
              className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 mt-2">
              {driverLoading ? 'Looking up...' : 'Sign in as Driver'}
            </button>
            <p className="text-xs text-gray-400 text-center">Use the mobile number your admin registered for you</p>
          </form>
        )}
      </div>
    </div>
  )
}
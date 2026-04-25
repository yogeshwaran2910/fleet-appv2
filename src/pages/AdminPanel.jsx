import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TripSummary from '../components/admin/TripSummary'
import Fleet from '../components/admin/Fleet'
import Reports from '../components/admin/Reports'
import Requests from '../components/admin/Requests'
import Analytics from '../components/admin/Analytics'
import NotificationBell from '../components/admin/NotificationBell'

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('trips')
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.removeItem('adminLoggedIn')
    navigate('/')
  }

  const tabs = [
    { id: 'trips', label: '📋 Trip Summary' },
    { id: 'fleet', label: '🚛 Fleet' },
    { id: 'reports', label: '📊 Reports' },
    { id: 'requests', label: '🔔 Requests' },
    { id: 'analytics', label: '📈 Analytics' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🚗</span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Fleet Manager</h1>
            <p className="text-blue-300 text-xs">Admin Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button onClick={handleLogout}
            className="bg-blue-800 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition">
            Logout
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="flex">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="p-6">
        {activeTab === 'trips' && <TripSummary />}
        {activeTab === 'fleet' && <Fleet />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'requests' && <Requests />}
        {activeTab === 'analytics' && <Analytics />}
      </main>
    </div>
  )
}
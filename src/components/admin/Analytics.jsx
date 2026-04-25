import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

export default function Analytics() {
  const [trips, setTrips] = useState([])
  const [advances, setAdvances] = useState([])
  const [fuels, setFuels] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [t, a, f, d] = await Promise.all([
      supabase.from('trips').select('*'),
      supabase.from('advance_requests').select('*'),
      supabase.from('fuel_requests').select('*'),
      supabase.from('drivers').select('*'),
    ])
    setTrips(t.data || [])
    setAdvances(a.data || [])
    setFuels(f.data || [])
    setDrivers(d.data || [])
    setLoading(false)
  }

  const tripsPerDay = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
      days.push({ date: label, Trips: trips.filter(t => t.trip_date === dateStr).length })
    }
    return days
  }

  const statusBreakdown = () => {
    const counts = { Assigned: 0, 'In Progress': 0, Completed: 0 }
    trips.forEach(t => {
      if (t.status === 'assigned') counts['Assigned']++
      else if (t.status === 'in_progress') counts['In Progress']++
      else if (t.status === 'completed') counts['Completed']++
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(e => e.value > 0)
  }

  const advancePerDriver = () => {
    const map = {}
    advances.filter(a => a.status === 'approved').forEach(a => {
      const name = (a.driver_name || 'Unknown').split(' ')[0]
      map[name] = (map[name] || 0) + (a.amount || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, Amount]) => ({ name, Amount }))
  }

  const totalAdvancePaid = advances.filter(a => a.status === 'approved').reduce((s, a) => s + (a.amount || 0), 0)
  const pendingRequests = advances.filter(a => a.status === 'pending').length + fuels.filter(f => f.status === 'pending').length
  const completedTrips = trips.filter(t => t.status === 'completed').length

  const PIE_COLORS = ['#378ADD', '#BA7517', '#639922']

  const statCards = [
    { label: 'Total Trips', value: trips.length, icon: '🚗', bg: '#E6F1FB', color: '#185FA5' },
    { label: 'Completed Trips', value: completedTrips, icon: '✅', bg: '#EAF3DE', color: '#3B6D11' },
    { label: 'Advance Paid Out', value: `₹${totalAdvancePaid.toLocaleString('en-IN')}`, icon: '💰', bg: '#FAEEDA', color: '#854F0B' },
    { label: 'Pending Requests', value: pendingRequests, icon: '🔔', bg: pendingRequests > 0 ? '#FCEBEB' : '#EAF3DE', color: pendingRequests > 0 ? '#A32D2D' : '#3B6D11' },
    { label: 'Total Drivers', value: drivers.length, icon: '👤', bg: '#EEEDFE', color: '#534AB7' },
    { label: 'Fuel Requests', value: fuels.length, icon: '⛽', bg: '#E1F5EE', color: '#0F6E56' },
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px' }}>
          <p style={{ fontWeight: 600, marginBottom: '4px', color: '#111' }}>{label}</p>
          {payload.map((p, i) => <p key={i} style={{ color: p.color, margin: 0 }}>{p.name}: {p.value}{p.name === 'Amount' ? '' : ''}</p>)}
        </div>
      )
    }
    return null
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-gray-400">Loading analytics...</p>
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
        <p className="text-gray-500 text-sm">Overview of your fleet operations</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center hover:shadow-md transition">
            <div className="text-2xl mb-2">{s.icon}</div>
            <p style={{ fontSize: '22px', fontWeight: 700, color: s.color, margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, fontWeight: 500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Trips per day bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">Trips — last 7 days</h3>
          <p className="text-xs text-gray-400 mb-4">Daily trip volume this week</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tripsPerDay()} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Trips" fill="#378ADD" radius={[6, 6, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trip status pie chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">Trip status</h3>
          <p className="text-xs text-gray-400 mb-4">Breakdown of all trips</p>
          {statusBreakdown().length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-300 text-sm">No trips yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusBreakdown()} cx="50%" cy="45%" innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="value">
                  {statusBreakdown().map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: '12px', color: '#6b7280' }}>{v}</span>} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Advance per driver */}
      {advancePerDriver().length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">Advance paid by driver</h3>
          <p className="text-xs text-gray-400 mb-4">Approved advance amounts only</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={advancePerDriver()} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip content={<CustomTooltip />} formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Advance']} />
              <Bar dataKey="Amount" fill="#EF9F27" radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {advancePerDriver().length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center text-gray-300 text-sm">
          Approve some advance requests to see driver-wise breakdown here.
        </div>
      )}
    </div>
  )
}
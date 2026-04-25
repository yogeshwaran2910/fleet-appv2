import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Reports() {
  const [trips, setTrips] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ trip_id: '', from_date: '', to_date: '' })

  useEffect(() => { fetchTrips() }, [])

  const fetchTrips = async () => {
    setLoading(true)
    const { data } = await supabase.from('trips').select('*').order('trip_date', { ascending: false })
    setTrips(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  const applyFilters = () => {
    let r = [...trips]
    if (filters.trip_id.trim()) r = r.filter(t => t.trip_id.toLowerCase().includes(filters.trip_id.toLowerCase()))
    if (filters.from_date) r = r.filter(t => t.trip_date >= filters.from_date)
    if (filters.to_date) r = r.filter(t => t.trip_date <= filters.to_date)
    setFiltered(r)
  }

  const clearFilters = () => { setFilters({ trip_id: '', from_date: '', to_date: '' }); setFiltered(trips) }

  const downloadCSV = () => {
    const headers = ['Trip ID','Date','Driver Name','Contact','Pickup','Drop','Advance (INR)','Fuel (INR)','Vehicle','No. of Trips','Remarks','Status']
    const rows = filtered.map(t => [
      t.trip_id, t.trip_date, t.driver_name || '', t.contact_number || '',
      t.pickup_location, t.drop_location,
      t.advanced_needed || 0, t.fuel_needed || 0,
      t.vehicle_number || '', t.number_of_trips,
      `"${(t.remarks || '').replace(/"/g, "'")}"`, t.status
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fleet-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusColors = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reports</h2>
          <p className="text-gray-500 text-sm">Filter and export trip data</p>
        </div>
        <button onClick={downloadCSV}
          className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition flex items-center gap-2">
          ⬇ Download CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Trip ID</label>
            <input type="text" value={filters.trip_id} onChange={e => setFilters({...filters, trip_id: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search trip ID..." />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">From Date</label>
            <input type="date" value={filters.from_date} onChange={e => setFilters({...filters, from_date: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To Date</label>
            <input type="date" value={filters.to_date} onChange={e => setFilters({...filters, to_date: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={applyFilters} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Apply</button>
          <button onClick={clearFilters} className="border border-gray-300 text-gray-600 px-5 py-2 rounded-xl text-sm hover:bg-gray-50">Clear</button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">Showing <strong>{filtered.length}</strong> of {trips.length} trips</p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Trip ID','Date','Driver','Pickup','Drop','Advance','Fuel','Vehicle','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No trips match your filters.</td></tr>
              ) : filtered.map((trip, i) => (
                <tr key={trip.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                  <td className="px-4 py-3 font-mono text-blue-600 text-xs font-medium">{trip.trip_id}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{trip.trip_date}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{trip.driver_name || '—'}</div>
                    <div className="text-gray-400 text-xs">{trip.contact_number}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[120px] truncate">{trip.pickup_location}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[120px] truncate">{trip.drop_location}</td>
                  <td className="px-4 py-3 text-gray-700">₹{trip.advanced_needed || 0}</td>
                  <td className="px-4 py-3 text-gray-700">₹{trip.fuel_needed || 0}</td>
                  <td className="px-4 py-3 text-gray-700">{trip.vehicle_number || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                      {trip.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
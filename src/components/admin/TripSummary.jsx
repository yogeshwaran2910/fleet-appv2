import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
}
const STATUS_LABELS = { assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed' }

export default function TripSummary() {
  const [trips, setTrips] = useState([])
  const [tripDriversMap, setTripDriversMap] = useState({})
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [assignDriverIds, setAssignDriverIds] = useState([])
  const [assignVehicle, setAssignVehicle] = useState('')
  const [expandedTrip, setExpandedTrip] = useState(null)

  const [form, setForm] = useState({
    trip_id: '', pickup_location: '', drop_location: '',
    advanced_needed: '', fuel_needed: '', vehicle_number: '',
    number_of_trips: 1, remarks: '',
    trip_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('trips-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_drivers' }, fetchTripDrivers)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [t, d, v] = await Promise.all([
      supabase.from('trips').select('*').order('created_at', { ascending: false }),
      supabase.from('drivers').select('*').order('driver_name'),
      supabase.from('vehicles').select('*').order('vehicle_number'),
    ])
    setTrips(t.data || [])
    setDrivers(d.data || [])
    setVehicles(v.data || [])
    await fetchTripDrivers()
    setLoading(false)
  }

  const fetchTripDrivers = async () => {
    const { data } = await supabase.from('trip_drivers').select('*')
    const map = {}
    ;(data || []).forEach(td => {
      if (!map[td.trip_id]) map[td.trip_id] = []
      map[td.trip_id].push(td)
    })
    setTripDriversMap(map)
  }

  const generateTripId = () => {
    const d = new Date()
    return `TRIP-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    const { error: err } = await supabase.from('trips').insert([{
      ...form,
      trip_id: form.trip_id || generateTripId(),
      advanced_needed: parseFloat(form.advanced_needed) || 0,
      fuel_needed: parseFloat(form.fuel_needed) || 0,
      number_of_trips: parseInt(form.number_of_trips) || 1,
      status: 'assigned',
    }])
    if (err) { setError(err.message); setSaving(false); return }
    setShowForm(false)
    setForm({ trip_id: '', pickup_location: '', drop_location: '', advanced_needed: '', fuel_needed: '', vehicle_number: '', number_of_trips: 1, remarks: '', trip_date: new Date().toISOString().split('T')[0] })
    setSaving(false)
  }

  const openAssign = (trip) => {
    setSelectedTrip(trip)
    const existing = (tripDriversMap[trip.id] || []).map(td => td.driver_id)
    setAssignDriverIds(existing)
    setAssignVehicle(trip.vehicle_number || '')
    setError('')
    setShowAssign(true)
  }

  const toggleDriver = (driverId) => {
    setAssignDriverIds(prev =>
      prev.includes(driverId) ? prev.filter(id => id !== driverId) : [...prev, driverId]
    )
  }

  const handleAssign = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      // Update vehicle on trip
      await supabase.from('trips').update({ vehicle_number: assignVehicle || null }).eq('id', selectedTrip.id)

      // Get existing driver assignments
      const { data: existing } = await supabase.from('trip_drivers').select('driver_id').eq('trip_id', selectedTrip.id)
      const existingIds = (existing || []).map(e => e.driver_id)

      // Remove unselected
      const toRemove = existingIds.filter(id => !assignDriverIds.includes(id))
      if (toRemove.length > 0) {
        await supabase.from('trip_drivers').delete().eq('trip_id', selectedTrip.id).in('driver_id', toRemove)
      }

      // Add new
      const toAdd = assignDriverIds.filter(id => !existingIds.includes(id))
      if (toAdd.length > 0) {
        const rows = toAdd.map(dId => {
          const d = drivers.find(x => x.id === dId)
          return { trip_id: selectedTrip.id, driver_id: dId, driver_name: d?.driver_name, contact_number: d?.contact_number, status: 'assigned' }
        })
        await supabase.from('trip_drivers').insert(rows)
      }

      // Also update legacy driver_name on trips table (first driver)
      if (assignDriverIds.length > 0) {
        const firstDriver = drivers.find(d => d.id === assignDriverIds[0])
        await supabase.from('trips').update({ driver_id: firstDriver?.id, driver_name: firstDriver?.driver_name, contact_number: firstDriver?.contact_number }).eq('id', selectedTrip.id)
      } else {
        await supabase.from('trips').update({ driver_id: null, driver_name: null, contact_number: null }).eq('id', selectedTrip.id)
      }

      setShowAssign(false)
      fetchAll()
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Trip Summary</h2>
          <p className="text-gray-500 text-sm">{trips.length} total trips</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          + Add Trip
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Trip ID','Drivers','Pickup','Drop','Advance','Fuel','Vehicle','Status','Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-16 text-gray-400">Loading trips...</td></tr>
              ) : trips.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16 text-gray-400">No trips yet. Click "+ Add Trip" to create one.</td></tr>
              ) : trips.map((trip, i) => {
                const tDrivers = tripDriversMap[trip.id] || []
                return (
                  <tr key={trip.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-3 font-mono text-blue-600 font-medium text-xs whitespace-nowrap">{trip.trip_id}</td>
                    <td className="px-4 py-3 min-w-[160px]">
                      {tDrivers.length === 0 ? (
                        <span className="text-gray-300 italic text-xs">Not assigned</span>
                      ) : (
                        <div className="space-y-1">
                          {tDrivers.slice(0, expandedTrip === trip.id ? tDrivers.length : 2).map(td => (
                            <div key={td.id} className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {td.driver_name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-800 leading-tight">{td.driver_name}</p>
                                <p className="text-xs text-gray-400 leading-tight">{td.contact_number}</p>
                              </div>
                              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[td.status] || 'bg-gray-100 text-gray-500'}`}>
                                {STATUS_LABELS[td.status] || td.status}
                              </span>
                            </div>
                          ))}
                          {tDrivers.length > 2 && (
                            <button onClick={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)}
                              className="text-xs text-blue-500 hover:underline">
                              {expandedTrip === trip.id ? 'Show less' : `+${tDrivers.length - 2} more`}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[120px] truncate">{trip.pickup_location}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[120px] truncate">{trip.drop_location}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">₹{trip.advanced_needed || 0}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">₹{trip.fuel_needed || 0}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{trip.vehicle_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[trip.status] || trip.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openAssign(trip)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap">
                        ✏️ Assign
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Trip Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">Add New Trip</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trip ID <span className="text-gray-400 font-normal text-xs">(auto if blank)</span></label>
                  <input type="text" value={form.trip_id} onChange={e => setForm({...form, trip_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. TRIP-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trip Date</label>
                  <input type="date" value={form.trip_date} onChange={e => setForm({...form, trip_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location *</label>
                  <input type="text" value={form.pickup_location} onChange={e => setForm({...form, pickup_location: e.target.value})}
                    required className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Chennai Port" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Drop Location *</label>
                  <input type="text" value={form.drop_location} onChange={e => setForm({...form, drop_location: e.target.value})}
                    required className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Bangalore Depot" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advance Needed (₹)</label>
                  <input type="number" value={form.advanced_needed} onChange={e => setForm({...form, advanced_needed: e.target.value})}
                    min="0" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Needed (₹)</label>
                  <input type="number" value={form.fuel_needed} onChange={e => setForm({...form, fuel_needed: e.target.value})}
                    min="0" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Vehicle</label>
                  <select value={form.vehicle_number} onChange={e => setForm({...form, vehicle_number: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map(v => <option key={v.id} value={v.vehicle_number}>{v.vehicle_number} ({v.vehicle_id})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Trips</label>
                  <input type="number" value={form.number_of_trips} onChange={e => setForm({...form, number_of_trips: e.target.value})}
                    min="1" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})}
                    rows={3} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Any extra notes..." />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm mt-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Drivers Modal */}
      {showAssign && selectedTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign Drivers</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedTrip.trip_id}</p>
              </div>
              <button onClick={() => setShowAssign(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleAssign} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                {/* Trip info */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><span>📍</span><span className="font-medium">{selectedTrip.pickup_location}</span></div>
                  <div className="flex items-center gap-2"><span>🏁</span><span className="font-medium">{selectedTrip.drop_location}</span></div>
                </div>

                {/* Vehicle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                  <select value={assignVehicle} onChange={e => setAssignVehicle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- No vehicle --</option>
                    {vehicles.map(v => <option key={v.id} value={v.vehicle_number}>{v.vehicle_number} ({v.vehicle_id})</option>)}
                  </select>
                </div>

                {/* Multi-driver picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Drivers <span className="text-blue-500 font-normal">({assignDriverIds.length} selected)</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-3">Tap a driver to add or remove from this trip</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {drivers.map(d => {
                      const selected = assignDriverIds.includes(d.id)
                      return (
                        <div key={d.id} onClick={() => toggleDriver(d.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {selected ? '✓' : d.driver_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-800'}`}>{d.driver_name}</p>
                            <p className="text-xs text-gray-400">{d.contact_number}</p>
                          </div>
                          {selected && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium flex-shrink-0">Added</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mx-5 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowAssign(false)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : `Assign ${assignDriverIds.length} Driver${assignDriverIds.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DriverPanel() {
  const navigate = useNavigate()
  const driver = JSON.parse(sessionStorage.getItem('driverData') || '{}')
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [showAdvance, setShowAdvance] = useState(false)
  const [showFuel, setShowFuel] = useState(false)

  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceReason, setAdvanceReason] = useState('')
  const [advanceSaving, setAdvanceSaving] = useState(false)
  const [advanceDone, setAdvanceDone] = useState(false)

  const [fuelImage, setFuelImage] = useState(null)
  const [fuelNotes, setFuelNotes] = useState('')
  const [fuelSaving, setFuelSaving] = useState(false)
  const [fuelDone, setFuelDone] = useState(false)

  useEffect(() => {
    if (!driver.id) { navigate('/'); return }
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    setLoading(true)
    const { data } = await supabase.from('trips').select('*').eq('driver_id', driver.id).order('trip_date', { ascending: false })
    setTrips(data || [])
    setLoading(false)
  }

  const completedCount = trips.filter(t => t.status === 'completed').length
  const assignedCount = trips.filter(t => t.status !== 'completed').length

  const handleLogout = () => { sessionStorage.removeItem('driverData'); navigate('/') }

  const handleRequestAdvance = async (e) => {
    e.preventDefault()
    setAdvanceSaving(true)
    await supabase.from('advance_requests').insert([{
      driver_id: driver.id,
      driver_name: driver.driver_name,
      trip_id: selectedTrip?.trip_id || null,
      amount: parseFloat(advanceAmount),
      reason: advanceReason,
    }])
    setAdvanceSaving(false)
    setAdvanceDone(true)
    setTimeout(() => { setShowAdvance(false); setAdvanceDone(false); setAdvanceAmount(''); setAdvanceReason('') }, 2500)
  }

  const handleRequestFuel = async (e) => {
    e.preventDefault()
    setFuelSaving(true)
    let image_url = null
    if (fuelImage) {
      try {
        const ext = fuelImage.name.split('.').pop()
        const path = `fuel/${driver.id}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('fuel-images').upload(path, fuelImage)
        if (!error) {
          const { data } = supabase.storage.from('fuel-images').getPublicUrl(path)
          image_url = data.publicUrl
        }
      } catch(err) { console.error(err) }
    }
    await supabase.from('fuel_requests').insert([{
      driver_id: driver.id,
      driver_name: driver.driver_name,
      trip_id: selectedTrip?.trip_id || null,
      image_url,
      notes: fuelNotes,
    }])
    setFuelSaving(false)
    setFuelDone(true)
    setTimeout(() => { setShowFuel(false); setFuelDone(false); setFuelImage(null); setFuelNotes('') }, 2500)
  }

  const statusColors = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center font-bold text-lg">
            {driver.driver_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold">{driver.driver_name}</p>
            <p className="text-blue-300 text-xs">{driver.contact_number}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="bg-blue-800 hover:bg-blue-700 text-sm px-3 py-1.5 rounded-lg transition">
          Logout
        </button>
      </header>

      <div className="max-w-lg mx-auto p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4 mb-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-sm">
            <p className="text-4xl font-bold text-green-600">{completedCount}</p>
            <p className="text-gray-500 text-sm mt-1 font-medium">Completed</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-sm">
            <p className="text-4xl font-bold text-blue-600">{assignedCount}</p>
            <p className="text-gray-500 text-sm mt-1 font-medium">Assigned</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => setShowAdvance(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-5 text-sm font-semibold transition shadow-sm flex flex-col items-center gap-2">
            <span className="text-3xl">💰</span>
            Request Advance
          </button>
          <button onClick={() => setShowFuel(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-5 text-sm font-semibold transition shadow-sm flex flex-col items-center gap-2">
            <span className="text-3xl">⛽</span>
            Request Fuel
          </button>
        </div>

        {/* Trip list */}
        <h2 className="text-lg font-bold text-gray-900 mb-3">My Trips</h2>
        {loading ? (
          <p className="text-center text-gray-400 py-8">Loading...</p>
        ) : trips.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center text-gray-400">
            No trips assigned yet.
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map(trip => (
              <div key={trip.id}
                onClick={() => setSelectedTrip(selectedTrip?.id === trip.id ? null : trip)}
                className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition hover:shadow-md ${
                  selectedTrip?.id === trip.id ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-blue-600 text-sm font-semibold">{trip.trip_id}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                    {trip.status}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📍</span><span><strong>From:</strong> {trip.pickup_location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>🏁</span><span><strong>To:</strong> {trip.drop_location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>🚛</span><span><strong>Vehicle:</strong> {trip.vehicle_number || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <span>📅</span><span>{trip.trip_date}</span>
                  </div>
                </div>
                {selectedTrip?.id === trip.id && (
                  <p className="text-blue-600 text-xs font-semibold mt-2 pt-2 border-t border-blue-200">
                    ✓ Selected — requests will be linked to this trip
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Advance Modal */}
      {showAdvance && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">💰 Request Advance</h3>
              <button onClick={() => setShowAdvance(false)} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
            </div>
            {advanceDone ? (
              <div className="p-10 text-center">
                <div className="text-6xl mb-3">✅</div>
                <p className="text-green-600 font-bold text-lg">Request Sent!</p>
                <p className="text-gray-500 text-sm mt-1">Admin will review and approve your request.</p>
              </div>
            ) : (
              <form onSubmit={handleRequestAdvance} className="p-5 space-y-4">
                {selectedTrip && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm text-blue-700 font-medium">
                    Linked to: {selectedTrip.trip_id}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Needed (₹) *</label>
                  <input type="number" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)}
                    required min="1" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <textarea value={advanceReason} onChange={e => setAdvanceReason(e.target.value)}
                    required rows={3} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Explain why you need this advance..." />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAdvance(false)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={advanceSaving}
                    className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
                    {advanceSaving ? 'Sending...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Request Fuel Modal */}
      {showFuel && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">⛽ Request Fuel</h3>
              <button onClick={() => setShowFuel(false)} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
            </div>
            {fuelDone ? (
              <div className="p-10 text-center">
                <div className="text-6xl mb-3">✅</div>
                <p className="text-green-600 font-bold text-lg">Request Sent!</p>
                <p className="text-gray-500 text-sm mt-1">Admin will review your fuel request.</p>
              </div>
            ) : (
              <form onSubmit={handleRequestFuel} className="p-5 space-y-4">
                {selectedTrip && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm text-blue-700 font-medium">
                    Linked to: {selectedTrip.trip_id}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo of Fuel Gauge *</label>
                  <input type="file" accept="image/*" capture="environment"
                    onChange={e => setFuelImage(e.target.files[0])}
                    required className="w-full text-sm text-gray-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 file:font-medium" />
                  <p className="text-xs text-gray-400 mt-1">Take a photo of your fuel gauge to show current level</p>
                </div>
                {fuelImage && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 flex items-center gap-2">
                    📸 {fuelImage.name}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={fuelNotes} onChange={e => setFuelNotes(e.target.value)}
                    rows={2} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional information..." />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowFuel(false)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={fuelSaving}
                    className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                    {fuelSaving ? 'Uploading...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
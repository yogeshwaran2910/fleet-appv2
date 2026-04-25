import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
}
const STATUS_LABELS = { assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed' }

const LEAVE_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function DriverPanel() {
  const navigate = useNavigate()
  const driver = JSON.parse(sessionStorage.getItem('driverData') || '{}')
  const [activeSection, setActiveSection] = useState('trips')
  const [myTripAssignments, setMyTripAssignments] = useState([])
  const [tripsMap, setTripsMap] = useState({})
  const [leaveRequests, setLeaveRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [selectedTrip, setSelectedTrip] = useState(null)

  const [showAdvance, setShowAdvance] = useState(false)
  const [showFuel, setShowFuel] = useState(false)
  const [showLeave, setShowLeave] = useState(false)

  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceReason, setAdvanceReason] = useState('')
  const [advanceSaving, setAdvanceSaving] = useState(false)
  const [advanceDone, setAdvanceDone] = useState(false)

  const [fuelImage, setFuelImage] = useState(null)
  const [fuelNotes, setFuelNotes] = useState('')
  const [fuelSaving, setFuelSaving] = useState(false)
  const [fuelDone, setFuelDone] = useState(false)

  const [leaveForm, setLeaveForm] = useState({ from_date: '', to_date: '', reason: '' })
  const [leaveSaving, setLeaveSaving] = useState(false)
  const [leaveDone, setLeaveDone] = useState(false)

  useEffect(() => {
    if (!driver.id) { navigate('/'); return }
    fetchAll()
    const ch = supabase.channel('driver-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_drivers' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, fetchLeaves)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchTripAssignments(), fetchLeaves()])
    setLoading(false)
  }

  const fetchTripAssignments = async () => {
    const { data: assignments } = await supabase
      .from('trip_drivers')
      .select('*')
      .eq('driver_id', driver.id)
      .order('created_at', { ascending: false })

    if (assignments && assignments.length > 0) {
      const tripIds = assignments.map(a => a.trip_id)
      const { data: trips } = await supabase.from('trips').select('*').in('id', tripIds)
      const map = {}
      ;(trips || []).forEach(t => { map[t.id] = t })
      setTripsMap(map)
      setMyTripAssignments(assignments)
    } else {
      setMyTripAssignments([])
      setTripsMap({})
    }
  }

  const fetchLeaves = async () => {
    const { data } = await supabase.from('leave_requests').select('*').eq('driver_id', driver.id).order('created_at', { ascending: false })
    setLeaveRequests(data || [])
  }

  const updateMyStatus = async (assignmentId, newStatus) => {
    setUpdatingId(assignmentId)
    await supabase.from('trip_drivers').update({ status: newStatus }).eq('id', assignmentId)
    setUpdatingId(null)
    fetchTripAssignments()
  }

  const handleLogout = () => { sessionStorage.removeItem('driverData'); navigate('/') }

  const handleRequestAdvance = async (e) => {
    e.preventDefault(); setAdvanceSaving(true)
    const trip = selectedTrip ? tripsMap[selectedTrip.trip_id] : null
    await supabase.from('advance_requests').insert([{
      driver_id: driver.id, driver_name: driver.driver_name,
      trip_id: trip?.trip_id || null,
      amount: parseFloat(advanceAmount), reason: advanceReason,
    }])
    setAdvanceSaving(false); setAdvanceDone(true)
    setTimeout(() => { setShowAdvance(false); setAdvanceDone(false); setAdvanceAmount(''); setAdvanceReason('') }, 2500)
  }

  const handleRequestFuel = async (e) => {
    e.preventDefault(); setFuelSaving(true)
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
    const trip = selectedTrip ? tripsMap[selectedTrip.trip_id] : null
    await supabase.from('fuel_requests').insert([{
      driver_id: driver.id, driver_name: driver.driver_name,
      trip_id: trip?.trip_id || null, image_url, notes: fuelNotes,
    }])
    setFuelSaving(false); setFuelDone(true)
    setTimeout(() => { setShowFuel(false); setFuelDone(false); setFuelImage(null); setFuelNotes('') }, 2500)
  }

  const handleRequestLeave = async (e) => {
    e.preventDefault(); setLeaveSaving(true)
    await supabase.from('leave_requests').insert([{
      driver_id: driver.id,
      driver_name: driver.driver_name,
      from_date: leaveForm.from_date,
      to_date: leaveForm.to_date,
      reason: leaveForm.reason,
    }])
    setLeaveSaving(false); setLeaveDone(true)
    fetchLeaves()
    setTimeout(() => { setShowLeave(false); setLeaveDone(false); setLeaveForm({ from_date: '', to_date: '', reason: '' }) }, 2500)
  }

  const activeAssignments = myTripAssignments.filter(a => a.status !== 'completed')
  const doneAssignments = myTripAssignments.filter(a => a.status === 'completed')
  const completedCount = doneAssignments.length
  const assignedCount = activeAssignments.length
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length

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
        <button onClick={handleLogout} className="bg-blue-800 hover:bg-blue-700 text-sm px-3 py-1.5 rounded-lg transition">Logout</button>
      </header>

      {/* Bottom nav style tabs */}
      <div className="bg-white border-b border-gray-200 flex">
        <button onClick={() => setActiveSection('trips')}
          className={`flex-1 py-3.5 text-xs font-semibold flex flex-col items-center gap-1 border-b-2 transition ${activeSection === 'trips' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>
          <span className="text-lg">🚗</span> My Trips
        </button>
        <button onClick={() => setActiveSection('leave')}
          className={`flex-1 py-3.5 text-xs font-semibold flex flex-col items-center gap-1 border-b-2 transition relative ${activeSection === 'leave' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}>
          <span className="text-lg">🏖️</span> Leave
          {pendingLeaves > 0 && <span className="absolute top-2 right-6 bg-yellow-400 text-yellow-900 text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px]">{pendingLeaves}</span>}
        </button>
      </div>

      <div className="max-w-lg mx-auto p-4">

        {/* ===== TRIPS SECTION ===== */}
        {activeSection === 'trips' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4 mb-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-sm">
                <p className="text-4xl font-bold text-green-600">{completedCount}</p>
                <p className="text-gray-500 text-sm mt-1 font-medium">Completed</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-sm">
                <p className="text-4xl font-bold text-blue-600">{assignedCount}</p>
                <p className="text-gray-500 text-sm mt-1 font-medium">Active / Assigned</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => setShowAdvance(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-5 text-sm font-semibold transition shadow-sm flex flex-col items-center gap-2">
                <span className="text-3xl">💰</span>Request Advance
              </button>
              <button onClick={() => setShowFuel(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-5 text-sm font-semibold transition shadow-sm flex flex-col items-center gap-2">
                <span className="text-3xl">⛽</span>Request Fuel
              </button>
            </div>

            {/* Active trips */}
            {loading ? <p className="text-center text-gray-400 py-8">Loading...</p> : (
              <>
                {activeAssignments.length > 0 && (
                  <>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Active Trips</h2>
                    <div className="space-y-3 mb-5">
                      {activeAssignments.map(assignment => {
                        const trip = tripsMap[assignment.trip_id]
                        if (!trip) return null
                        return (
                          <div key={assignment.id}
                            className={`bg-white rounded-2xl border-2 p-4 transition hover:shadow-md ${selectedTrip?.id === assignment.id ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-mono text-blue-600 text-sm font-bold">{trip.trip_id}</span>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[assignment.status] || 'bg-gray-100 text-gray-600'}`}>
                                {STATUS_LABELS[assignment.status] || assignment.status}
                              </span>
                            </div>
                            <div className="space-y-1.5 text-sm mb-4">
                              <div className="flex items-center gap-2 text-gray-600"><span>📍</span><span><strong>From:</strong> {trip.pickup_location}</span></div>
                              <div className="flex items-center gap-2 text-gray-600"><span>🏁</span><span><strong>To:</strong> {trip.drop_location}</span></div>
                              <div className="flex items-center gap-2 text-gray-600"><span>🚛</span><span><strong>Vehicle:</strong> {trip.vehicle_number || 'Not assigned'}</span></div>
                              <div className="flex items-center gap-2 text-gray-400 text-xs"><span>📅</span><span>{trip.trip_date}</span></div>
                            </div>

                            {/* Status update buttons */}
                            <div className="flex gap-2 border-t border-gray-100 pt-3">
                              {assignment.status === 'assigned' && (
                                <button
                                  onClick={() => updateMyStatus(assignment.id, 'in_progress')}
                                  disabled={updatingId === assignment.id}
                                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition">
                                  {updatingId === assignment.id ? 'Updating...' : '▶ Start Trip'}
                                </button>
                              )}
                              {assignment.status === 'in_progress' && (
                                <button
                                  onClick={() => updateMyStatus(assignment.id, 'completed')}
                                  disabled={updatingId === assignment.id}
                                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition">
                                  {updatingId === assignment.id ? 'Updating...' : '✅ Mark Completed'}
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedTrip(selectedTrip?.id === assignment.id ? null : assignment)}
                                className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${selectedTrip?.id === assignment.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                {selectedTrip?.id === assignment.id ? '✓ Selected' : 'Select'}
                              </button>
                            </div>
                            {selectedTrip?.id === assignment.id && (
                              <p className="text-blue-600 text-xs font-semibold mt-2 pt-2 border-t border-blue-100">
                                Advance/fuel requests will be linked to this trip
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Completed trips */}
                {doneAssignments.length > 0 && (
                  <>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Completed</h2>
                    <div className="space-y-2 mb-5">
                      {doneAssignments.map(assignment => {
                        const trip = tripsMap[assignment.trip_id]
                        if (!trip) return null
                        return (
                          <div key={assignment.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between opacity-70">
                            <div>
                              <span className="font-mono text-gray-600 text-xs font-semibold">{trip.trip_id}</span>
                              <p className="text-xs text-gray-400 mt-0.5">{trip.pickup_location} → {trip.drop_location}</p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">✓ Done</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {myTripAssignments.length === 0 && (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center text-gray-400">
                    No trips assigned yet. Your admin will assign trips soon.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== LEAVE SECTION ===== */}
        {activeSection === 'leave' && (
          <>
            <div className="flex items-center justify-between mt-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Leave Requests</h2>
                <p className="text-gray-500 text-sm">Apply for leave and track status</p>
              </div>
              <button onClick={() => setShowLeave(true)}
                className="bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition">
                + Apply Leave
              </button>
            </div>

            {loading ? <p className="text-center text-gray-400 py-8">Loading...</p> :
             leaveRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center text-gray-400">
                No leave requests yet. Click "+ Apply Leave" to submit one.
              </div>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map(req => (
                  <div key={req.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    {/* Status banner */}
                    <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl ${LEAVE_STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                      <span className="text-base">
                        {req.status === 'approved' ? '✅' : req.status === 'rejected' ? '❌' : '⏳'}
                      </span>
                      <span className="font-semibold text-sm capitalize">{req.status}</span>
                      <span className="text-xs ml-auto opacity-70">
                        {new Date(req.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-xs text-gray-400 mb-0.5">From</p>
                        <p className="text-sm font-bold text-gray-800">{req.from_date}</p>
                      </div>
                      <span className="text-gray-300 text-lg">→</span>
                      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-xs text-gray-400 mb-0.5">To</p>
                        <p className="text-sm font-bold text-gray-800">{req.to_date}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-xs text-purple-400 mb-0.5">Days</p>
                        <p className="text-sm font-bold text-purple-700">
                          {Math.ceil((new Date(req.to_date) - new Date(req.from_date)) / 86400000) + 1}
                        </p>
                      </div>
                    </div>

                    {/* Reason */}
                    <p className="text-gray-600 text-sm bg-gray-50 px-3 py-2 rounded-lg">{req.reason}</p>

                    {/* Admin note */}
                    {req.admin_note && (
                      <div className={`mt-2 px-3 py-2 rounded-lg text-sm border ${req.status === 'approved' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <span className="font-semibold">Admin: </span>{req.admin_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== ADVANCE MODAL ===== */}
      {showAdvance && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">💰 Request Advance</h3>
              <button onClick={() => setShowAdvance(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>
            {advanceDone ? (
              <div className="p-10 text-center">
                <div className="text-6xl mb-3">✅</div>
                <p className="text-green-600 font-bold text-lg">Request Sent!</p>
                <p className="text-gray-500 text-sm mt-1">Admin will review and approve your request.</p>
              </div>
            ) : (
              <form onSubmit={handleRequestAdvance} className="p-5 space-y-4">
                {selectedTrip && tripsMap[selectedTrip.trip_id] && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm text-blue-700 font-medium">
                    Linked to: {tripsMap[selectedTrip.trip_id]?.trip_id}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Needed (₹) *</label>
                  <input type="number" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)}
                    required min="1" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <textarea value={advanceReason} onChange={e => setAdvanceReason(e.target.value)}
                    required rows={3} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Why do you need this advance?" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAdvance(false)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm">Cancel</button>
                  <button type="submit" disabled={advanceSaving}
                    className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
                    {advanceSaving ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== FUEL MODAL ===== */}
      {showFuel && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">⛽ Request Fuel</h3>
              <button onClick={() => setShowFuel(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>
            {fuelDone ? (
              <div className="p-10 text-center">
                <div className="text-6xl mb-3">✅</div>
                <p className="text-green-600 font-bold text-lg">Request Sent!</p>
                <p className="text-gray-500 text-sm mt-1">Admin will review your fuel request.</p>
              </div>
            ) : (
              <form onSubmit={handleRequestFuel} className="p-5 space-y-4">
                {selectedTrip && tripsMap[selectedTrip.trip_id] && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm text-blue-700 font-medium">
                    Linked to: {tripsMap[selectedTrip.trip_id]?.trip_id}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo of Fuel Gauge *</label>
                  <input type="file" accept="image/*" capture="environment" onChange={e => setFuelImage(e.target.files[0])} required
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 file:font-medium" />
                </div>
                {fuelImage && <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">📸 {fuelImage.name}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={fuelNotes} onChange={e => setFuelNotes(e.target.value)}
                    rows={2} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional info..." />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowFuel(false)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm">Cancel</button>
                  <button type="submit" disabled={fuelSaving}
                    className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                    {fuelSaving ? 'Uploading...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== LEAVE MODAL ===== */}
      {showLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">🏖️ Apply for Leave</h3>
              <button onClick={() => setShowLeave(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>
            {leaveDone ? (
              <div className="p-10 text-center">
                <div className="text-6xl mb-3">✅</div>
                <p className="text-green-600 font-bold text-lg">Leave Request Sent!</p>
                <p className="text-gray-500 text-sm mt-1">Your admin will review and respond soon.</p>
              </div>
            ) : (
              <form onSubmit={handleRequestLeave} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
                    <input type="date" value={leaveForm.from_date}
                      onChange={e => setLeaveForm({...leaveForm, from_date: e.target.value})}
                      required min={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date *</label>
                    <input type="date" value={leaveForm.to_date}
                      onChange={e => setLeaveForm({...leaveForm, to_date: e.target.value})}
                      required min={leaveForm.from_date || new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
                {leaveForm.from_date && leaveForm.to_date && (
                  <div className="bg-purple-50 rounded-xl px-3 py-2 text-sm text-purple-700 text-center font-semibold">
                    {Math.ceil((new Date(leaveForm.to_date) - new Date(leaveForm.from_date)) / 86400000) + 1} day(s) requested
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <textarea value={leaveForm.reason}
                    onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                    required rows={3}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. Family function, Medical leave, Personal work..." />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowLeave(false)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm">Cancel</button>
                  <button type="submit" disabled={leaveSaving}
                    className="flex-1 bg-purple-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-purple-700 disabled:opacity-50">
                    {leaveSaving ? 'Submitting...' : 'Submit Request'}
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
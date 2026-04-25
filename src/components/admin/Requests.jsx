import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Requests() {
  const [tab, setTab] = useState('advance')
  const [advances, setAdvances] = useState([])
  const [fuels, setFuels] = useState([])
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminNote, setAdminNote] = useState('')
  const [noteModal, setNoteModal] = useState(null)

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('requests-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'advance_requests' }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fuel_requests' }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leave_requests' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [a, f, l] = await Promise.all([
      supabase.from('advance_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('fuel_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('leave_requests').select('*').order('created_at', { ascending: false }),
    ])
    setAdvances(a.data || [])
    setFuels(f.data || [])
    setLeaves(l.data || [])
    setLoading(false)
  }

  const updateStatus = async (table, id, status) => {
    await supabase.from(table).update({ status }).eq('id', id)
    fetchAll()
  }

  const updateLeaveWithNote = async (id, status) => {
    await supabase.from('leave_requests').update({ status, admin_note: adminNote }).eq('id', id)
    setNoteModal(null)
    setAdminNote('')
    fetchAll()
  }

  const ago = t => {
    const m = Math.floor((Date.now() - new Date(t)) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    if (m < 1440) return `${Math.floor(m / 60)}h ago`
    return `${Math.floor(m / 1440)}d ago`
  }

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    }
    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
  }

  const pendingAdvance = advances.filter(a => a.status === 'pending').length
  const pendingFuel = fuels.filter(f => f.status === 'pending').length
  const pendingLeave = leaves.filter(l => l.status === 'pending').length

  const tabs = [
    { id: 'advance', label: '💰 Advance', count: pendingAdvance, color: 'bg-orange-500' },
    { id: 'fuel', label: '⛽ Fuel', count: pendingFuel, color: 'bg-blue-600' },
    { id: 'leave', label: '🏖️ Leave', count: pendingLeave, color: 'bg-purple-600' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Driver Requests</h2>
        <p className="text-gray-500 text-sm">Review and act on all driver requests</p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${tab === t.id ? `${t.color} text-white shadow` : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Advance Requests */}
      {tab === 'advance' && (
        <div className="space-y-4">
          {loading ? <p className="text-gray-400">Loading...</p> :
           advances.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">No advance requests yet.</div>
          ) : advances.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 hover:shadow-sm transition">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {(req.driver_name || '?').charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{req.driver_name}</p>
                    <p className="text-gray-400 text-xs">{ago(req.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-orange-600">₹{req.amount}</span>
                  {req.trip_id && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">{req.trip_id}</span>}
                </div>
                <p className="text-gray-600 text-sm bg-gray-50 px-3 py-2 rounded-lg">{req.reason}</p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <StatusBadge status={req.status} />
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus('advance_requests', req.id, 'approved')}
                      className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-600">Approve</button>
                    <button onClick={() => updateStatus('advance_requests', req.id, 'rejected')}
                      className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200">Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fuel Requests */}
      {tab === 'fuel' && (
        <div className="space-y-4">
          {loading ? <p className="text-gray-400">Loading...</p> :
           fuels.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">No fuel requests yet.</div>
          ) : fuels.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 hover:shadow-sm transition">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {(req.driver_name || '?').charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{req.driver_name}</p>
                    <p className="text-gray-400 text-xs">{ago(req.created_at)}</p>
                  </div>
                </div>
                {req.trip_id && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono mb-2 inline-block">{req.trip_id}</span>}
                {req.notes && <p className="text-gray-600 text-sm bg-gray-50 px-3 py-2 rounded-lg mt-1">{req.notes}</p>}
                {req.image_url && (
                  <div className="mt-3">
                    <a href={req.image_url} target="_blank" rel="noreferrer">
                      <img src={req.image_url} alt="Fuel gauge" className="h-32 w-auto rounded-lg border border-gray-200 object-cover hover:opacity-80 transition" />
                    </a>
                    <p className="text-xs text-gray-400 mt-1">Click to view full size</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <StatusBadge status={req.status} />
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus('fuel_requests', req.id, 'approved')}
                      className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-600">Approve</button>
                    <button onClick={() => updateStatus('fuel_requests', req.id, 'rejected')}
                      className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200">Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leave Requests */}
      {tab === 'leave' && (
        <div className="space-y-4">
          {loading ? <p className="text-gray-400">Loading...</p> :
           leaves.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">No leave requests yet.</div>
          ) : leaves.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {(req.driver_name || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{req.driver_name}</p>
                      <p className="text-gray-400 text-xs">{ago(req.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm">
                      <span className="text-purple-700 font-semibold">📅 {req.from_date}</span>
                      <span className="text-purple-400 mx-2">→</span>
                      <span className="text-purple-700 font-semibold">{req.to_date}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {Math.ceil((new Date(req.to_date) - new Date(req.from_date)) / 86400000) + 1} day(s)
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm bg-gray-50 px-3 py-2 rounded-lg">{req.reason}</p>
                  {req.admin_note && (
                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
                      <span className="font-semibold">Admin note: </span>{req.admin_note}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <StatusBadge status={req.status} />
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => { setNoteModal({ id: req.id, action: 'approved' }); setAdminNote('') }}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-600">Approve</button>
                      <button onClick={() => { setNoteModal({ id: req.id, action: 'rejected' }); setAdminNote('') }}
                        className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin note modal for leave */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-1 text-gray-900">
              {noteModal.action === 'approved' ? '✅ Approve Leave' : '❌ Reject Leave'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">Add an optional note for the driver</p>
            <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
              rows={3} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="e.g. Approved. Have a good rest. / Rejected due to upcoming trips." />
            <div className="flex gap-3">
              <button onClick={() => setNoteModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={() => updateLeaveWithNote(noteModal.id, noteModal.action)}
                className={`flex-1 text-white rounded-xl py-2.5 text-sm font-bold ${noteModal.action === 'approved' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                Confirm {noteModal.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
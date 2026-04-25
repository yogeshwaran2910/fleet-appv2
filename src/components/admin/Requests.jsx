import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Requests() {
  const [tab, setTab] = useState('advance')
  const [advances, setAdvances] = useState([])
  const [fuels, setFuels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [a, f] = await Promise.all([
      supabase.from('advance_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('fuel_requests').select('*').order('created_at', { ascending: false }),
    ])
    setAdvances(a.data || [])
    setFuels(f.data || [])
    setLoading(false)
  }

  const updateStatus = async (table, id, status) => {
    await supabase.from(table).update({ status }).eq('id', id)
    fetchAll()
  }

  const StatusBadge = ({ status }) => {
    const colors = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }
    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
  }

  const pendingAdvance = advances.filter(a => a.status === 'pending').length
  const pendingFuel = fuels.filter(f => f.status === 'pending').length

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Driver Requests</h2>
        <p className="text-gray-500 text-sm">Review and approve advance and fuel requests</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={() => setTab('advance')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${tab === 'advance' ? 'bg-orange-500 text-white shadow' : 'bg-white text-gray-600 border border-gray-200'}`}>
          💰 Advance Requests
          {pendingAdvance > 0 && <span className="bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingAdvance}</span>}
        </button>
        <button onClick={() => setTab('fuel')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${tab === 'fuel' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200'}`}>
          ⛽ Fuel Requests
          {pendingFuel > 0 && <span className="bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingFuel}</span>}
        </button>
      </div>

      {tab === 'advance' && (
        <div className="space-y-4">
          {loading ? <p className="text-gray-400">Loading...</p> :
           advances.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">No advance requests yet.</div>
          ) : advances.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 hover:shadow-sm transition">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">
                    {(req.driver_name || '?').charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{req.driver_name}</p>
                    <p className="text-gray-400 text-xs">{new Date(req.created_at).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-2xl font-bold text-orange-600">₹{req.amount}</span>
                  {req.trip_id && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">{req.trip_id}</span>}
                </div>
                <p className="text-gray-600 text-sm mt-2 bg-gray-50 px-3 py-2 rounded-lg">{req.reason}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={req.status} />
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus('advance_requests', req.id, 'approved')}
                      className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-600">
                      Approve
                    </button>
                    <button onClick={() => updateStatus('advance_requests', req.id, 'rejected')}
                      className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'fuel' && (
        <div className="space-y-4">
          {loading ? <p className="text-gray-400">Loading...</p> :
           fuels.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">No fuel requests yet.</div>
          ) : fuels.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 hover:shadow-sm transition">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                    {(req.driver_name || '?').charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{req.driver_name}</p>
                    <p className="text-gray-400 text-xs">{new Date(req.created_at).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                {req.trip_id && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono mb-2 inline-block">{req.trip_id}</span>}
                {req.notes && <p className="text-gray-600 text-sm bg-gray-50 px-3 py-2 rounded-lg mt-1">{req.notes}</p>}
                {req.image_url && (
                  <div className="mt-3">
                    <a href={req.image_url} target="_blank" rel="noreferrer">
                      <img src={req.image_url} alt="Fuel gauge" className="h-32 w-auto rounded-lg border border-gray-200 object-cover hover:opacity-80 transition" />
                    </a>
                    <p className="text-xs text-gray-400 mt-1">Click image to view full size</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={req.status} />
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus('fuel_requests', req.id, 'approved')}
                      className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-600">
                      Approve
                    </button>
                    <button onClick={() => updateStatus('fuel_requests', req.id, 'rejected')}
                      className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-200">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
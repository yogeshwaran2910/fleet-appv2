import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function NotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    loadNotifs()
    requestPermission()

    const advCh = supabase.channel('bell-advance')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'advance_requests' }, payload => {
        const n = {
          id: `adv-${payload.new.id}-${Date.now()}`,
          icon: '💰', title: 'New Advance Request',
          body: `${payload.new.driver_name} needs ₹${payload.new.amount}`,
          time: new Date(), read: false,
        }
        setNotifs(p => [n, ...p])
        pushBrowser(n.title, n.body)
      }).subscribe()

    const fuelCh = supabase.channel('bell-fuel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fuel_requests' }, payload => {
        const n = {
          id: `fuel-${payload.new.id}-${Date.now()}`,
          icon: '⛽', title: 'New Fuel Request',
          body: `${payload.new.driver_name} sent a fuel gauge photo`,
          time: new Date(), read: false,
        }
        setNotifs(p => [n, ...p])
        pushBrowser(n.title, n.body)
      }).subscribe()

    const clickOut = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', clickOut)
    return () => {
      supabase.removeChannel(advCh)
      supabase.removeChannel(fuelCh)
      document.removeEventListener('mousedown', clickOut)
    }
  }, [])

  const loadNotifs = async () => {
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: adv }, { data: fuel }] = await Promise.all([
      supabase.from('advance_requests').select('*').gte('created_at', since).order('created_at', { ascending: false }),
      supabase.from('fuel_requests').select('*').gte('created_at', since).order('created_at', { ascending: false }),
    ])
    const all = [
      ...(adv || []).map(r => ({ id: `adv-${r.id}`, icon: '💰', title: 'Advance Request', body: `${r.driver_name} — ₹${r.amount} (${r.status})`, time: new Date(r.created_at), read: r.status !== 'pending' })),
      ...(fuel || []).map(r => ({ id: `fuel-${r.id}`, icon: '⛽', title: 'Fuel Request', body: `${r.driver_name} — ${r.status}`, time: new Date(r.created_at), read: r.status !== 'pending' })),
    ].sort((a, b) => b.time - a.time)
    setNotifs(all)
  }

  const requestPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
  }

  const pushBrowser = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🚗 Fleet: ${title}`, { body })
    }
  }

  const unread = notifs.filter(n => !n.read).length
  const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, read: true })))

  const ago = t => {
    const m = Math.floor((Date.now() - new Date(t)) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    if (m < 1440) return `${Math.floor(m / 60)}h ago`
    return `${Math.floor(m / 1440)}d ago`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead() }}
        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <span style={{ fontSize: '18px' }}>🔔</span>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '5px', right: '5px', background: '#E24B4A', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '50px', right: 0, width: '310px', background: 'white', borderRadius: '16px', border: '0.5px solid #e5e7eb', boxShadow: '0 12px 40px rgba(0,0,0,0.15)', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>Notifications</span>
            <button onClick={markAllRead} style={{ fontSize: '12px', color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Mark all read</button>
          </div>
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>No notifications</div>
            ) : notifs.map(n => (
              <div key={n.id} style={{ padding: '12px 16px', borderBottom: '0.5px solid #f9fafb', background: n.read ? 'white' : '#EFF6FF', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{n.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#111', margin: '0 0 2px' }}>{n.title}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4, margin: 0 }}>{n.body}</p>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px', marginBottom: 0 }}>{ago(n.time)}</p>
                </div>
                {!n.read && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#378ADD', flexShrink: 0, marginTop: '5px' }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
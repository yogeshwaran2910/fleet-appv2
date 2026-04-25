import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Fleet() {
  const [section, setSection] = useState('drivers')
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [driverLoading, setDriverLoading] = useState(true)
  const [vehicleLoading, setVehicleLoading] = useState(true)
  const [showDriverForm, setShowDriverForm] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [driverForm, setDriverForm] = useState({ driver_name: '', contact_number: '' })
  const [vehicleForm, setVehicleForm] = useState({ vehicle_id: '', vehicle_number: '' })
  const [licenseFile, setLicenseFile] = useState(null)
  const [vehicleFiles, setVehicleFiles] = useState([])
  const [driverSaving, setDriverSaving] = useState(false)
  const [vehicleSaving, setVehicleSaving] = useState(false)
  const [driverError, setDriverError] = useState('')
  const [vehicleError, setVehicleError] = useState('')

  useEffect(() => { fetchDrivers(); fetchVehicles() }, [])

  const fetchDrivers = async () => {
    setDriverLoading(true)
    const { data } = await supabase.from('drivers').select('*').order('created_at', { ascending: false })
    setDrivers(data || [])
    setDriverLoading(false)
  }

  const fetchVehicles = async () => {
    setVehicleLoading(true)
    const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false })
    setVehicles(data || [])
    setVehicleLoading(false)
  }

  const uploadFile = async (file, bucket, path) => {
    const ext = file.name.split('.').pop()
    const fileName = `${path}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(fileName, file)
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleAddDriver = async (e) => {
    e.preventDefault()
    setDriverSaving(true)
    setDriverError('')
    try {
      let license_url = null
      if (licenseFile) license_url = await uploadFile(licenseFile, 'licenses', 'drivers')
      const { error } = await supabase.from('drivers').insert([{ ...driverForm, license_url }])
      if (error) throw error
      setShowDriverForm(false)
      setDriverForm({ driver_name: '', contact_number: '' })
      setLicenseFile(null)
      fetchDrivers()
    } catch (err) { setDriverError(err.message) }
    setDriverSaving(false)
  }

  const handleAddVehicle = async (e) => {
    e.preventDefault()
    setVehicleSaving(true)
    setVehicleError('')
    try {
      const documents = []
      for (const file of vehicleFiles) {
        const url = await uploadFile(file, 'vehicle-docs', 'vehicles')
        documents.push({ name: file.name, url })
      }
      const { error } = await supabase.from('vehicles').insert([{ ...vehicleForm, documents }])
      if (error) throw error
      setShowVehicleForm(false)
      setVehicleForm({ vehicle_id: '', vehicle_number: '' })
      setVehicleFiles([])
      fetchVehicles()
    } catch (err) { setVehicleError(err.message) }
    setVehicleSaving(false)
  }

  return (
    <div>
      <div className="flex gap-3 mb-6">
        {['drivers','vehicles'].map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold capitalize transition ${section === s ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {s === 'drivers' ? '👤 Drivers' : '🚛 Vehicles'}
          </button>
        ))}
      </div>

      {section === 'drivers' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Drivers</h2>
              <p className="text-gray-500 text-sm">{drivers.length} registered</p>
            </div>
            <button onClick={() => setShowDriverForm(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
              + Add Driver
            </button>
          </div>

          {driverLoading ? <p className="text-gray-400">Loading...</p> : drivers.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
              No drivers registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map(driver => (
                <div key={driver.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {driver.driver_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{driver.driver_name}</p>
                      <p className="text-gray-500 text-sm">{driver.contact_number}</p>
                    </div>
                  </div>
                  {driver.license_url ? (
                    <a href={driver.license_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline bg-blue-50 px-3 py-1 rounded-lg">
                      📄 View License
                    </a>
                  ) : (
                    <span className="text-gray-300 text-sm">No license uploaded</span>
                  )}
                  <p className="text-xs text-gray-300 mt-3 font-mono">ID: {driver.id.slice(0,8)}...</p>
                </div>
              ))}
            </div>
          )}

          {showDriverForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold">Add Driver</h3>
                  <button onClick={() => setShowDriverForm(false)} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
                </div>
                <form onSubmit={handleAddDriver} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" value={driverForm.driver_name} onChange={e => setDriverForm({...driverForm, driver_name: e.target.value})}
                      required className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Driver's full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                    <input type="text" value={driverForm.contact_number} onChange={e => setDriverForm({...driverForm, contact_number: e.target.value})}
                      required className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Used by driver to login" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver's License</label>
                    <input type="file" accept="image/*,.pdf" onChange={e => setLicenseFile(e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />
                    <p className="text-xs text-gray-400 mt-1">PDF or image accepted</p>
                  </div>
                  {driverError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{driverError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowDriverForm(false)}
                      className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm">Cancel</button>
                    <button type="submit" disabled={driverSaving}
                      className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                      {driverSaving ? 'Saving...' : 'Add Driver'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'vehicles' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Vehicles</h2>
              <p className="text-gray-500 text-sm">{vehicles.length} registered</p>
            </div>
            <button onClick={() => setShowVehicleForm(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
              + Add Vehicle
            </button>
          </div>

          {vehicleLoading ? <p className="text-gray-400">Loading...</p> : vehicles.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
              No vehicles registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map(v => (
                <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">🚛</span>
                    <div>
                      <p className="font-semibold text-gray-900">{v.vehicle_number}</p>
                      <p className="text-gray-500 text-sm">ID: {v.vehicle_id}</p>
                    </div>
                  </div>
                  {v.documents && v.documents.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Documents</p>
                      {v.documents.map((doc, i) => (
                        <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-blue-600 text-sm hover:underline">
                          📄 {doc.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showVehicleForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold">Add Vehicle</h3>
                  <button onClick={() => setShowVehicleForm(false)} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
                </div>
                <form onSubmit={handleAddVehicle} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle ID *</label>
                    <input type="text" value={vehicleForm.vehicle_id} onChange={e => setVehicleForm({...vehicleForm, vehicle_id: e.target.value})}
                      required className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. VH-001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number *</label>
                    <input type="text" value={vehicleForm.vehicle_number} onChange={e => setVehicleForm({...vehicleForm, vehicle_number: e.target.value})}
                      required className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. TN 01 AB 1234" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Documents</label>
                    <input type="file" accept=".pdf,image/*" multiple onChange={e => setVehicleFiles(Array.from(e.target.files))}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />
                    <p className="text-xs text-gray-400 mt-1">RC Book, Insurance, Permit, etc. (multiple files OK)</p>
                  </div>
                  {vehicleFiles.length > 0 && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      {vehicleFiles.map((f, i) => <p key={i} className="text-xs text-gray-600">📄 {f.name}</p>)}
                    </div>
                  )}
                  {vehicleError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{vehicleError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowVehicleForm(false)}
                      className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm">Cancel</button>
                    <button type="submit" disabled={vehicleSaving}
                      className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                      {vehicleSaving ? 'Uploading...' : 'Add Vehicle'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
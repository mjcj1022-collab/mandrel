import { useEffect, useState } from 'react'
import { api, apiConfigured, type Customer } from '../lib/api'

/**
 * Client CRM — the shop's customers, server-backed and tenant-scoped. Add a
 * client, keep their contact details and notes, and (from the order pipeline)
 * attach them to an order. Only shown when a backend is configured; standalone
 * builds have no shared store to hold customers.
 */
export function CustomersPanel() {
  const [list, setList] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try { setList(await api.listCustomers()); setError(null) }
    catch { setError('Couldn’t reach the server — it may be waking up.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])

  if (!apiConfigured()) return null

  const reset = () => { setForm({ name: '', email: '', phone: '', notes: '' }); setEditId(null) }

  const submit = async () => {
    if (!form.name.trim() || busy) return
    setBusy(true)
    try {
      if (editId) await api.updateCustomer(editId, form)
      else await api.createCustomer({ name: form.name.trim(), email: form.email, phone: form.phone, notes: form.notes })
      reset(); await refresh()
    } catch { setError('Save failed — try again.') }
    finally { setBusy(false) }
  }

  const edit = (c: Customer) => { setEditId(c.id); setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', notes: c.notes ?? '' }) }
  const remove = async (id: string) => { try { await api.deleteCustomer(id); if (editId === id) reset(); await refresh() } catch { setError('Delete failed.') } }

  return (
    <div className="panel-block library">
      <h4>Clients <span className="mfg-sum"><b className="ok">{list.length}</b></span></h4>

      <div className="lib-save" style={{ flexWrap: 'wrap', gap: 6 }}>
        <input className="lib-name" placeholder="Client name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') submit() }} />
        <input className="lib-name" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <input className="lib-name" placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        <input className="lib-name" placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ flexBasis: '100%' }} />
        <button className="primary" disabled={!form.name.trim() || busy} onClick={submit}>{editId ? 'Update' : 'Add'}</button>
        {editId && <button className="mini" onClick={reset}>Cancel</button>}
      </div>

      {loading && <p className="disc">Loading clients…</p>}
      {error && <p className="disc">{error}</p>}
      {!loading && !error && list.length === 0 && <p className="disc">No clients yet. Add one above, then attach them to an order from the pipeline.</p>}

      {list.map(c => (
        <div key={c.id} className="lib-item">
          <div className="lib-row">
            <div className="lib-meta">
              <b>{c.name}</b>
              <small>{[c.email, c.phone].filter(Boolean).join(' · ') || 'no contact'}{c.notes ? ` — ${c.notes}` : ''}</small>
            </div>
            <div className="lib-acts">
              <button className="mini" onClick={() => edit(c)}>Edit</button>
              <button className="mini danger" onClick={() => remove(c.id)}>×</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

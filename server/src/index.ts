import express, { type Request } from 'express'
import cors from 'cors'
import { db, uid, audit } from './db.js'
import { requireAuth, signToken, hashPassword, verifyPassword, type Claims } from './auth.js'
import { createPaymentIntent } from './stripe.js'

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*' }))
app.use(express.json({ limit: '2mb' }))

const me = (req: Request) => (req as Request & { user: Claims }).user

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'blue-flame', db: 'sqlite', time: new Date().toISOString() }))

/* ---------------- auth ---------------- */

app.post('/api/auth/register', (req, res) => {
  const { shop, email, password } = req.body ?? {}
  if (!shop || !email || !password) { res.status(400).json({ error: 'shop, email and password are required' }); return }
  const tenantId = uid()
  const slug = `${String(shop).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${tenantId.slice(0, 4)}`
  try {
    db.prepare('INSERT INTO tenants (id, name, slug) VALUES (?,?,?)').run(tenantId, shop, slug)
    const userId = uid()
    db.prepare('INSERT INTO users (id, tenant_id, email, password_hash, role) VALUES (?,?,?,?,?)')
      .run(userId, tenantId, String(email).toLowerCase(), hashPassword(password), 'admin')
    audit(tenantId, userId, 'register')
    res.json({ token: signToken({ id: userId, tenant_id: tenantId, role: 'admin' }), tenant: { id: tenantId, name: shop, slug }, role: 'admin' })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {}
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email ?? '').toLowerCase()) as
    { id: string; tenant_id: string; role: string; password_hash: string } | undefined
  if (!u || !verifyPassword(String(password ?? ''), u.password_hash)) { res.status(401).json({ error: 'invalid credentials' }); return }
  res.json({ token: signToken({ id: u.id, tenant_id: u.tenant_id, role: u.role }), role: u.role })
})

app.get('/api/me', requireAuth, (req, res) => {
  const t = db.prepare('SELECT id, name, slug, markup FROM tenants WHERE id = ?').get(me(req).tenant_id)
  res.json({ user: me(req), tenant: t })
})

/* ---------------- designs ---------------- */

app.get('/api/designs', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT id, name, updated_at FROM designs WHERE tenant_id = ? ORDER BY updated_at DESC').all(me(req).tenant_id))
})

app.post('/api/designs', requireAuth, (req, res) => {
  const { name, spec, parent_id } = req.body ?? {}
  if (!name || !spec) { res.status(400).json({ error: 'name and spec required' }); return }
  const id = uid()
  db.prepare('INSERT INTO designs (id, tenant_id, owner_id, name, spec, parent_id) VALUES (?,?,?,?,?,?)')
    .run(id, me(req).tenant_id, me(req).id, name, JSON.stringify(spec), parent_id ?? null)
  audit(me(req).tenant_id, me(req).id, 'design.create', id)
  res.json({ id })
})

app.get('/api/designs/:id', requireAuth, (req, res) => {
  const r = db.prepare('SELECT * FROM designs WHERE id = ? AND tenant_id = ?').get(req.params.id, me(req).tenant_id) as { spec: string } | undefined
  if (!r) { res.status(404).json({ error: 'not found' }); return }
  res.json({ ...r, spec: JSON.parse(r.spec) })
})

app.put('/api/designs/:id', requireAuth, (req, res) => {
  const { name, spec } = req.body ?? {}
  const info = db.prepare("UPDATE designs SET name = COALESCE(?, name), spec = COALESCE(?, spec), updated_at = datetime('now') WHERE id = ? AND tenant_id = ?")
    .run(name ?? null, spec ? JSON.stringify(spec) : null, req.params.id, me(req).tenant_id)
  res.json({ updated: info.changes })
})

/* ---------------- quotes ---------------- */

app.post('/api/quotes', requireAuth, (req, res) => {
  const { design_id, total_cents, breakdown, expires_at } = req.body ?? {}
  const id = uid()
  const prev = db.prepare('SELECT MAX(version) v FROM quotes WHERE design_id = ?').get(design_id) as { v: number | null }
  const version = (prev?.v ?? 0) + 1
  db.prepare('INSERT INTO quotes (id, tenant_id, design_id, version, total_cents, breakdown, expires_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, me(req).tenant_id, design_id, version, total_cents, JSON.stringify(breakdown ?? {}), expires_at ?? null)
  res.json({ id, version })
})

/* ---------------- orders / pipeline ---------------- */

app.get('/api/orders', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC').all(me(req).tenant_id))
})

app.post('/api/orders', requireAuth, (req, res) => {
  const { design_id, quote_id } = req.body ?? {}
  const id = uid()
  db.prepare('INSERT INTO orders (id, tenant_id, design_id, quote_id) VALUES (?,?,?,?)').run(id, me(req).tenant_id, design_id, quote_id ?? null)
  res.json({ id, stage: 'designed' })
})

app.patch('/api/orders/:id/stage', requireAuth, (req, res) => {
  const { stage } = req.body ?? {}
  const approved = stage === 'approved'
  const info = db.prepare(`UPDATE orders SET stage = ?, approved_at = CASE WHEN ? THEN datetime('now') ELSE approved_at END WHERE id = ? AND tenant_id = ?`)
    .run(stage, approved ? 1 : 0, req.params.id, me(req).tenant_id)
  audit(me(req).tenant_id, me(req).id, 'order.stage', req.params.id, { stage })
  res.json({ updated: info.changes })
})

/* ---------------- checkout (Stripe, optional) ---------------- */

app.post('/api/checkout', requireAuth, async (req, res) => {
  try {
    const { amount_cents, order_id } = req.body ?? {}
    const pi = await createPaymentIntent(Number(amount_cents), { order_id: String(order_id), tenant_id: me(req).tenant_id })
    res.json({ clientSecret: pi.client_secret })
  } catch (e) {
    res.status(501).json({ error: (e as Error).message })
  }
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => console.log(`Blue Flame API listening on http://localhost:${port}`))

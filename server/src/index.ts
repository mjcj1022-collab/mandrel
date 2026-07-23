import express, { type Request } from 'express'
import cors from 'cors'
import { db, uid, audit } from './db.js'
import { requireAuth, signToken, hashPassword, verifyPassword, type Claims } from './auth.js'
import { createPaymentIntent, constructWebhookEvent } from './stripe.js'

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*' }))

/* ---------- Stripe webhook (raw body, before the JSON parser) ----------
 * Stripe posts here when a payment settles; the signature is verified against
 * the raw bytes, so this route must NOT go through express.json(). On a
 * successful PaymentIntent we advance the linked order to "approved" and record
 * the payment. Idempotent — Stripe may deliver an event more than once. */
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  if (!sig || typeof sig !== 'string') { res.status(400).json({ error: 'missing stripe-signature' }); return }
  let event
  try {
    event = await constructWebhookEvent(req.body as Buffer, sig)
  } catch (e) {
    res.status(400).json({ error: `signature verification failed: ${(e as Error).message}` }); return
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as { id?: string; amount_received?: number; amount?: number; metadata?: Record<string, string> }
    const orderId = pi.metadata?.order_id
    const tenantId = pi.metadata?.tenant_id
    const amount = pi.amount_received ?? pi.amount ?? 0
    if (orderId && orderId !== 'quote' && orderId !== 'adhoc') {
      const info = db.prepare(
        `UPDATE orders SET stage = 'approved', approved_at = COALESCE(approved_at, datetime('now')),
         stripe_payment_intent = ?, deposit_cents = ? WHERE id = ? AND stage IN ('designed','approved')`
      ).run(pi.id ?? null, amount, orderId)
      if (info.changes && tenantId) audit(tenantId, null, 'order.paid', orderId, { amount, payment_intent: pi.id })
    } else if (tenantId) {
      audit(tenantId, null, 'payment.received', null, { amount, payment_intent: pi.id })
    }
  }

  res.json({ received: true })
})

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

app.delete('/api/designs/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM designs WHERE id = ? AND tenant_id = ?').run(req.params.id, me(req).tenant_id)
  res.json({ deleted: info.changes })
})

app.put('/api/designs/:id', requireAuth, (req, res) => {
  const { name, spec } = req.body ?? {}
  const info = db.prepare("UPDATE designs SET name = COALESCE(?, name), spec = COALESCE(?, spec), updated_at = datetime('now') WHERE id = ? AND tenant_id = ?")
    .run(name ?? null, spec ? JSON.stringify(spec) : null, req.params.id, me(req).tenant_id)
  res.json({ updated: info.changes })
})

/* ---------------- customers (CRM) ---------------- */

app.get('/api/customers', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT id, name, email, phone, notes, created_at FROM customers WHERE tenant_id = ? ORDER BY name COLLATE NOCASE').all(me(req).tenant_id))
})

app.post('/api/customers', requireAuth, (req, res) => {
  const { name, email, phone, notes } = req.body ?? {}
  if (!name || !String(name).trim()) { res.status(400).json({ error: 'name required' }); return }
  const id = uid()
  db.prepare('INSERT INTO customers (id, tenant_id, name, email, phone, notes) VALUES (?,?,?,?,?,?)')
    .run(id, me(req).tenant_id, String(name).trim(), email ?? null, phone ?? null, notes ?? null)
  audit(me(req).tenant_id, me(req).id, 'customer.create', id)
  res.json({ id })
})

app.patch('/api/customers/:id', requireAuth, (req, res) => {
  const { name, email, phone, notes } = req.body ?? {}
  const info = db.prepare(
    'UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), notes = COALESCE(?, notes) WHERE id = ? AND tenant_id = ?'
  ).run(name ? String(name).trim() : null, email ?? null, phone ?? null, notes ?? null, req.params.id, me(req).tenant_id)
  res.json({ updated: info.changes })
})

app.delete('/api/customers/:id', requireAuth, (req, res) => {
  // Detach from any orders first so the order history survives the customer.
  db.prepare('UPDATE orders SET customer_id = NULL WHERE customer_id = ? AND tenant_id = ?').run(req.params.id, me(req).tenant_id)
  const info = db.prepare('DELETE FROM customers WHERE id = ? AND tenant_id = ?').run(req.params.id, me(req).tenant_id)
  res.json({ deleted: info.changes })
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
  // Join the design (name + whether it's a sculpt) and the customer so the order
  // list is directly useful without a second round trip. LEFT JOINs keep orders
  // whose design or customer was deleted. Both joins are tenant-scoped so a
  // crafted foreign id can't pull another shop's rows.
  res.json(db.prepare(`
    SELECT o.*, d.name AS design_name, c.name AS customer_name,
           CASE WHEN json_extract(d.spec, '$.kind') = 'sculpt' THEN 1 ELSE 0 END AS is_sculpt
    FROM orders o
    LEFT JOIN designs d ON d.id = o.design_id AND d.tenant_id = o.tenant_id
    LEFT JOIN customers c ON c.id = o.customer_id AND c.tenant_id = o.tenant_id
    WHERE o.tenant_id = ? ORDER BY o.created_at DESC
  `).all(me(req).tenant_id))
})

app.post('/api/orders', requireAuth, (req, res) => {
  const { design_id, quote_id, customer_id } = req.body ?? {}
  const id = uid()
  db.prepare('INSERT INTO orders (id, tenant_id, design_id, quote_id, customer_id) VALUES (?,?,?,?,?)')
    .run(id, me(req).tenant_id, design_id, quote_id ?? null, customer_id ?? null)
  res.json({ id, stage: 'designed' })
})

app.patch('/api/orders/:id/customer', requireAuth, (req, res) => {
  const { customer_id } = req.body ?? {}
  const info = db.prepare('UPDATE orders SET customer_id = ? WHERE id = ? AND tenant_id = ?')
    .run(customer_id ?? null, req.params.id, me(req).tenant_id)
  res.json({ updated: info.changes })
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
    const { amount_cents, order_id, design_id } = req.body ?? {}
    // Bind the payment to a real order so the webhook can advance it. If none was
    // supplied, open one from the design so the shop has a record to track.
    let oid = order_id as string | undefined
    if ((!oid || oid === 'quote' || oid === 'adhoc') && design_id) {
      oid = uid()
      db.prepare('INSERT INTO orders (id, tenant_id, design_id, balance_cents) VALUES (?,?,?,?)')
        .run(oid, me(req).tenant_id, String(design_id), Number(amount_cents) || 0)
    }
    const pi = await createPaymentIntent(Number(amount_cents), { order_id: String(oid ?? 'adhoc'), tenant_id: me(req).tenant_id })
    res.json({ clientSecret: pi.client_secret, order_id: oid ?? null })
  } catch (e) {
    res.status(501).json({ error: (e as Error).message })
  }
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => console.log(`Blue Flame API listening on http://localhost:${port}`))

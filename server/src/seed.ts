import { db, uid } from './db.js'
import { hashPassword } from './auth.js'

// Seeds a Blue Flame tenant and the two demo users. Safe to re-run.
let tenant = db.prepare('SELECT id FROM tenants WHERE slug = ?').get('blue-flame') as { id: string } | undefined
if (!tenant) {
  const id = uid()
  db.prepare('INSERT INTO tenants (id, name, slug) VALUES (?,?,?)').run(id, 'Blue Flame', 'blue-flame')
  tenant = { id }
}

for (const [email, pw, role] of [['mike', 'mike123', 'admin'], ['liliya', 'liliya123', 'associate']] as const) {
  const exists = db.prepare('SELECT id FROM users WHERE tenant_id = ? AND email = ?').get(tenant.id, email)
  if (!exists) {
    db.prepare('INSERT INTO users (id, tenant_id, email, password_hash, role) VALUES (?,?,?,?,?)')
      .run(uid(), tenant.id, email, hashPassword(pw), role)
    console.log(`seeded user ${email} (${role})`)
  }
}
console.log('Seed complete. Tenant:', tenant.id)

import jwt from 'jsonwebtoken'
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

const SECRET = process.env.JWT_SECRET ?? 'dev-insecure-change-me'

export interface Claims { id: string; tenant_id: string; role: string }

/* ---- passwords (scrypt, from node:crypto — no native deps) ---- */
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pw, salt, 64).toString('hex')
  return `${salt}:${hash}`
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const test = scryptSync(pw, salt, 64)
  const orig = Buffer.from(hash, 'hex')
  return test.length === orig.length && timingSafeEqual(test, orig)
}

/* ---- tokens ---- */
export const signToken = (claims: Claims): string => jwt.sign(claims, SECRET, { expiresIn: '7d' })

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) { res.status(401).json({ error: 'missing bearer token' }); return }
  try {
    ;(req as Request & { user: Claims }).user = jwt.verify(token, SECRET) as Claims
    next()
  } catch {
    res.status(401).json({ error: 'invalid token' })
  }
}

export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: Claims }).user
    if (!user || !roles.includes(user.role)) { res.status(403).json({ error: 'forbidden' }); return }
    next()
  }

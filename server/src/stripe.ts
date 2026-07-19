// Stripe is optional — payments need STRIPE_SECRET_KEY and `npm i stripe`.
// Everything else in the API works without it.
export async function createPaymentIntent(amountCents: number, metadata: Record<string, string>) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe not configured — set STRIPE_SECRET_KEY in .env')
  const StripeMod = await import('stripe').catch(() => { throw new Error('Stripe not installed — run: npm i stripe') })
  const stripe = new StripeMod.default(key)
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata
  })
}

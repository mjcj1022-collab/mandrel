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

/** A verified Stripe webhook event. `type` + `data.object` are enough to react
 *  to payments; the shape is kept loose so the route needs no Stripe types. */
export interface WebhookEvent { type: string; data: { object: Record<string, unknown> } }

/**
 * Verify a webhook payload against the signing secret and return the event.
 * The raw (unparsed) request body is required — verification fails on JSON that
 * has been re-serialized. Set STRIPE_WEBHOOK_SECRET from the Stripe dashboard.
 */
export async function constructWebhookEvent(rawBody: Buffer | string, signature: string): Promise<WebhookEvent> {
  const key = process.env.STRIPE_SECRET_KEY
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!key || !whSecret) throw new Error('Stripe webhook not configured — set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET')
  const StripeMod = await import('stripe').catch(() => { throw new Error('Stripe not installed — run: npm i stripe') })
  const stripe = new StripeMod.default(key)
  return stripe.webhooks.constructEvent(rawBody, signature, whSecret) as unknown as WebhookEvent
}

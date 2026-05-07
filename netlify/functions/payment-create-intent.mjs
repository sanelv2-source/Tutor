import Stripe from 'stripe';

const PLAN_PRICES_NOK = {
  start: 79,
  pro: 149,
};

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

  if (!stripeSecretKey) {
    return json(500, { error: 'Stripe server config mangler.' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  const requestedPlan = String(payload.plan || 'pro').trim().toLowerCase();
  const plan = Object.prototype.hasOwnProperty.call(PLAN_PRICES_NOK, requestedPlan) ? requestedPlan : '';
  const email = String(payload.email || '').trim().toLowerCase();

  if (!plan) {
    return json(400, { error: 'Denne pakken kan ikke kjøpes ennå.' });
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-02-25.clover',
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: PLAN_PRICES_NOK[plan] * 100,
      currency: 'nok',
      payment_method_types: ['card'],
      receipt_email: email || undefined,
      metadata: {
        plan,
        email,
      },
    });

    return json(200, {
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      plan,
    });
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    return json(500, {
      error: error instanceof Error ? error.message : 'Kunne ikke starte betaling',
    });
  }
}

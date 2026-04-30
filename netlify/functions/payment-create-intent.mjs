import Stripe from 'stripe';

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

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-02-25.clover',
    });

    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
    });

    return json(200, { clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Stripe setup intent error:', error);
    return json(500, {
      error: error instanceof Error ? error.message : 'Kunne ikke starte betaling',
    });
  }
}

import Stripe from 'stripe';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const getOrigin = (event) => {
  const configuredUrl = process.env.APP_URL || '';
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const origin = event.headers.origin || event.headers.Origin || '';
  if (origin) return origin.replace(/\/$/, '');

  const host = event.headers.host || event.headers.Host || '';
  return host ? `https://${host}` : '';
};

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  const priceId = process.env.STRIPE_PRICE_ID || '';

  if (!stripeSecretKey || !priceId) {
    return json(500, { error: 'Stripe server config mangler.' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig foresporsel.' });
  }

  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) {
    return json(400, { error: 'E-post er pakrevd.' });
  }

  const origin = getOrigin(event);
  if (!origin) {
    return json(500, { error: 'APP_URL mangler.' });
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-02-25.clover',
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/success`,
      cancel_url: `${origin}/cancel`,
      subscription_data: {
        trial_period_days: 14,
      },
    });

    return json(200, { url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return json(500, {
      error: error instanceof Error ? error.message : 'Kunne ikke opprette betalingsokt',
    });
  }
}

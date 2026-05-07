import { createClient } from '@supabase/supabase-js';
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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase server config mangler.' });
  }

  if (!stripeSecretKey) {
    return json(500, { error: 'Stripe server config mangler.' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) {
    return json(400, { error: 'E-post er påkrevd.' });
  }

  const requestedPlan = String(payload.plan || 'pro').trim().toLowerCase();
  const plan = Object.prototype.hasOwnProperty.call(PLAN_PRICES_NOK, requestedPlan) ? requestedPlan : '';
  if (!plan) {
    return json(400, { error: 'Denne pakken kan ikke kjøpes ennå.' });
  }

  const paymentIntentId = String(payload.paymentIntentId || '').trim();
  if (!paymentIntentId) {
    return json(400, { error: 'Betalingen mangler bekreftelse.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-02-25.clover',
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const expectedAmount = PLAN_PRICES_NOK[plan] * 100;

    if (
      paymentIntent.status !== 'succeeded' ||
      paymentIntent.amount !== expectedAmount ||
      paymentIntent.currency !== 'nok' ||
      paymentIntent.metadata?.plan !== plan ||
      paymentIntent.metadata?.email !== email
    ) {
      return json(400, { error: 'Betalingen matcher ikke valgt pakke.' });
    }

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      console.error('Profile lookup error:', fetchError);
      return json(500, { error: 'Kunne ikke hente profil.' });
    }

    if (!profile) {
      return json(404, { error: 'Profil ikke funnet' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_status: 'active', plan })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Profile payment update error:', updateError);
      return json(500, { error: 'Kunne ikke oppdatere betalingsstatus' });
    }

    return json(200, { success: true });
  } catch (error) {
    console.error('Error processing payment:', error);
    return json(500, { error: 'Kunne ikke oppdatere betalingsstatus' });
  }
}

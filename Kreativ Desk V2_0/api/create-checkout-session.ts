import Stripe from 'stripe';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' as any });
    const { email, planName, uid, amount, interval } = req.body;
    const domainURL = req.headers.origin || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      client_reference_id: uid,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Kreativ-Desk ${planName} Plan`,
              description: `Subscription for Kreativ-Desk OS (${planName})`,
            },
            unit_amount: amount * 100,
            recurring: {
              interval: interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${domainURL}/?session_id={CHECKOUT_SESSION_ID}&plan=${planName}`,
      cancel_url: `${domainURL}/?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    res.status(400).json({ error: { message: error.message } });
  }
}

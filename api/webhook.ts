import Stripe from 'stripe';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin lazily
let firebaseAdminApp: admin.app.App | null = null;
function getFirebaseAdmin(): admin.app.App | null {
  if (!firebaseAdminApp) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing.');
      return null;
    }
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      return null;
    }
  }
  return firebaseAdminApp;
}

// Vercel specific config to disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw body
async function buffer(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const adminApp = getFirebaseAdmin();

  if (!stripeKey || !endpointSecret || !adminApp) {
    return res.status(400).send('Webhook Error: Missing configuration');
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' as any });
  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig as string, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email;
      const uid = session.client_reference_id;

      if (uid && customerEmail) {
        try {
          const db = adminApp.firestore();
          await db.collection('users').doc(uid).update({
            hasActiveSubscription: true,
            subscriptionId: session.subscription as string,
          });
          console.log(`Successfully updated subscription for user ${uid}`);
        } catch (error) {
          console.error('Error updating Firebase:', error);
        }
      }
      break;
    }
    case 'customer.subscription.deleted': {
      // Handle subscription cancellation
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).send();
}
